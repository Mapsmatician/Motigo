Write-Host "=== Querying Firestore REST API for motigo-3505f ==="
try {
    $uri = "https://firestore.googleapis.com/v1/projects/motigo-3505f/databases/(default)/documents/users"
    $r = Invoke-WebRequest -Uri $uri -UseBasicParsing -ErrorAction Stop
    Write-Host "Status: $($r.StatusCode)"
    Write-Host "Content:"
    Write-Host $r.Content
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $respBody = $reader.ReadToEnd()
        Write-Host "Response Body: $respBody"
    }
}

Write-Host "`n=== Querying admin_user_registry collection ==="
try {
    $uri2 = "https://firestore.googleapis.com/v1/projects/motigo-3505f/databases/(default)/documents/admin_user_registry"
    $r2 = Invoke-WebRequest -Uri $uri2 -UseBasicParsing -ErrorAction Stop
    Write-Host "Status: $($r2.StatusCode)"
    Write-Host "Content:"
    Write-Host $r2.Content
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader2 = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $respBody2 = $reader2.ReadToEnd()
        Write-Host "Response Body: $respBody2"
    }
}
