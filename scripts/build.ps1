param(
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

function New-IcoFromPng {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PngPath,
        [Parameter(Mandatory = $true)]
        [string]$IcoPath
    )

    $pngFile = Get-Item -LiteralPath $PngPath
    if ((Test-Path $IcoPath) -and ((Get-Item -LiteralPath $IcoPath).LastWriteTimeUtc -ge $pngFile.LastWriteTimeUtc)) {
        return
    }

    $pngBytes = [System.IO.File]::ReadAllBytes($pngFile.FullName)
    if ($pngBytes.Length -lt 24) {
        throw "PNG invalido para gerar icone: $PngPath"
    }

    $pngSignature = 137,80,78,71,13,10,26,10
    for ($i = 0; $i -lt $pngSignature.Length; $i++) {
        if ($pngBytes[$i] -ne $pngSignature[$i]) {
            throw "Arquivo nao e um PNG valido: $PngPath"
        }
    }

    $widthValue = ($pngBytes[16] -shl 24) -bor ($pngBytes[17] -shl 16) -bor ($pngBytes[18] -shl 8) -bor $pngBytes[19]
    $heightValue = ($pngBytes[20] -shl 24) -bor ($pngBytes[21] -shl 16) -bor ($pngBytes[22] -shl 8) -bor $pngBytes[23]
    $width = [Math]::Min($widthValue, 255)
    $height = [Math]::Min($heightValue, 255)

    $iconDir = New-Object byte[] 6
    $iconDir[2] = 1
    $iconDir[4] = 1

    $entry = New-Object byte[] 16
    $entry[0] = if ($width -ge 255) { 0 } else { [byte]$width }
    $entry[1] = if ($height -ge 255) { 0 } else { [byte]$height }
    $entry[6] = 1
    $entry[7] = 32
    [System.BitConverter]::GetBytes([int]$pngBytes.Length).CopyTo($entry, 8)
    [System.BitConverter]::GetBytes(22).CopyTo($entry, 12)

    $directory = Split-Path -Parent $IcoPath
    if ($directory -and -not (Test-Path $directory)) {
        New-Item -ItemType Directory -Path $directory | Out-Null
    }

    $stream = [System.IO.File]::Open($IcoPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
    try {
        $stream.Write($iconDir, 0, $iconDir.Length)
        $stream.Write($entry, 0, $entry.Length)
        $stream.Write($pngBytes, 0, $pngBytes.Length)
    }
    finally {
        $stream.Dispose()
    }
}

function Copy-PreservedItem {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourcePath,
        [Parameter(Mandatory = $true)]
        [string]$DestinationPath
    )

    if (-not (Test-Path $SourcePath)) {
        return
    }

    $item = Get-Item -LiteralPath $SourcePath
    if ($item.PSIsContainer) {
        New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
        Get-ChildItem -LiteralPath $SourcePath -Force | ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination $DestinationPath -Recurse -Force
        }
        return
    }

    $destinationDir = Split-Path -Parent $DestinationPath
    if ($destinationDir -and -not (Test-Path $destinationDir)) {
        New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
    }

    Copy-Item -LiteralPath $SourcePath -Destination $DestinationPath -Force
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot
$distRoot = Join-Path $projectRoot "dist"
$appRoot = Join-Path $distRoot "OAJ"
$venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"
$tempBuildRoot = Join-Path $env:TEMP ("OAJ-pyinstaller-" + [guid]::NewGuid().ToString("N"))
$tempDistRoot = Join-Path $tempBuildRoot "dist"
$tempWorkRoot = Join-Path $tempBuildRoot "build"
$tempAppRoot = Join-Path $tempDistRoot "OAJ"
$preserveRoot = Join-Path $tempBuildRoot "preserve"

if (Test-Path $venvPython) {
    $python = $venvPython
} else {
    $python = "python"
}

if ($Clean) {
    foreach ($path in @((Join-Path $projectRoot "build"), $appRoot)) {
        if (Test-Path $path) {
            Remove-Item -LiteralPath $path -Recurse -Force
        }
    }
}

foreach ($path in @($tempBuildRoot, $distRoot)) {
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path | Out-Null
    }
}

$pngIconPath = Join-Path $projectRoot "assets\images\image.png"
$icoIconPath = Join-Path $projectRoot "assets\images\image.ico"
if (-not (Test-Path $pngIconPath)) {
    throw "Imagem do icone nao encontrada em: $pngIconPath"
}
New-IcoFromPng -PngPath $pngIconPath -IcoPath $icoIconPath

$specPath = Join-Path $projectRoot "packaging\OAJ.spec"
& $python -m PyInstaller --noconfirm --distpath $tempDistRoot --workpath $tempWorkRoot $specPath

if (-not (Test-Path $tempAppRoot)) {
    throw "Build concluido sem gerar $tempAppRoot."
}

if (Test-Path $preserveRoot) {
    Remove-Item -LiteralPath $preserveRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $preserveRoot | Out-Null

foreach ($name in @("db_config.json", "pdfs", "app_data")) {
    $sourcePath = Join-Path $appRoot $name
    if (Test-Path $sourcePath) {
        Copy-PreservedItem -SourcePath $sourcePath -DestinationPath (Join-Path $preserveRoot $name)
    }
}

if (-not (Test-Path $appRoot)) {
    New-Item -ItemType Directory -Path $appRoot | Out-Null
}

Get-ChildItem -LiteralPath $tempAppRoot -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $appRoot -Recurse -Force
}

foreach ($dirName in @("pdfs", "app_data")) {
    $dirPath = Join-Path $appRoot $dirName
    if (-not (Test-Path $dirPath)) {
        New-Item -ItemType Directory -Path $dirPath | Out-Null
    }
}

$localConfig = Join-Path $projectRoot "db_config.json"
$distConfig = Join-Path $appRoot "db_config.json"
$distConfigExample = Join-Path $appRoot "db_config.example.json"
$projectConfigExample = Join-Path $projectRoot "db_config.example.json"

if ((Test-Path (Join-Path $preserveRoot "db_config.json")) -and -not (Test-Path $distConfig)) {
    Copy-PreservedItem -SourcePath (Join-Path $preserveRoot "db_config.json") -DestinationPath $distConfig
}

foreach ($dirName in @("pdfs", "app_data")) {
    $preservedDir = Join-Path $preserveRoot $dirName
    $targetDir = Join-Path $appRoot $dirName
    if (Test-Path $preservedDir) {
        Copy-Item -LiteralPath (Join-Path $preservedDir "*") -Destination $targetDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

if ((Test-Path $localConfig) -and -not (Test-Path $distConfig)) {
    Copy-Item -LiteralPath $localConfig -Destination $distConfig
}

if ((Test-Path $projectConfigExample) -and -not (Test-Path $distConfigExample)) {
    Copy-Item -LiteralPath $projectConfigExample -Destination $distConfigExample
}

if (-not (Test-Path $distConfig) -and (Test-Path $projectConfigExample)) {
    Copy-Item -LiteralPath $projectConfigExample -Destination $distConfig
}

Write-Host ""
Write-Host "Compilado gerado em: $appRoot"
Write-Host "Executavel: $(Join-Path $appRoot 'OAJ.exe')"

if (Test-Path $tempBuildRoot) {
    Remove-Item -LiteralPath $tempBuildRoot -Recurse -Force -ErrorAction SilentlyContinue
}
