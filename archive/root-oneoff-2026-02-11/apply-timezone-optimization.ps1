# Apply timezone optimization to Supabase database (PowerShell version)

Write-Host "🚀 Applying timezone optimization to reduce pg_timezone_names query overhead..." -ForegroundColor Green

# Check if environment variables are set
if (-not $env:NEXT_PUBLIC_SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "❌ Environment variables not set. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Red
    exit 1
}

# Extract project ID from URL
$PROJECT_ID = $env:NEXT_PUBLIC_SUPABASE_URL -replace 'https://(.*).supabase.co', '$1'

Write-Host "📦 Project ID: $PROJECT_ID" -ForegroundColor Yellow

# Read the SQL file
$SQL_CONTENT = Get-Content -Path "supabase\optimize-timezone-queries.sql" -Raw

# Apply the optimization migration
Write-Host "🔧 Applying timezone optimization migration..." -ForegroundColor Yellow

$BODY = @{
    sql = $SQL_CONTENT
} | ConvertTo-Json

try {
    $RESPONSE = Invoke-RestMethod -Uri "https://$PROJECT_ID.supabase.co/rest/v1/rpc/execute_sql" `
        -Method POST `
        -Headers @{
            "apikey" = $env:SUPABASE_SERVICE_ROLE_KEY
            "Authorization" = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
            "Content-Type" = "application/json"
        } `
        -Body $BODY

    Write-Host "✅ Timezone optimization applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run performance tests to verify improvements" -ForegroundColor White
    Write-Host "2. Monitor Supabase query logs to confirm pg_timezone_names calls have decreased" -ForegroundColor White
    Write-Host "3. Test page load times for categories, businesses, and villes pages" -ForegroundColor White
    Write-Host ""
    Write-Host "🧪 To test performance improvements, run:" -ForegroundColor Cyan
    Write-Host "   node performance-test.js" -ForegroundColor White
    Write-Host "   node run-load-test.js" -ForegroundColor White

} catch {
    Write-Host "❌ Failed to apply timezone optimization: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}