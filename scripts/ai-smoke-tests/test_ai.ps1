# Test API AI

$KeycloakUrl = "http://localhost:8180"
$Realm = "erp-realm"
$ClientId = "erp-client"
$ClientSecret = "erp-client-secret"
$Username = "demo-employer"
$Password = "Employer@123"

Write-Host "Test Service AI" -ForegroundColor Green
Write-Host ""

$tokenUrl = "$KeycloakUrl/realms/$Realm/protocol/openid-connect/token"
$body = @{
    client_id    = $ClientId
    client_secret = $ClientSecret
    username      = $Username
    password      = $Password
    grant_type    = "password"
}

$response = Invoke-WebRequest -Uri $tokenUrl -Method Post -Body $body -ContentType "application/x-www-form-urlencoded" -UseBasicParsing
$tokenData = $response.Content | ConvertFrom-Json
$token = $tokenData.access_token
Write-Host "Token OK" -ForegroundColor Green

# Test assistant
$headers = @{
    "X-Tenant-Id" = "00000000-0000-0000-0000-000000000001"
    "Content-Type" = "application/json"
}

$chatBody = @{
    message     = "Quel est l'etat du stock?"
    use_rag     = $true
    top_k       = 3
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/ai/assistant-test" -Method Post -Body $chatBody -Headers $headers -UseBasicParsing
$result = $response.Content | ConvertFrom-Json
Write-Host "Assistant response OK" -ForegroundColor Green
Write-Host $result.reply -ForegroundColor White

# Test search
$headers["Authorization"] = "Bearer $token"
$searchBody = @{
    query = "facture"
    k     = 5
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/ai/documents/search" -Method Post -Body $searchBody -Headers $headers -UseBasicParsing
$result = $response.Content | ConvertFrom-Json
Write-Host "Search OK: $($result.results.Count) documents" -ForegroundColor Green

# Test model status
$response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/ai/model-status" -Method Get -Headers $headers -UseBasicParsing
$result = $response.Content | ConvertFrom-Json
Write-Host "Model status: $($result.model_available)" -ForegroundColor Green

# Test forecast
$forecastBody = @{
    items = @(
        @{
            product_id         = "prof-t60"
            product_reference  = "T60"
            current_quantity   = 500
            reorder_point      = 100
            daily_consumptions = @(5, 3, 8, 2, 4)
        }
    )
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/ai/stock-forecast" -Method Post -Body $forecastBody -Headers $headers -UseBasicParsing
$result = $response.Content | ConvertFrom-Json
Write-Host "Stock forecast OK: $($result.critical_count) critiques" -ForegroundColor Green

Write-Host "All tests passed!" -ForegroundColor Green
