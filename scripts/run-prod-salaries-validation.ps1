param(
  [string]$BaseUrl = "https://reviewly-ma.vercel.app"
)

$ErrorActionPreference = "Stop"

Write-Host "Running salary policy + digest auth unit checks..."
npm run test:unit -- src/app/actions/__tests__/salary-alerts.test.ts src/lib/__tests__/salary-policy.test.ts src/app/api/cron/salary-digest/__tests__/route.test.ts

Write-Host "Running production salaries critical smoke tests against $BaseUrl ..."
$env:PLAYWRIGHT_BASE_URL = $BaseUrl
npm run test:e2e:prod:salaries

Write-Host "Salaries validation completed."
