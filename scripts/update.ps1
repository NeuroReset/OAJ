param(
    [string]$SourcePath = ".\dist\OAJ",
    [string]$InstallPath = "$env:LOCALAPPDATA\Programs\OAJ"
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot
$installScript = Join-Path $projectRoot "scripts\install.ps1"

if (-not (Test-Path $installScript)) {
    throw "Arquivo install.ps1 nao encontrado em $installScript"
}

if (-not (Test-Path $InstallPath)) {
    throw "Aplicacao ainda nao instalada em: $InstallPath"
}

powershell -ExecutionPolicy Bypass -File $installScript -SourcePath $SourcePath -InstallPath $InstallPath
