$ErrorActionPreference = 'Stop'
$qa = Join-Path (Get-Location) 'tmp/pdfs/wps/generated'
New-Item -ItemType Directory -Force -Path $qa | Out-Null
$python = 'C:/Users/Roy/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$sourceRoot = 'C:/Users/Roy/Documents/ipi format'
$formats = @('FG','MISC','RM','RMQA','SFG','SFGQA','STAB')
$fields = @{
  analyst='VISUAL QA ONLY'; 'batch.size'='25,000 units (3 drums)'
  'd.release'='09/30/2026'; 'date.mfd'='08/15/2026'; 'exp.date'='08/14/2028'
  'fill.vol'='60 mL'; mic='VISUAL QA ONLY'
  'overall.remarks'='VISUAL QA ONLY — no actual laboratory result'; page='123'; remarks='VISUAL QA ONLY'
  'requested.by'='QA Example Requester'; 'sample.batch'='QA-LOT-260930'
  'sample.category'='VISUAL QA ONLY'; 'sample.ml'='QA-ML-0001'
  'sample.name'='VISUAL QA ONLY SAMPLE — EXTENDED SAMPLE NAME FOR WRAP CHECK'
  'sample.name.suffix'='Long descriptive suffix for layout checking'
  'sample.received'='09/30/2026 @ 07:35 AM'; 't.release'='08:15 AM'
  type='VISUAL QA ONLY'
}
$tests = @('Standard Plate Count (SPC)','Molds and Yeast','Salmonella','P. aeruginosa','S. aureus','C. albicans')
$rows = @()
for ($i = 0; $i -lt $tests.Count; $i++) {
  $rows += @{ index=$i; test=$tests[$i]; criterion='VISUAL QA SPECIFICATION — WRAP CHECK'; value='VISUAL QA ONLY — EXAMPLE VALUE'; remarks='VISUAL QA ONLY' }
}
$summary = foreach ($name in $formats) {
  $payload = @{ fields=$fields; rows=$rows } | ConvertTo-Json -Depth 8
  $json = Join-Path $qa ($name + '.json')
  $docx = Join-Path $qa ($name + ' - VISUAL QA ONLY.docx')
  Set-Content -LiteralPath $json -Value $payload -Encoding utf8
  & $python worker/docx_worker.py generate --input (Join-Path $sourceRoot ($name + '.docx')) --payload $json --output $docx | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Worker generation failed for $name" }
  $inventory = & $python worker/docx_worker.py inventory --input $docx | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw "Worker inspection failed for $name" }
  $serialized = $inventory | ConvertTo-Json -Depth 24 -Compress
  $remaining = [regex]::Matches($serialized, '\{\{[^}]+\}\}') | ForEach-Object Value | Sort-Object -Unique
  [pscustomobject]@{ Template=$name; Generated=(Test-Path $docx); RemainingTokens=($remaining -join ', '); Bytes=(Get-Item $docx).Length }
}
$summary | Format-List
