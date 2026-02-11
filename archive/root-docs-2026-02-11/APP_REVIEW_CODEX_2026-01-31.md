# App Review Report (Codex)

Date: 2026-01-31
Scope: Source review only. No runtime tests or external integrations executed.

## Summary
- Critical: Unauthenticated admin API routes use service-role access.
- High: Admin user search enumerates all users and filters in-memory.
- High: /review protection in middleware is unreachable and does not enforce auth.
- Medium: Admin analytics server action uses service-role without admin verification.
- Medium: Public search actions use service-role client and lose user attribution.
- Medium: Global frame-blocking headers prevent widget embedding.
- Low: Invalid Referrer-Policy value.
- Low: Builds ignore TypeScript and ESLint errors.

## Findings

### Critical
1) Unauthenticated admin API routes use service-role access.
- Risk: Any caller can access privileged data and bypass RLS.
- Evidence:
  - src/app/api/admin/users/search/route.ts:4
  - src/app/api/admin/users/search/route.ts:16
  - src/app/api/admin/businesses/search/route.ts:4
  - src/app/api/admin/businesses/search/route.ts:16

### High
2) User search enumerates all users and filters in-memory.
- Risk: PII exposure and DoS risk by listing the full user set.
- Evidence:
  - src/app/api/admin/users/search/route.ts:18

3) /review protection in middleware is unreachable.
- Risk: Unauthenticated users are not redirected before hitting /review.
- Evidence:
  - src/lib/supabase/middleware-optimized.ts:144
  - src/lib/supabase/middleware-optimized.ts:151

### Medium
4) Admin analytics server action uses service-role without admin verification.
- Risk: If exposed beyond admin UI, it grants broad analytics access.
- Evidence:
  - src/app/actions/analytics.ts:118

5) Public search actions use service-role client and lose user attribution.
- Risk: Bypasses RLS for public actions; user_id remains null because service-role client has no user session.
- Evidence:
  - src/app/actions/search.ts:15
  - src/app/actions/search.ts:83
  - src/app/actions/search.ts:87

6) Global frame-blocking headers prevent widget embedding.
- Risk: /widget pages cannot be embedded in iframes.
- Evidence:
  - next.config.ts:88
  - next.config.ts:108

### Low
7) Invalid Referrer-Policy value.
- Risk: Browser ignores it; referrer behavior becomes default.
- Evidence:
  - next.config.ts:100

8) Builds ignore TypeScript and ESLint errors.
- Risk: Defects can ship without failing CI/builds.
- Evidence:
  - next.config.ts:5

## Notes
- No tests were run.
- Review is limited to static analysis of selected files.
