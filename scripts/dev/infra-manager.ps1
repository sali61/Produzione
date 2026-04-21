param(
    [ValidateSet("start", "stop", "restart", "status", "health")]
    [string]$Action = "status",
    [string]$AuthRepoPath = ""
)

$ErrorActionPreference = "Stop"

$produzioneRepo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
if ([string]::IsNullOrWhiteSpace($AuthRepoPath)) {
    $AuthRepoPath = Join-Path (Split-Path $produzioneRepo -Parent) "Auth"
}

$authDevDir = Join-Path $AuthRepoPath "scripts\dev"
$produzioneDevDir = Join-Path $produzioneRepo "scripts\dev"

function Test-PortListening {
    param([int]$Port)

    try {
        $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop
        return ($listeners | Measure-Object).Count -gt 0
    }
    catch {
        return $false
    }
}

function Invoke-DevCmd {
    param(
        [string]$Label,
        [string]$CmdPath
    )

    if (-not (Test-Path $CmdPath)) {
        throw "Script non trovato per ${Label}: $CmdPath"
    }

    Write-Host ""
    Write-Host "=== $Label ==="
    & cmd.exe /c "`"$CmdPath`""
    if ($LASTEXITCODE -ne 0) {
        throw "$Label fallito (exit code: $LASTEXITCODE)."
    }
}

function Ensure-Started {
    param(
        [string]$Label,
        [string]$CmdPath,
        [int]$Port
    )

    if (Test-PortListening -Port $Port) {
        Write-Host ""
        Write-Host "=== $Label ==="
        Write-Host "Gia attivo su porta ${Port}: skip."
        return
    }

    Invoke-DevCmd -Label $Label -CmdPath $CmdPath
}

function Ensure-Stopped {
    param(
        [string]$Label,
        [string]$CmdPath,
        [int]$Port
    )

    if (-not (Test-PortListening -Port $Port)) {
        Write-Host ""
        Write-Host "=== $Label ==="
        Write-Host "Gia fermo su porta ${Port}: skip."
        return
    }

    Invoke-DevCmd -Label $Label -CmdPath $CmdPath
}

switch ($Action) {
    "start" {
        Ensure-Started -Label "AUTH backend-start" -CmdPath (Join-Path $authDevDir "backend-start.cmd") -Port 7043
        Ensure-Started -Label "AUTH frontend-start" -CmdPath (Join-Path $authDevDir "frontend-start.cmd") -Port 5043
        Ensure-Started -Label "PRODUZIONE backend-start" -CmdPath (Join-Path $produzioneDevDir "backend-start.cmd") -Port 7643
        Ensure-Started -Label "PRODUZIONE frontend-start" -CmdPath (Join-Path $produzioneDevDir "frontend-start.cmd") -Port 5643
    }
    "stop" {
        Ensure-Stopped -Label "PRODUZIONE frontend-stop" -CmdPath (Join-Path $produzioneDevDir "frontend-stop.cmd") -Port 5643
        Ensure-Stopped -Label "PRODUZIONE backend-stop" -CmdPath (Join-Path $produzioneDevDir "backend-stop.cmd") -Port 7643
        Ensure-Stopped -Label "AUTH frontend-stop" -CmdPath (Join-Path $authDevDir "frontend-stop.cmd") -Port 5043
        Ensure-Stopped -Label "AUTH backend-stop" -CmdPath (Join-Path $authDevDir "backend-stop.cmd") -Port 7043
    }
    "restart" {
        Invoke-DevCmd -Label "PRODUZIONE dev-restart" -CmdPath (Join-Path $produzioneDevDir "dev-restart.cmd")
        Invoke-DevCmd -Label "AUTH dev-restart" -CmdPath (Join-Path $authDevDir "dev-restart.cmd")
    }
    "status" {
        Invoke-DevCmd -Label "AUTH dev-status" -CmdPath (Join-Path $authDevDir "dev-status.cmd")
        Invoke-DevCmd -Label "PRODUZIONE dev-status" -CmdPath (Join-Path $produzioneDevDir "dev-status.cmd")
    }
    "health" {
        Invoke-DevCmd -Label "AUTH dev-health" -CmdPath (Join-Path $authDevDir "dev-health.cmd")
        Invoke-DevCmd -Label "PRODUZIONE dev-health" -CmdPath (Join-Path $produzioneDevDir "dev-health.cmd")
    }
}

Write-Host ""
Write-Host "Operazione completata: $Action"
Write-Host "Auth repo: $AuthRepoPath"
Write-Host "Produzione repo: $produzioneRepo"
