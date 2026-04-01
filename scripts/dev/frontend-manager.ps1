param(
    [ValidateSet("start", "stop", "restart", "status", "logs")]
    [string]$Action = "status",
    [int]$Port = 5643
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$frontendDir = Join-Path $repoRoot "src\frontend\Produzione.Web"
$logsDir = Join-Path $repoRoot ".logs"
$outLog = Join-Path $logsDir "frontend-dev.out.log"
$errLog = Join-Path $logsDir "frontend-dev.err.log"
$pidFile = Join-Path $logsDir "frontend-dev.pid"

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

function Get-FrontendPidsByCommandLine {
    $matches = @()
    try {
        $processes = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction Stop
        foreach ($process in $processes) {
            $commandLine = $process.CommandLine
            if ([string]::IsNullOrWhiteSpace($commandLine)) {
                continue
            }

            if (
                $commandLine -like "*Produzione.Web*" -and
                ($commandLine -like "*vite*" -or $commandLine -like "*npm run dev*")
            ) {
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

function Get-AllFrontendPids {
    $all = @()
    $all += Get-FrontendPidsByCommandLine
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
    $frontendPids = @(Get-FrontendPidsByCommandLine)
    $pidFromFile = Get-PidFromFile
    $orphanFrontendPids = @($frontendPids | Where-Object { $portPids -notcontains $_ })

    Write-Host "Repo: $repoRoot"
    Write-Host "Frontend dir: $frontendDir"
    Write-Host "Porta: $Port"
    Write-Host "PID da file: $pidFromFile"
    Write-Host "PID su porta: $($portPids -join ', ')"
    Write-Host "PID frontend (cmdline): $($frontendPids -join ', ')"

    if ($portPids.Count -eq 0) {
        Write-Host "Stato frontend: FERMO"

        if ($orphanFrontendPids.Count -gt 0) {
            Write-Warning "Trovati processi node orfani (non in ascolto su porta $Port): $($orphanFrontendPids -join ', ')"
        }

        if ($pidFromFile) {
            Write-Warning "PID file non allineato (nessun listener su porta)."
            if (Test-Path $pidFile) {
                Remove-Item $pidFile -Force
            }
        }
    }
    else {
        Write-Host "Stato frontend: ATTIVO (PID: $($portPids -join ', '))"

        if ($pidFromFile -and ($portPids -notcontains $pidFromFile) -and (Test-Path $pidFile)) {
            Set-Content -Path $pidFile -Value $portPids[0] -NoNewline
            Write-Host "PID file riallineato al listener attivo: $($portPids[0])."
        }
    }

    Write-Host "Log output: $outLog"
    Write-Host "Log error:  $errLog"
}

function Stop-Frontend {
    $targets = @(Get-AllFrontendPids)
    if ($targets.Count -eq 0) {
        if (Test-Path $pidFile) {
            Remove-Item $pidFile -Force
        }

        Write-Host "Frontend gia fermo."
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

function Start-Frontend {
    if (-not (Test-Path $frontendDir)) {
        throw "Frontend non trovato: $frontendDir"
    }

    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir | Out-Null
    }

    $currentPortPids = @(Get-ListeningPidByPort -ListenPort $Port)
    if ($currentPortPids.Count -gt 0) {
        $matchingFrontend = @(Get-FrontendPidsByCommandLine | Where-Object { $currentPortPids -contains $_ })
        if ($matchingFrontend.Count -gt 0) {
            $runningPid = $matchingFrontend[0]
            Set-Content -Path $pidFile -Value $runningPid -NoNewline
            Write-Host "Frontend gia attivo su porta $Port (PID $runningPid)."
            return
        }

        throw "Porta $Port occupata da PID non riconosciuti: $($currentPortPids -join ', ')."
    }

    if (Test-Path $pidFile) {
        Remove-Item $pidFile -Force
    }

    Set-Content -Path $outLog -Value "========== $(Get-Date -Format s) START =========="
    Set-Content -Path $errLog -Value "========== $(Get-Date -Format s) START =========="

    $escapedFrontendDir = $frontendDir.Replace('"', '""')
    $escapedOutLog = $outLog.Replace('"', '""')
    $escapedErrLog = $errLog.Replace('"', '""')
    $commandLine = "cmd.exe /d /c ""cd /d `"$escapedFrontendDir`" && npm run dev -- --host localhost --port $Port 1>> `"$escapedOutLog`" 2>> `"$escapedErrLog`""""
    $createResult = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $commandLine }
    if ($createResult.ReturnValue -ne 0) {
        throw "Impossibile avviare il frontend (Win32_Process.Create ReturnValue=$($createResult.ReturnValue))."
    }

    $opened = Wait-PortState -ListenPort $Port -ShouldBeOpen:$true -TimeoutSeconds 60
    if (-not $opened) {
        Write-Host "Frontend non partito entro timeout. Ultime righe errore:"
        if (Test-Path $errLog) {
            Get-Content $errLog -Tail 40
        }
        throw "Avvio frontend fallito."
    }

    $listenPid = @(Get-ListeningPidByPort -ListenPort $Port) | Select-Object -First 1
    if ($listenPid) {
        Set-Content -Path $pidFile -Value $listenPid -NoNewline
        Write-Host "Frontend avviato su porta $Port (PID $listenPid)."
    }
    else {
        throw "Frontend in ascolto ma PID non risolto."
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
        Start-Frontend
        Show-Status
    }
    "stop" {
        Stop-Frontend
        Show-Status
    }
    "restart" {
        Stop-Frontend
        Start-Frontend
        Show-Status
    }
    "logs" {
        Show-Logs
    }
    default {
        Show-Status
    }
}

