param(
    [string]$SettingsFile = "scripts/publish/publish.settings.local.json",
    [string]$Configuration = "",
    [string]$FrontendApiBaseUrl = "",
    [string]$BackendAppSettingsPath = "",
    [string]$Runtime = "",
    [string]$OutputDir = "",
    [switch]$SkipNpmCi
)

$ErrorActionPreference = "Stop"

function Resolve-AbsolutePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PathValue,
        [Parameter(Mandatory = $true)]
        [string]$BaseDirectory
    )

    if ([string]::IsNullOrWhiteSpace($PathValue)) {
        throw "PathValue non puo essere vuoto."
    }

    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return [System.IO.Path]::GetFullPath($PathValue)
    }

    return [System.IO.Path]::GetFullPath((Join-Path $BaseDirectory $PathValue))
}

function Resolve-ConfiguredPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PathValue,
        [Parameter(Mandatory = $true)]
        [string]$PrimaryBaseDirectory,
        [string]$SecondaryBaseDirectory
    )

    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return [System.IO.Path]::GetFullPath($PathValue)
    }

    $primaryCandidate = [System.IO.Path]::GetFullPath((Join-Path $PrimaryBaseDirectory $PathValue))
    if (Test-Path -LiteralPath $primaryCandidate) {
        return $primaryCandidate
    }

    if (-not [string]::IsNullOrWhiteSpace($SecondaryBaseDirectory)) {
        $secondaryCandidate = [System.IO.Path]::GetFullPath((Join-Path $SecondaryBaseDirectory $PathValue))
        if (Test-Path -LiteralPath $secondaryCandidate) {
            return $secondaryCandidate
        }
    }

    return $primaryCandidate
}

function Get-EnvValueFromFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [string]$Key
    )

    if (-not (Test-Path -LiteralPath $FilePath)) {
        return $null
    }

    $escapedKey = [regex]::Escape($Key)
    $line = Get-Content -Path $FilePath |
        Where-Object { $_ -match "^\s*$escapedKey\s*=" } |
        Select-Object -First 1

    if ([string]::IsNullOrWhiteSpace($line)) {
        return $null
    }

    $parts = $line -split "=", 2
    if ($parts.Count -ne 2) {
        return $null
    }

    $value = $parts[1].Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    elseif ($value.StartsWith("'") -and $value.EndsWith("'")) {
        $value = $value.Substring(1, $value.Length - 2)
    }

    return $value
}

