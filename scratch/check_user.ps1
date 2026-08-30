$content = Get-Content -Path "js/ui.js" -Raw
$matches = [regex]::Matches($content, "store\.user\.[A-Za-z0-9_$]+")
Write-Host "Found $($matches.Count) unsafe store.user property accesses in ui.js:"
foreach ($m in $matches) {
    Write-Host "  - $($m.Value)"
}
