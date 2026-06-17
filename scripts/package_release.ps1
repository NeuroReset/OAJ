param(
    [string]$InstallPath = "$env:LOCALAPPDATA\Programs\OAJ"
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot
$releaseRoot = Join-Path $projectRoot "release"
$tempRoot = Join-Path $env:TEMP ("OAJ-release-" + [guid]::NewGuid().ToString("N"))
$stagingRoot = Join-Path $tempRoot "OAJ"
$distRoot = Join-Path $projectRoot "dist\OAJ"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipPath = Join-Path $releaseRoot ("OAJ-release-" + $timestamp + ".zip")
$launcherBuildRoot = Join-Path $tempRoot "installer-build"
$launcherDistRoot = Join-Path $launcherBuildRoot "dist"
$launcherWorkRoot = Join-Path $launcherBuildRoot "work"
$installerLauncher = Join-Path $projectRoot "scripts\installer_launcher.py"
$iconPath = Join-Path $projectRoot "assets\images\image.ico"
$installerExePath = Join-Path $launcherDistRoot "Instalar-OAJ.exe"
$venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"

if (Test-Path $venvPython) {
    $python = $venvPython
} else {
    $python = "python"
}

if (-not (Test-Path $distRoot)) {
    throw "Build nao encontrado em $distRoot. Rode .\build.ps1 antes."
}

& $python -m PyInstaller `
    --noconfirm `
    --onefile `
    --windowed `
    --name "Instalar-OAJ" `
    --specpath $launcherBuildRoot `
    --distpath $launcherDistRoot `
    --workpath $launcherWorkRoot `
    --icon $iconPath `
    $installerLauncher

if (-not (Test-Path $installerExePath)) {
    throw "Instalador executavel nao foi gerado em $installerExePath."
}

New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null

Copy-Item -LiteralPath $distRoot -Destination (Join-Path $stagingRoot "dist\OAJ") -Recurse -Force
Copy-Item -LiteralPath $installerExePath -Destination (Join-Path $stagingRoot "Instalar-OAJ.exe")
Copy-Item -LiteralPath (Join-Path $projectRoot "scripts\install.ps1") -Destination (Join-Path $stagingRoot "Instalar-OAJ.ps1")
Copy-Item -LiteralPath (Join-Path $projectRoot "scripts\update.ps1") -Destination (Join-Path $stagingRoot "Atualizar-OAJ.ps1")

$instructions = @"
1. Para instalar:
   extraia o .zip e execute:
   .\Instalar-OAJ.exe

2. Para atualizar:
   substitua a pasta dist\OAJ pela nova versao e rode:
   powershell -ExecutionPolicy Bypass -File .\Atualizar-OAJ.ps1

3. Destino padrao da instalacao:
   $InstallPath
"@

Set-Content -Path (Join-Path $stagingRoot "LEIA-ME.txt") -Value $instructions -Encoding UTF8

Compress-Archive -Path (Join-Path $stagingRoot "*") -DestinationPath $zipPath -Force

if (Test-Path $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Pacote gerado em: $zipPath"
