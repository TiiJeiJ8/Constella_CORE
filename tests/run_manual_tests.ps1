<#
Manual test runner for Windows PowerShell.
Usage: Open PowerShell in repository `server` folder and run:
    ./tests/run_manual_tests.ps1
#>

Write-Host "== Manual integration tests for Constella server =="

function Invoke-Register {
    param($username, $email, $password)
    $body = @{ username=$username; email=$email; password=$password } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/v1/auth/register' -Body $body -ContentType 'application/json'
}

function Invoke-Login {
    param($email, $password)
    $body = @{ email=$email; password=$password } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/v1/auth/login' -Body $body -ContentType 'application/json'
}

Write-Host "Registering sample user..."
Invoke-Register -username 'alice' -email 'alice@example.com' -password 'secret123' | ConvertTo-Json | Write-Host

$login = Invoke-Login -email 'alice@example.com' -password 'secret123'
Write-Host "Login response:" ($login | ConvertTo-Json)

if ($login -and $login.token) {
    $token = $login.token
    Write-Host "Calling /api/v1/me with token..."
    Invoke-RestMethod -Method Get -Uri 'http://localhost:3000/api/v1/me' -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json | Write-Host
} else {
    Write-Host "No token, skipping /me test"
}
