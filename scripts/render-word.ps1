param([Parameter(Mandatory=$true)][string]$InputDocx,[Parameter(Mandatory=$true)][string]$OutputPdf)
$ErrorActionPreference = 'Stop'
$word = $null
$document = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $word.AutomationSecurity = 3
    $document = $word.Documents.Open($InputDocx, $false, $false, $false)
    $document.Fields.Update() | Out-Null
    foreach ($section in $document.Sections) {
        foreach ($footer in $section.Footers) { $footer.Range.Fields.Update() | Out-Null }
        foreach ($header in $section.Headers) { $header.Range.Fields.Update() | Out-Null }
    }
    $document.Repaginate()
    $document.Save()
    $document.ExportAsFixedFormat($OutputPdf, 17)
} finally {
    if ($null -ne $document) { $document.Close(0) | Out-Null; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($document) }
    if ($null -ne $word) { $word.Quit() | Out-Null; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
}
