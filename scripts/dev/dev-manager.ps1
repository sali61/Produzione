param(
    [ValidateSet("start", "stop", "restart", "status", "logs")]
    [string]$Action = "status",
    [int]$BackendPort = 7643,
    [int]$FrontendPort = 5643
)

$ErrorActionPreference = "Stop"

$backendManager = Join-Path $PSScriptRoot "backend-manager.ps1"
$frontendManager = Join-Path $PSScriptRoot "frontend-manager.ps1"

if (-not (Test-Path $backendManager)) {
    throw "Script backend-manager mancante: $backendManager"
}

if (-not (Test-Path $frontendManager)) {
    throw "Script frontend-manager mancante: $frontendManager"
}

$hadError = $false

function Invoke-ComponentAction {
    param(
        [string]$Name,
        [string]$ScriptPath,
        [string]$ComponentAction,
        [int]$Port
    )

    Write-Host ""
    Write-Host "=== ${Name}: $ComponentAction (porta $Port) ==="
    try {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $ScriptPath -Action $ComponentAction -Port $Port
        if ($LASTEXITCODE -ne 0) {
            throw "$Name ha restituito codice di uscita $LASTEXITCODE."
        }
    }
    catch {
        Write-Error "$Name $ComponentAction fallito: $($_.Exception.Message)"
        $script:hadError = $true
    }
}

switch ($Action) {
    "start" {
        Invoke-ComponentAction -Name "Backend" -ScriptPath $backendManager -ComponentAction "start" -Port $BackendPort
        Invoke-ComponentAction -Name "Frontend" -ScriptPath $frontendManager -ComponentAction "start" -Port $FrontendPort
    }
    "stop" {
        Invoke-ComponentAction -Name "Frontend" -ScriptPath $frontendManager -ComponentAction "stop" -Port $FrontendPort
        Invoke-ComponentAction -Name "Backend" -ScriptPath $backendManager -ComponentAction "stop" -Port $BackendPort
    }
    "restart" {
        Invoke-ComponentAction -Name "Frontend" -ScriptPath $frontendManager -ComponentAction "stop" -Port $FrontendPort
        Invoke-ComponentAction -Name "Backend" -ScriptPath $backendManager -ComponentAction "stop" -Port $BackendPort
        Invoke-ComponentAction -Name "Backend" -ScriptPath $backendManager -ComponentAction "start" -Port $BackendPort
        Invoke-ComponentAction -Name "Frontend" -ScriptPath $frontendManager -ComponentAction "start" -Port $FrontendPort
    }
    "status" {
        Invoke-ComponentAction -Name "Backend" -ScriptPath $backendManager -ComponentAction "status" -Port $BackendPort
        Invoke-ComponentAction -Name "Frontend" -ScriptPath $frontendManager -ComponentAction "status" -Port $FrontendPort
    }
    "logs" {
        Invoke-ComponentAction -Name "Backend" -ScriptPath $backendManager -ComponentAction "logs" -Port $BackendPort
        Invoke-ComponentAction -Name "Frontend" -ScriptPath $frontendManager -ComponentAction "logs" -Port $FrontendPort
    }
}

if ($hadError) {
    exit 1
}

exit 0

