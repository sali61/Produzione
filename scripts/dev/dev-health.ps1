param(
    [int]$BackendPort = 7643,
    [int]$FrontendPort = 5643
)

$ErrorActionPreference = "Stop"

function Test-PortListen {
    param([int]$Port)
    try {
        $listeners = @(
            Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
        )
        return $listeners.Count -gt 0
    }
    catch {
        return $false
    }
}

function Test-Http {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 8
        return [PSCustomObject]@{ Ok = $true; StatusCode = $response.StatusCode; Error = $null }
    }
    catch {
        $message = $_.Exception.Message
        return [PSCustomObject]@{ Ok = $false; StatusCode = $null; Error = $message }
    }
}

$backendListening = Test-PortListen -Port $BackendPort
$frontendListening = Test-PortListen -Port $FrontendPort

$backendHttp = Test-Http -Url "https://localhost:$BackendPort"
$frontendHttp = Test-Http -Url "https://localhost:$FrontendPort"

Write-Host "Backend porta $BackendPort in ascolto: $backendListening"
if ($backendHttp.Ok) {
    Write-Host "Backend HTTP: OK (status $($backendHttp.StatusCode))"
}
else {
    Write-Host "Backend HTTP: FAIL ($($backendHttp.Error))"
}

Write-Host "Frontend porta $FrontendPort in ascolto: $frontendListening"
if ($frontendHttp.Ok) {
    Write-Host "Frontend HTTP: OK (status $($frontendHttp.StatusCode))"
}
else {
    Write-Host "Frontend HTTP: FAIL ($($frontendHttp.Error))"
}

if ($backendListening -and $frontendListening -and $backendHttp.Ok -and $frontendHttp.Ok) {
    Write-Host "STATO COMPLESSIVO: OK"
    exit 0
}

Write-Host "STATO COMPLESSIVO: NON OK"
exit 1

