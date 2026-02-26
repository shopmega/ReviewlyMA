# Salaries Post-Release QA (Production-First)

This runbook implements critical-path validation for salaries:
- public privacy gating
- authenticated unlock behavior
- salary submission/moderation/alerts
- digest API auth + dedupe behavior
- DB contracts for `salary_alert_subscriptions`

## 1) Prerequisites

Set these env vars in your shell before running production checks:

```powershell
$env:PLAYWRIGHT_BASE_URL="https://reviewly-ma.vercel.app"
$env:CRON_SECRET="<prod_cron_secret>"
$env:PLAYWRIGHT_SALARIES_EMAIL="<qa_user_email>"         # optional but recommended
$env:PLAYWRIGHT_SALARIES_PASSWORD="<qa_user_password>"   # optional but recommended
```

Notes:
- Authenticated scenario is auto-skipped if login creds are not set.
- Authorized digest scenario is auto-skipped if `CRON_SECRET` is not set.

## 2) Automated validation commands

Run unit checks + production salaries smoke suite:

```powershell
npm run validate:prod:salaries
```

Or run parts independently:

```powershell
npm run test:unit -- src/lib/__tests__/salary-policy.test.ts src/app/api/cron/salary-digest/__tests__/route.test.ts
npm run test:e2e:prod:salaries
```

## 3) Manual critical checks (must-do)

1. Logged-out pages:
1. `/salaires`
2. `/salaires/comparaison`
3. `/salaires/partager`
4. one `/salaires/role/.../...` route
5. one `/salaires/secteur/.../...` route
2. Confirm sensitive values are gated (`Connectez-vous`) or shown as insufficient data.
3. Confirm low-sample behavior (`< 5`) blocks detailed stats.
4. Confirm metadata snippets for role/sector do not expose exact salary values.

5. Logged-in checks:
1. Reopen same routes after login.
2. Confirm detail unlock only when sample threshold is satisfied.
3. Confirm dashboard alert page loads: `/dashboard/salary-alerts`.

6. Moderation and notification:
1. Publish one pending salary from admin.
2. Confirm no moderation blocking errors.
3. Confirm matching subscribers receive `salary_update`.

7. Digest API checks:
1. without bearer token -> must return `401`.
2. with valid bearer -> must not return `401`; expected `200` in normal operation.
3. re-run within 7 days -> no duplicate weekly digest notifications.

## 4) DB contract verification

Run:

```sql
-- file: supabase/qa/salary_alert_contract_checks.sql
```

Expected:
- Table, constraints, indexes, RLS, and policies are present.
- Trigger `trg_salary_alert_subscriptions_updated_at` exists.
- Notification evidence rows exist for `salary_update` / `salary_digest_weekly` after scenarios are executed.

## 5) Evidence capture

Save evidence in a ticket/PR comment using this structure:
- Screenshots:
1. logged-out preview states
2. logged-in unlocked states
3. `/dashboard/salary-alerts`
- API evidence:
1. digest unauthorized response (401 + body)
2. digest authorized response (status + body)
- DB evidence:
1. sample rows from `salary_alert_subscriptions`
2. sample rows from `notifications` (`salary_update`, `salary_digest_weekly`)
- Admin moderation trace:
1. one published salary event
2. resulting notifications

## 6) Acceptance checklist

- [ ] No exact sensitive salary values exposed to logged-out users on audited views.
- [ ] `MIN_PUBLIC_SAMPLE_SIZE = 5` behavior consistent across salary surfaces.
- [ ] Salary submission/moderation/alerts run without runtime errors.
- [ ] Alert subscriptions are owner-scoped, deduplicated, and capped at 50/user.
- [ ] Digest endpoint requires bearer token and avoids duplicate weekly digest sends.
- [ ] No regressions in salaries hub <-> details <-> business salary section navigation.

