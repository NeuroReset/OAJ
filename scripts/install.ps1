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

function Copy-IfMissing {
    param(
        [string]$SourcePath,
        [string]$DestinationPath
    )

    if ((Test-Path $SourcePath) -and -not (Test-Path $DestinationPath)) {
        $destinationDir = Split-Path -Parent $DestinationPath
        if ($destinationDir -and -not (Test-Path $destinationDir)) {
            New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
        }
        Copy-Item -LiteralPath $SourcePath -Destination $DestinationPath -Force
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
$dataRoot = Join-Path $env:LOCALAPPDATA "OAJ"
$dataPreserveRoot = Join-Path $env:TEMP "OAJ-install-data-preserve"

if (-not (Test-Path $resolvedSource)) {
    throw "Pasta de origem nao encontrada: $resolvedSource"
}

if (Test-Path $preserveRoot) {
    Remove-Item -LiteralPath $preserveRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $preserveRoot | Out-Null

if (Test-Path $dataPreserveRoot) {
    Remove-Item -LiteralPath $dataPreserveRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $dataPreserveRoot | Out-Null

if (-not (Test-Path $dataRoot)) {
    New-Item -ItemType Directory -Path $dataRoot -Force | Out-Null
}

foreach ($name in @("db_config.json", "pdfs", "app_data")) {
    $itemPath = Join-Path $dataRoot $name
    if (Test-Path $itemPath) {
        Copy-Item -LiteralPath $itemPath -Destination (Join-Path $dataPreserveRoot $name) -Recurse -Force
    }
}

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
    $targetDir = Join-Path $dataRoot $name
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
}

$distConfig = Join-Path $dataRoot "db_config.json"
$exampleConfig = Join-Path $resolvedInstall "db_config.example.json"

Copy-IfMissing -SourcePath (Join-Path $dataPreserveRoot "db_config.json") -DestinationPath $distConfig
Copy-IfMissing -SourcePath (Join-Path $preserveRoot "db_config.json") -DestinationPath $distConfig
Copy-IfMissing -SourcePath (Join-Path $resolvedSource "db_config.json") -DestinationPath $distConfig

foreach ($name in @("pdfs", "app_data")) {
    Copy-PreservedContent -PreservePath (Join-Path $dataPreserveRoot $name) -TargetPath (Join-Path $dataRoot $name)
    Copy-PreservedContent -PreservePath (Join-Path $preserveRoot $name) -TargetPath (Join-Path $dataRoot $name)
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
