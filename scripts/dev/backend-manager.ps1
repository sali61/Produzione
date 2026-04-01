param(
    [ValidateSet("start", "stop", "restart", "status", "logs")]
    [string]$Action = "status",
    [int]$Port = 7643
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$projectPath = Join-Path $repoRoot "src\backend\Produzione.Api\Produzione.Api.csproj"
$logsDir = Join-Path $repoRoot ".logs"
$outLog = Join-Path $logsDir "backend-dev.out.log"
$errLog = Join-Path $logsDir "backend-dev.err.log"
$pidFile = Join-Path $logsDir "backend-dev.pid"

function Get-ListeningPidByPort {
    param([int]$ListenPort)

    try {
        return @(
            Get-NetTCPConnection -LocalPort $ListenPort -State Listen -ErrorAction Stop |
                Select-Object -ExpandProperty OwningProcess -Unique
        )
    }
    catch {
        return @()
    }
}

function Get-BackendPidsByCommandLine {
    $matches = @()
    try {
        $processes = Get-CimInstance Win32_Process -Filter "Name = 'dotnet.exe'" -ErrorAction Stop
        foreach ($process in $processes) {
            $commandLine = $process.CommandLine
            if ([string]::IsNullOrWhiteSpace($commandLine)) {
                continue
            }

            if ($commandLine -like "*Produzione.Api.csproj*" -or $commandLine -like "*Produzione.Api.dll*") {
                $matches += [int]$process.ProcessId
            }
        }
    }
    catch {
        return @()
    }

    return @($matches | Sort-Object -Unique)
}

function Get-PidFromFile {
    if (-not (Test-Path $pidFile)) {
        return $null
    }

    try {
        $content = Get-Content $pidFile -ErrorAction Stop | Select-Object -First 1
        $parsed = 0
        if ([int]::TryParse($content, [ref]$parsed)) {
            return $parsed
        }
    }
    catch {
        return $null
    }

    return $null
}

function Get-AllBackendPids {
    $all = @()
    $all += Get-BackendPidsByCommandLine
    $all += Get-ListeningPidByPort -ListenPort $Port

    $pidFromFile = Get-PidFromFile
    if ($pidFromFile) {
        $all += $pidFromFile
    }

    return @($all | Where-Object { $_ -and $_ -gt 0 } | Sort-Object -Unique)
}

function Wait-PortState {
    param(
        [int]$ListenPort,
        [bool]$ShouldBeOpen,
        [int]$TimeoutSeconds = 45
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $isOpen = (Get-ListeningPidByPort -ListenPort $ListenPort).Count -gt 0
        if ($isOpen -eq $ShouldBeOpen) {
            return $true
        }

        Start-Sleep -Milliseconds 500
    }

    return $false
}

function Show-Status {
    $portPids = @(Get-ListeningPidByPort -ListenPort $Port)
    $backendPids = @(Get-BackendPidsByCommandLine)
    $pidFromFile = Get-PidFromFile
    $orphanBackendPids = @($backendPids | Where-Object { $portPids -notcontains $_ })

    Write-Host "Repo: $repoRoot"
    Write-Host "Project: $projectPath"
    Write-Host "Porta: $Port"
    Write-Host "PID da file: $pidFromFile"
    Write-Host "PID su porta: $($portPids -join ', ')"
    Write-Host "PID backend (cmdline): $($backendPids -join ', ')"

    if ($portPids.Count -eq 0) {
        Write-Host "Stato backend: FERMO"

        if ($orphanBackendPids.Count -gt 0) {
            Write-Warning "Trovati processi dotnet orfani (non in ascolto su porta $Port): $($orphanBackendPids -join ', ')"
        }

        if ($pidFromFile) {
            Write-Warning "PID file non allineato (nessun listener su porta)."
            if (Test-Path $pidFile) {
                Remove-Item $pidFile -Force
            }
        }
    }
    else {
        Write-Host "Stato backend: ATTIVO (PID: $($portPids -join ', '))"

        if ($pidFromFile -and ($portPids -notcontains $pidFromFile) -and (Test-Path $pidFile)) {
            Set-Content -Path $pidFile -Value $portPids[0] -NoNewline
            Write-Host "PID file riallineato al listener attivo: $($portPids[0])."
        }
    }

    Write-Host "Log output: $outLog"
    Write-Host "Log error:  $errLog"
}

function Stop-Backend {
    $targets = @(Get-AllBackendPids)
    if ($targets.Count -eq 0) {
        if (Test-Path $pidFile) {
            Remove-Item $pidFile -Force
        }

        Write-Host "Backend gia fermo."
        return
    }

    foreach ($targetPid in $targets) {
        try {
            $proc = Get-Process -Id $targetPid -ErrorAction Stop
            Stop-Process -Id $proc.Id -Force -ErrorAction Stop
            Write-Host "Terminato PID $($proc.Id)."
        }
        catch {
            Write-Host "PID $targetPid non trovato o gia terminato."
        }
    }

    $closed = Wait-PortState -ListenPort $Port -ShouldBeOpen:$false -TimeoutSeconds 30
    if (-not $closed) {
        Write-Warning "La porta $Port risulta ancora in uso."
    }

    if (Test-Path $pidFile) {
        Remove-Item $pidFile -Force
    }
}

function Start-Backend {
    if (-not (Test-Path $projectPath)) {
        throw "Progetto non trovato: $projectPath"
    }

    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir | Out-Null
    }

    $currentPortPids = @(Get-ListeningPidByPort -ListenPort $Port)
    if ($currentPortPids.Count -gt 0) {
        $matchingBackend = @(Get-BackendPidsByCommandLine | Where-Object { $currentPortPids -contains $_ })
        if ($matchingBackend.Count -gt 0) {
            $runningPid = $matchingBackend[0]
            Set-Content -Path $pidFile -Value $runningPid -NoNewline
            Write-Host "Backend gia attivo su porta $Port (PID $runningPid)."
            return
        }

        throw "Porta $Port occupata da PID non riconosciuti: $($currentPortPids -join ', ')."
    }

    if (Test-Path $pidFile) {
        Remove-Item $pidFile -Force
    }

    Set-Content -Path $outLog -Value "========== $(Get-Date -Format s) START =========="
    Set-Content -Path $errLog -Value "========== $(Get-Date -Format s) START =========="

    $escapedProjectPath = $projectPath.Replace('"', '""')
    $escapedOutLog = $outLog.Replace('"', '""')
    $escapedErrLog = $errLog.Replace('"', '""')
    $commandLine = "cmd.exe /d /c ""dotnet run --project `"$escapedProjectPath`" 1>> `"$escapedOutLog`" 2>> `"$escapedErrLog`""""
    $createResult = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $commandLine }
    if ($createResult.ReturnValue -ne 0) {
        throw "Impossibile avviare il backend (Win32_Process.Create ReturnValue=$($createResult.ReturnValue))."
    }

    $opened = Wait-PortState -ListenPort $Port -ShouldBeOpen:$true -TimeoutSeconds 60
    if (-not $opened) {
        Write-Host "Backend non partito entro timeout. Ultime righe errore:"
        if (Test-Path $errLog) {
            Get-Content $errLog -Tail 40
        }
        throw "Avvio backend fallito."
    }

    $listenPid = @(Get-ListeningPidByPort -ListenPort $Port) | Select-Object -First 1
    if ($listenPid) {
        Set-Content -Path $pidFile -Value $listenPid -NoNewline
        Write-Host "Backend avviato su porta $Port (PID $listenPid)."
    }
    else {
        throw "Backend in ascolto ma PID non risolto."
    }
}

function Show-Logs {
    Write-Host "===== OUT (tail 60) ====="
    if (Test-Path $outLog) {
        Get-Content $outLog -Tail 60
    }
    else {
        Write-Host "(file non presente)"
    }

    Write-Host "===== ERR (tail 60) ====="
    if (Test-Path $errLog) {
        Get-Content $errLog -Tail 60
    }
    else {
        Write-Host "(file non presente)"
    }
}

switch ($Action) {
    "start" {
        Start-Backend
        Show-Status
    }
    "stop" {
        Stop-Backend
        Show-Status
    }
    "restart" {
        Stop-Backend
        Start-Backend
        Show-Status
    }
    "logs" {
        Show-Logs
    }
    default {
        Show-Status
    }
}

