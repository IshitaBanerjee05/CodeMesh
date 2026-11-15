$ErrorActionPreference = "Stop"
$version = "0.29.4"
$base = "https://cdn.jsdelivr.net/pyodide/v$version/full/"
$dir = Join-Path $PSScriptRoot "..\apps\desktop\src\renderer\pyodide"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$files = @("pyodide.mjs", "pyodide.asm.js", "pyodide.asm.wasm", "pyodide-lock.json", "python_stdlib.zip")
foreach ($f in $files) { Write-Host "Downloading $f ..."; Invoke-WebRequest -Uri ($base + $f) -OutFile (Join-Path $dir $f) }
Write-Host "Pyodide $version is ready in $dir"
