$headers = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyeGdtaHhobXh0emZ3dWllYmxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0NjkxMiwiZXhwIjoyMDg0NDIyOTEyfQ.SGfXH8rWFfM0ExMtw_3MueLrNOn8eKA5bTaoVQ7-IdA'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyeGdtaHhobXh0emZ3dWllYmxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0NjkxMiwiZXhwIjoyMDg0NDIyOTEyfQ.SGfXH8rWFfM0ExMtw_3MueLrNOn8eKA5bTaoVQ7-IdA'
}
$base = 'https://irxgmhxhmxtzfwuieblc.supabase.co/rest/v1'

try {
    $r = Invoke-RestMethod -Uri "$base/organizations?select=id&limit=1" -Headers $headers -TimeoutSec 30
    Write-Host "CONNECTED"
    Write-Host ($r | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}