function Get-OptionalSettingValue {
    param(
        $Settings,
        [string]$PropertyName
    )

    if ($null -eq $Settings) {
        return $null
    }

    $property = $Settings.PSObject.Properties |
        Where-Object { $_.Name -eq $PropertyName } |
        Select-Object -First 1

    if ($null -eq $property) {
        return $null
    }

    return $property.Value
}

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,
        [Parameter(Mandatory = $true)]
        [string]$Executable,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    Write-Host ">> $Executable $($Arguments -join ' ')"
    Push-Location $WorkingDirectory
    try {
        & $Executable @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Comando fallito ($Executable) con exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$backendProjectPath = Join-Path $repoRoot "src\backend\Produzione.Api\Produzione.Api.csproj"
$frontendDirectory = Join-Path $repoRoot "src\frontend\Produzione.Web"
$frontendProductionEnvPath = Join-Path $frontendDirectory ".env.production"
$defaultBackendAppSettingsPath = Join-Path $repoRoot "src\backend\Produzione.Api\appsettings.json"

$resolvedSettingsFilePath = Resolve-AbsolutePath -PathValue $SettingsFile -BaseDirectory $repoRoot
$settings = $null
if (Test-Path -LiteralPath $resolvedSettingsFilePath) {
    $settingsRaw = Get-Content -LiteralPath $resolvedSettingsFilePath -Raw
    if (-not [string]::IsNullOrWhiteSpace($settingsRaw)) {
        $settings = $settingsRaw | ConvertFrom-Json
        Write-Host "Settings caricati da: $resolvedSettingsFilePath"
    }
}
else {
    Write-Host "Settings file non trovato ($resolvedSettingsFilePath). Uso default/script args."
}

$effectiveConfiguration = $Configuration
if ([string]::IsNullOrWhiteSpace($effectiveConfiguration)) {
    $effectiveConfiguration = Get-OptionalSettingValue -Settings $settings -PropertyName "configuration"
}
if ([string]::IsNullOrWhiteSpace($effectiveConfiguration)) {
    $effectiveConfiguration = "Release"
}

$effectiveRuntime = $Runtime
if ([string]::IsNullOrWhiteSpace($effectiveRuntime)) {
    $effectiveRuntime = Get-OptionalSettingValue -Settings $settings -PropertyName "runtime"
}

$effectiveFrontendApiBaseUrl = $FrontendApiBaseUrl
if ([string]::IsNullOrWhiteSpace($effectiveFrontendApiBaseUrl)) {
    $effectiveFrontendApiBaseUrl = Get-OptionalSettingValue -Settings $settings -PropertyName "frontendApiBaseUrl"
}
if ([string]::IsNullOrWhiteSpace($effectiveFrontendApiBaseUrl)) {
    $effectiveFrontendApiBaseUrl = Get-EnvValueFromFile -FilePath $frontendProductionEnvPath -Key "VITE_BACKEND_BASE_URL"
}
if ([string]::IsNullOrWhiteSpace($effectiveFrontendApiBaseUrl)) {
    $effectiveFrontendApiBaseUrl = "https://localhost:7643"
}

$configuredBackendSettingsPath = $BackendAppSettingsPath
if ([string]::IsNullOrWhiteSpace($configuredBackendSettingsPath)) {
    $configuredBackendSettingsPath = Get-OptionalSettingValue -Settings $settings -PropertyName "backendAppSettingsPath"
}
if ([string]::IsNullOrWhiteSpace($configuredBackendSettingsPath)) {
    $configuredBackendSettingsPath = $defaultBackendAppSettingsPath
}

$settingsBaseDirectory = Split-Path -Parent $resolvedSettingsFilePath
$resolvedBackendAppSettingsPath = Resolve-ConfiguredPath `
    -PathValue $configuredBackendSettingsPath `
    -PrimaryBaseDirectory $repoRoot `
    -SecondaryBaseDirectory $settingsBaseDirectory
if (-not (Test-Path -LiteralPath $resolvedBackendAppSettingsPath)) {
    throw "File backend appsettings non trovato: $resolvedBackendAppSettingsPath"
}

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $OutputDir = Join-Path $repoRoot ("artifacts\publish\" + $timestamp)
}
else {
    $OutputDir = Resolve-AbsolutePath -PathValue $OutputDir -BaseDirectory $repoRoot
}

$backendOutputDirectory = Join-Path $OutputDir "backend"
$frontendOutputDirectory = Join-Path $OutputDir "frontend"
$metaOutputDirectory = Join-Path $OutputDir "meta"

if (-not (Test-Path -LiteralPath $backendProjectPath)) {
    throw "Progetto backend non trovato: $backendProjectPath"
}
if (-not (Test-Path -LiteralPath $frontendDirectory)) {
    throw "Cartella frontend non trovata: $frontendDirectory"
}

Write-Host ""
Write-Host "=== Publish settings ==="
Write-Host "Repo root:                  $repoRoot"
Write-Host "Output dir:                 $OutputDir"
Write-Host "Configuration:              $effectiveConfiguration"
Write-Host "Runtime:                    $(if ([string]::IsNullOrWhiteSpace($effectiveRuntime)) { '(default framework-dependent)' } else { $effectiveRuntime })"
Write-Host "Frontend API base URL:      $effectiveFrontendApiBaseUrl"
Write-Host "Backend appsettings source: $resolvedBackendAppSettingsPath"
Write-Host "Skip npm ci:                $SkipNpmCi"

if (Test-Path -LiteralPath $OutputDir) {
    Remove-Item -LiteralPath $OutputDir -Recurse -Force
}

New-Item -ItemType Directory -Path $backendOutputDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $frontendOutputDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $metaOutputDirectory -Force | Out-Null

Write-Host ""
Write-Host "=== Backend publish ==="
Invoke-NativeCommand -WorkingDirectory $repoRoot -Executable "dotnet" -Arguments @("restore", $backendProjectPath)

$dotnetPublishArgs = @(
    "publish",
    $backendProjectPath,
    "-c",
    $effectiveConfiguration,
    "-o",
    $backendOutputDirectory,
    "--nologo"
)

if (-not [string]::IsNullOrWhiteSpace($effectiveRuntime)) {
    $dotnetPublishArgs += @("-r", $effectiveRuntime, "--self-contained", "false")
}

Invoke-NativeCommand -WorkingDirectory $repoRoot -Executable "dotnet" -Arguments $dotnetPublishArgs

Copy-Item -LiteralPath $resolvedBackendAppSettingsPath -Destination (Join-Path $backendOutputDirectory "appsettings.json") -Force

$backendDevSettingsPath = Join-Path $backendOutputDirectory "appsettings.Development.json"
if (Test-Path -LiteralPath $backendDevSettingsPath) {
    Remove-Item -LiteralPath $backendDevSettingsPath -Force
}

Write-Host ""
Write-Host "=== Frontend build ==="
if (-not $SkipNpmCi) {
    Invoke-NativeCommand -WorkingDirectory $frontendDirectory -Executable "npm.cmd" -Arguments @("ci")
}

$previousFrontendBackendBaseUrl = $env:VITE_BACKEND_BASE_URL
try {
    $env:VITE_BACKEND_BASE_URL = $effectiveFrontendApiBaseUrl
    Invoke-NativeCommand -WorkingDirectory $frontendDirectory -Executable "npm.cmd" -Arguments @("run", "build")
}
finally {
    if ($null -eq $previousFrontendBackendBaseUrl) {
        Remove-Item Env:VITE_BACKEND_BASE_URL -ErrorAction SilentlyContinue
    }
    else {
        $env:VITE_BACKEND_BASE_URL = $previousFrontendBackendBaseUrl
    }
}

$frontendDistDirectory = Join-Path $frontendDirectory "dist"
if (-not (Test-Path -LiteralPath $frontendDistDirectory)) {
    throw "Build frontend completata ma cartella dist non trovata: $frontendDistDirectory"
}

Copy-Item -Path (Join-Path $frontendDistDirectory "*") -Destination $frontendOutputDirectory -Recurse -Force

$resolvedSettingsSnapshot = [PSCustomObject]@{
    generatedAtUtc          = (Get-Date).ToUniversalTime().ToString("o")
    configuration           = $effectiveConfiguration
    runtime                 = $effectiveRuntime
    frontendApiBaseUrl      = $effectiveFrontendApiBaseUrl
    backendAppSettingsPath  = $resolvedBackendAppSettingsPath
    outputDir               = $OutputDir
    skipNpmCi               = [bool]$SkipNpmCi
}

$resolvedSettingsSnapshot |
    ConvertTo-Json -Depth 8 |
    Set-Content -Path (Join-Path $metaOutputDirectory "publish-resolved-settings.json")

$deployReadmePath = Join-Path $OutputDir "README_DEPLOY.txt"
$deployReadmeContent = @"
PACCHETTO DI PUBBLICAZIONE - PRODUZIONE
=============================================

Contenuto:
- backend\   -> output dotnet publish API
- frontend\  -> build statico Vite (da servire via web server)
- meta\      -> snapshot impostazioni usate in publish

Backend:
1) Copiare la cartella backend sul server.
2) Verificare appsettings.json (gia copiato da: $resolvedBackendAppSettingsPath).
3) Avvio tipico:
   dotnet Produzione.Api.dll

Frontend:
1) Pubblicare la cartella frontend sul web server (IIS/Nginx/Apache).
2) La build e stata prodotta con:
   VITE_BACKEND_BASE_URL=$effectiveFrontendApiBaseUrl

Nota:
- Per non impazzire con la configurazione, salva una volta sola
  scripts\publish\publish.settings.local.json (ignorato da git)
  e poi usa sempre:
  scripts\publish\publish.cmd
"@
Set-Content -Path $deployReadmePath -Value $deployReadmeContent

Write-Host ""
Write-Host "Publish completata con successo."
Write-Host "Artifact: $OutputDir"


