Write-Host "=== Searching for await keywords in js/ directory ==="
$jsFiles = Get-ChildItem -Path "js" -Filter "*.js"

foreach ($file in $jsFiles) {
    $lines = Get-Content -Path $file.FullName
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line -match "\bawait\b") {
            Write-Host "$($file.Name): Line $($i+1): $($line.Trim())"
        }
    }
}
