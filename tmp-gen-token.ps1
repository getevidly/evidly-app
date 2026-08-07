$svc = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyeGdtaHhobXh0emZ3dWllYmxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0NjkxMiwiZXhwIjoyMDg0NDIyOTEyfQ.SGfXH8rWFfM0ExMtw_3MueLrNOn8eKA5bTaoVQ7-IdA"
$anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyeGdtaHhobXh0emZ3dWllYmxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDY5MTIsImV4cCI6MjA4NDQyMjkxMn0.fkYm3v1dJ8AeFJfr3wsYB3W52OyTEnbtdQa422rqOyY"
$baseUrl = "https://irxgmhxhmxtzfwuieblc.supabase.co"

# Step 1: Generate magic link
$linkResp = Invoke-RestMethod -Uri "$baseUrl/auth/v1/admin/generate_link" -Method POST -Headers @{
    "Authorization" = "Bearer $svc"
    "apikey" = $svc
    "Content-Type" = "application/json"
} -Body (@{type="magiclink"; email="arthur@getevidly.com"} | ConvertTo-Json)

$otp = $linkResp.email_otp
$hashedToken = $linkResp.hashed_token
Write-Host "OTP: $otp"
Write-Host "Hashed token: $hashedToken"

# Step 2: Verify with OTP code
try {
    $verifyResp = Invoke-RestMethod -Uri "$baseUrl/auth/v1/verify" -Method POST -Headers @{
        "apikey" = $anon
        "Content-Type" = "application/json"
    } -Body (@{type="magiclink"; token=$otp; email="arthur@getevidly.com"} | ConvertTo-Json)
    Write-Host "Verify OK"
    $accessToken = $verifyResp.access_token
} catch {
    Write-Host "OTP verify failed: $($_.Exception.Message)"
    # Try with token_hash instead
    try {
        $verifyResp = Invoke-RestMethod -Uri "$baseUrl/auth/v1/verify" -Method POST -Headers @{
            "apikey" = $anon
            "Content-Type" = "application/json"
        } -Body (@{type="magiclink"; token_hash=$hashedToken} | ConvertTo-Json)
        Write-Host "Hash verify OK"
        $accessToken = $verifyResp.access_token
    } catch {
        Write-Host "Hash verify also failed: $($_.Exception.Message)"
        $accessToken = $null
    }
}

if ($accessToken) {
    Write-Host "Got access token: $($accessToken.Substring(0, 50))..."

    # Step 3: Call create-client-invite
    $inviteBody = @{
        organization_id = "0dcd5d5e-ea75-4264-9a0b-7c9e8cdb4136"
        organization_name = "Test Kitchen (smoke)"
        contact_name = "Test User"
        email = "arthur@getevidly.com"
        client_role = "owner_operator"
        sender_name = "Arthur"
    } | ConvertTo-Json

    try {
        $inviteResp = Invoke-RestMethod -Uri "$baseUrl/functions/v1/create-client-invite" -Method POST -Headers @{
            "Authorization" = "Bearer $accessToken"
            "apikey" = $anon
            "Content-Type" = "application/json"
        } -Body $inviteBody
        Write-Host "Invite response:"
        $inviteResp | ConvertTo-Json -Depth 5
    } catch {
        Write-Host "Invite failed: $($_.Exception.Message)"
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $respBody = $reader.ReadToEnd()
        Write-Host "Response body: $respBody"
    }
} else {
    Write-Host "No access token obtained"
}
