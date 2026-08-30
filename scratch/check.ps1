Write-Host "=== Analyzing JS Imports and Exports ==="
$jsFiles = Get-ChildItem -Path "js" -Filter "*.js"

$exportMap = @{}

foreach ($file in $jsFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    $exportedNames = @()
    
    # Match export function/class/const
    $matches1 = [regex]::Matches($content, "export\s+(?:function|class|const|let|var)\s+([A-Za-z0-9_$]+)")
    foreach ($m in $matches1) { $exportedNames += $m.Groups[1].Value }

    # Match export { a, b }
    $matches2 = [regex]::Matches($content, "export\s+\{([^}]+)\}")
    foreach ($m in $matches2) {
        $raw = $m.Groups[1].Value
        $items = $raw -split ","
        foreach ($it in $items) {
            $name = ($it.Trim() -split "\s+as\s+")[0].Trim()
            if ($name) { $exportedNames += $name }
        }
    }
    
    $exportMap[$file.Name] = $exportedNames
    Write-Host "$($file.Name) exports: $($exportedNames -join ', ')"
}

Write-Host "`n=== Verifying Import Statements ==="
foreach ($file in $jsFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    $matches = [regex]::Matches($content, "import\s+\{([^}]+)\}\s+from\s+['""]\./([^'""]+)['""]")
    foreach ($m in $matches) {
        $importsRaw = $m.Groups[1].Value
        $targetFile = $m.Groups[2].Value
        
        $importedNames = $importsRaw -split ","
        foreach ($imp in $importedNames) {
            $cleanImp = ($imp.Trim() -split "\s+as\s+")[0].Trim()
            if ($cleanImp -and $exportMap.ContainsKey($targetFile)) {
                $targetExports = $exportMap[$targetFile]
                if (-not ($targetExports -contains $cleanImp)) {
                    Write-Host "❌ ERROR in $($file.Name): '$cleanImp' is imported from './$targetFile', BUT '$cleanImp' IS NOT EXPORTED BY './$targetFile'!"
                }
            }
        }
    }
}
Write-Host "=== Check Complete ==="
