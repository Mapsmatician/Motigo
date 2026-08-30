$uiContent = Get-Content -Path "js/ui.js" -Raw
$stateContent = Get-Content -Path "js/state.js" -Raw

# Match all store.propertyName (excluding methods)
$matches = [regex]::Matches($uiContent, "store\.([A-Za-z0-9_$]+)")
$props = @()
foreach ($m in $matches) {
    $name = $m.Groups[1].Value
    if ($name -notmatch "^\(") {
        $props += $name
    }
}
$props = $props | Select-Object -Unique

Write-Host "Found $($props.Count) property references on 'store' in ui.js:"

foreach ($p in $props) {
    if ($stateContent -match "$p") {
        Write-Host "  ✅ $p - Found in state.js"
    } else {
        Write-Host "  ❌ MISSING! $p - NOT FOUND IN state.js!"
    }
}
