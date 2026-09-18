param([string]$ToolRoot = 'D:\firefox download\app\微信web开发者工具')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot
$compilerRoot = Join-Path $ToolRoot 'resources\app.asar.unpacked\node_modules\wcc-exec'
$wxmlFiles = @(Get-ChildItem pages,components -Filter *.wxml -Recurse | ForEach-Object { $_.FullName.Substring($projectRoot.Length + 1).Replace('\','/') })
$outputPath = Join-Path $env:TEMP 'ongoing-wxml-compiled.js'
& (Join-Path $compilerRoot 'wcc.exe') -o $outputPath @wxmlFiles
if ($LASTEXITCODE -ne 0) { throw 'WXML compilation failed' }
Write-Output ('WXML compiled: ' + $wxmlFiles.Count + ' templates')
$wxssFiles = @('app.wxss') + @(Get-ChildItem pages,components -Filter *.wxss -Recurse | ForEach-Object { $_.FullName.Substring($projectRoot.Length + 1).Replace('\','/') })
$styleOutput = Join-Path $env:TEMP 'ongoing-wxss-compiled.js'
& (Join-Path $compilerRoot 'wcsc.exe') -o $styleOutput @wxssFiles
if ($LASTEXITCODE -ne 0) { throw 'WXSS compilation failed' }
Write-Output ('WXSS compiled: ' + $wxssFiles.Count + ' stylesheets')
