param(
    [string]$SourcePath = ".\dist\OAJ",
    [string]$InstallPath = "$env:LOCALAPPDATA\Programs\OAJ",
    [switch]$NoDesktopShortcut
)

$ErrorActionPreference = "Stop"

function Copy-PreservedContent {
    param(
        [string]$PreservePath,
        [string]$TargetPath
    )

    if (-not (Test-Path $PreservePath)) {
        return
    }

    Get-ChildItem -LiteralPath $PreservePath -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $TargetPath -Recurse -Force
    }
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot
$resolvedSource = $SourcePath
if (-not [System.IO.Path]::IsPathRooted($resolvedSource)) {
    $resolvedSource = Join-Path $projectRoot $resolvedSource
}
$resolvedSource = [System.IO.Path]::GetFullPath($resolvedSource)
$resolvedInstall = [System.IO.Path]::GetFullPath($InstallPath)
$preserveRoot = Join-Path $env:TEMP "OAJ-install-preserve"

if (-not (Test-Path $resolvedSource)) {
    throw "Pasta de origem nao encontrada: $resolvedSource"
}

if (Test-Path $preserveRoot) {
    Remove-Item -LiteralPath $preserveRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $preserveRoot | Out-Null

if (Test-Path $resolvedInstall) {
    foreach ($name in @("db_config.json", "pdfs", "app_data")) {
        $itemPath = Join-Path $resolvedInstall $name
        if (Test-Path $itemPath) {
            Copy-Item -LiteralPath $itemPath -Destination (Join-Path $preserveRoot $name) -Recurse -Force
        }
    }

    Remove-Item -LiteralPath $resolvedInstall -Recurse -Force
}

New-Item -ItemType Directory -Path $resolvedInstall -Force | Out-Null
Get-ChildItem -LiteralPath $resolvedSource -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $resolvedInstall -Recurse -Force
}

foreach ($name in @("pdfs", "app_data")) {
    $targetDir = Join-Path $resolvedInstall $name
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir | Out-Null
    }
}

$distConfig = Join-Path $resolvedInstall "db_config.json"
$exampleConfig = Join-Path $resolvedInstall "db_config.example.json"

if ((Test-Path (Join-Path $preserveRoot "db_config.json")) -and -not (Test-Path $distConfig)) {
    Copy-Item -LiteralPath (Join-Path $preserveRoot "db_config.json") -Destination $distConfig
}

foreach ($name in @("pdfs", "app_data")) {
    Copy-PreservedContent -PreservePath (Join-Path $preserveRoot $name) -TargetPath (Join-Path $resolvedInstall $name)
}

if (-not (Test-Path $distConfig) -and (Test-Path $exampleConfig)) {
    Copy-Item -LiteralPath $exampleConfig -Destination $distConfig
}

$exePath = Join-Path $resolvedInstall "OAJ.exe"
if (-not (Test-Path $exePath)) {
    throw "Executavel nao encontrado em: $exePath"
}

if (-not $NoDesktopShortcut) {
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $shortcutPath = Join-Path $desktopPath "OAJ.lnk"
    $wsh = New-Object -ComObject WScript.Shell
    $shortcut = $wsh.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $exePath
    $shortcut.WorkingDirectory = $resolvedInstall
    $shortcut.IconLocation = $exePath
    $shortcut.Save()
}

Write-Host ""
Write-Host "Instalacao concluida em: $resolvedInstall"
Write-Host "Executavel: $exePath"
