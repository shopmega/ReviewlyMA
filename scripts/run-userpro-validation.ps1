param(
  [string]$BaseUrl = "https://reviewly-ma.vercel.app"
)

$ErrorActionPreference = "Stop"

Write-Host "Running focused user/pro unit validations..."
npm run test:unit -- src/app/actions/__tests__/business-crud.test.ts src/app/actions/__tests__/support.test.ts

Write-Host "Running production user/pro E2E critical smoke tests against $BaseUrl ..."
$env:PLAYWRIGHT_BASE_URL = $BaseUrl
npm run test:e2e:prod:userpro

Write-Host "User/pro validation completed."
