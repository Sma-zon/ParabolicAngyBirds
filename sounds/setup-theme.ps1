# Copies YOUR theme MP3 into the exact filename the game loads first.
# Run from PowerShell:  cd sounds ; .\setup-theme.ps1
# Or pass a path:        .\setup-theme.ps1 -Source "C:\Users\you\Music\02. Angry Birds Theme.mp3"

param(
    [Parameter(Mandatory = $false)]
    [string] $Source
)

$ErrorActionPreference = 'Stop'
$dest = Join-Path $PSScriptRoot '02-angry-birds-theme.mp3'

if (-not $Source) {
    Add-Type -AssemblyName System.Windows.Forms | Out-Null
    $dlg = New-Object System.Windows.Forms.OpenFileDialog
    $dlg.Filter = 'MP3 files (*.mp3)|*.mp3|All files (*.*)|*.*'
    $dlg.Title = 'Choose your background theme MP3'
    if ($dlg.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
        Write-Host 'Cancelled.'
        exit 1
    }
    $Source = $dlg.FileName
}

if (-not (Test-Path -LiteralPath $Source)) {
    Write-Error "Source not found: $Source"
    exit 1
}

Copy-Item -LiteralPath $Source -Destination $dest -Force
Write-Host "Installed theme as:"
Write-Host "  $dest"
Write-Host 'Refresh the game in the browser (hard refresh: Ctrl+F5), then click once on the page to start audio.'
