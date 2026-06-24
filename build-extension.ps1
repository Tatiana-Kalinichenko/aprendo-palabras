param(
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$buildDir = Join-Path $root "build"
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

if (-not $OutputPath) {
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutputPath = Join-Path $buildDir "aprendo-palabras-extension-test-$timestamp.zip"
}

if (Test-Path $OutputPath) {
  Remove-Item -LiteralPath $OutputPath
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$uiIconFiles = Get-ChildItem -LiteralPath (Join-Path $root "icons\ui") -Filter "*.svg" -File |
  Sort-Object Name |
  ForEach-Object { "icons/ui/$($_.Name)" }

$fontFiles = Get-ChildItem -LiteralPath (Join-Path $root "fonts") -Filter "*.woff2" -File |
  Sort-Object Name |
  ForEach-Object { "fonts/$($_.Name)" }

$files = @(
  "manifest.json",
  "background.js",
  "app.html",
  "app.js",
  "extension-i18n.js",
  "styles.css",
  "study-mini.html",
  "study-mini.js",
  "study-mini.css",
  "context-card.html",
  "context-card.js",
  "context-card.css",
  "icons/icon16.png",
  "icons/icon32.png",
  "icons/icon48.png",
  "icons/icon128.png",
  "_locales/uk/messages.json",
  "_locales/en/messages.json"
) + $uiIconFiles + $fontFiles

$zip = [System.IO.Compression.ZipFile]::Open($OutputPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($relativePath in $files) {
    $sourcePath = Join-Path $root ($relativePath -replace "/", [System.IO.Path]::DirectorySeparatorChar)
    if (-not (Test-Path $sourcePath)) {
      throw "Missing build input: $relativePath"
    }

    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip,
      $sourcePath,
      $relativePath,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
} finally {
  $zip.Dispose()
}

Write-Output $OutputPath
