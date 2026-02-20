param(
  [string]$BaseUrl = "https://reviewly-ma.vercel.app"
)

$ErrorActionPreference = "Stop"

Write-Host "Running focused unit validations..."
npm run test:unit -- src/app/actions/__tests__/admin-settings.test.ts src/app/actions/__tests__/admin-bulk.test.ts src/app/actions/__tests__/admin-payments.test.ts src/app/actions/__tests__/support.test.ts

Write-Host "Running production E2E critical smoke tests against $BaseUrl ..."
$env:PLAYWRIGHT_BASE_URL = $BaseUrl
npm run test:e2e:prod:critical

Write-Host "Validation completed."
