$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = Split-Path -Parent $PSScriptRoot
$expectedNode = (Get-Content -LiteralPath (Join-Path $projectRoot '.node-version') -Raw).Trim()

foreach ($command in @('git.exe', 'node.exe', 'npm.cmd')) {
    $resolved = Get-Command $command -ErrorAction Stop
    Write-Output ($command + ': ' + $resolved.Source)
}

$nodeVersion = (& node.exe --version).Trim()
if ($LASTEXITCODE -ne 0 -or $nodeVersion -ne ('v' + $expectedNode)) {
    throw "Se requiere Node $expectedNode; se ha encontrado $nodeVersion."
}
Write-Output ('Node: ' + $nodeVersion)
& npm.cmd --version
if ($LASTEXITCODE -ne 0) { throw 'npm no responde.' }
& git.exe --version
if ($LASTEXITCODE -ne 0) { throw 'Git no responde.' }

$insideRepository = & git.exe -C $projectRoot rev-parse --is-inside-work-tree
if ($LASTEXITCODE -ne 0 -or $insideRepository -ne 'true') { throw 'No es un repositorio Git.' }
$origin = & git.exe -C $projectRoot remote get-url origin
if ($LASTEXITCODE -ne 0 -or $origin -ne 'https://github.com/devel8ping-code/wow-forever-addons.git') {
    throw 'El remoto origin no coincide con el proyecto web.'
}

Write-Output 'Entorno local correcto.'
Write-Output 'Este chequeo no valida permisos de escritura en GitHub ni servicios externos.'
