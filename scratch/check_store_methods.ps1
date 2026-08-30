$uiContent = Get-Content -Path "js/ui.js" -Raw
$stateContent = Get-Content -Path "js/state.js" -Raw

# Match all store.methodName(...)
$matches = [regex]::Matches($uiContent, "store\.([A-Za-z0-9_$]+)\s*\(")
$calledMethods = @()
foreach ($m in $matches) {
    $calledMethods += $m.Groups[1].Value
}
$calledMethods = $calledMethods | Select-Object -Unique

Write-Host "Found $($calledMethods.Count) method calls on 'store' in ui.js:"

foreach ($method in $calledMethods) {
    # Check if method is defined in state.js
    if ($stateContent -match "$method\s*\(") {
        Write-Host "  ✅ $method - Found in state.js"
    } else {
        Write-Host "  ❌ MISSING! $method - NOT FOUND IN state.js!"
    }
}
