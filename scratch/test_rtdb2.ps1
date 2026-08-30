Write-Host "=== Testing Legacy Realtime Database REST API ==="
try {
    $uri = "https://motigo-3505f.firebaseio.com/registered_users.json"
    $r = Invoke-WebRequest -Uri $uri -UseBasicParsing -ErrorAction Stop
    Write-Host "Status: $($r.StatusCode)"
    Write-Host "Content: $($r.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
