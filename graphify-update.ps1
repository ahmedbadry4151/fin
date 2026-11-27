# Refresh the graphify knowledge graph to the latest project state.
# Run: powershell -ExecutionPolicy Bypass -File ".\graphify-update.ps1"

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

# Resolve a Python interpreter (py launcher is the usual Windows entry point).
$python = $null
foreach ($candidate in @('py', 'python3', 'python')) {
    if (Get-Command $candidate -ErrorAction SilentlyContinue) {
        $python = $candidate
        break
    }
}
if (-not $python) { throw 'No Python interpreter found. Install Python first.' }

Write-Host "Python interpreter: $python"
& $python -m pip install --upgrade graphifyy
if ($LASTEXITCODE -ne 0) { throw 'Failed to upgrade graphifyy.' }

# Locate the installed graphify CLI.
$scriptsDir = & $python -c "import sysconfig; print(sysconfig.get_path('scripts'))"
$graphify = Join-Path $scriptsDir 'graphify.exe'
if (-not (Test-Path -LiteralPath $graphify)) { $graphify = 'graphify' }

Write-Host 'Updating the knowledge graph from the latest project state...'
& $graphify update .
if ($LASTEXITCODE -ne 0) { throw 'graphify update failed.' }

Write-Host 'Done. Outputs are in graphify-out/ (graph.json, GRAPH_REPORT.md, graph.html).'
