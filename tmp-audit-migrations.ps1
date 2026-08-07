$files = Get-ChildItem supabase/migrations/*.sql | Where-Object { $_.Name -match '^2026(0[5-9]|1[0-2])' }
foreach($f in $files) {
    $ver = $f.Name.Substring(0,14)
    $content = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
    if(-not $content){continue}
    $tables = [regex]::Matches($content, 'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)', 'IgnoreCase')
    foreach($m in $tables) { Write-Output "TABLE:${ver}:$($m.Groups[1].Value)" }
    $cols = [regex]::Matches($content, 'ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?(\w+)\s+ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?(\w+)', 'IgnoreCase')
    foreach($m in $cols) { Write-Output "COLUMN:${ver}:$($m.Groups[1].Value).$($m.Groups[2].Value)" }
}
