# Salaries Post-Release QA Evidence

## Environment
- Base URL:
- Date/time:
- Tester:
- Commit SHA:

## Automated results
- `npm run validate:prod:salaries`:
- Report path:

## Screenshots
1. Logged-out `/salaires` preview:
2. Logged-out `/salaires/comparaison` preview:
3. Logged-out dynamic role/sector page:
4. Logged-in unlocked salary screen:
5. `/dashboard/salary-alerts`:

## API evidence
1. `GET /api/cron/salary-digest` unauthorized:
2. `GET /api/cron/salary-digest` authorized:
3. Re-run digest in same week (dedupe):

## DB evidence
1. `salary_alert_subscriptions` sample rows:
2. `notifications` rows where `type='salary_update'`:
3. `notifications` rows where `type='salary_digest_weekly'`:
4. Trigger/policy/index/constraint outputs:

## Moderation trace
1. Pending salary ID:
2. Published by admin:
3. Resulting notification IDs:

## Acceptance checklist
- [ ] Public sensitive values gated
- [ ] Sample threshold behavior correct
- [ ] Submission/moderation/alerts stable
- [ ] 50-alert cap enforced
- [ ] Digest auth + dedupe verified
- [ ] No navigation regressions

## Issues found
1.

## Hotfix actions (if needed)
1.

