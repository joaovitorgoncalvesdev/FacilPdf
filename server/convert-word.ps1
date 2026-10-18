param([Parameter(Mandatory=$true)][string]$InputFile,[Parameter(Mandatory=$true)][string]$OutputFile)
$ErrorActionPreference = 'Stop'
$wordApp = $null
$wordDoc = $null
try {
    $wordApp = New-Object -ComObject Word.Application
    $wordApp.Visible = $false
    $wordApp.DisplayAlerts = 0
    $wordApp.AutomationSecurity = 3
    $wordDoc = $wordApp.Documents.Open($InputFile, $false, $true, $false)
    $wordDoc.ExportAsFixedFormat($OutputFile, 17)
} finally {
    if ($null -ne $wordDoc) { $wordDoc.Close(0); [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($wordDoc) | Out-Null }
    if ($null -ne $wordApp) { $wordApp.Quit(); [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($wordApp) | Out-Null }
}
