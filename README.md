# AVis

Implementation-grounded documentation for the app is available in [docs/APP_DOCUMENTATION.md](docs/APP_DOCUMENTATION.md).

## Summary

AVis is a Next.js + Supabase platform for business discovery, employee reviews, salary transparency, referrals, business claiming, pro dashboard tooling, premium subscriptions, admin moderation, and a newer job-offer analysis module.

Branding note: the runtime site name is configurable through `site_settings.site_name`; `Reviewly` is the fallback name in code.

## Stack

- Next.js 15 App Router
- React 19 + TypeScript
- Tailwind CSS + Radix UI
- Supabase Auth, Postgres, Storage
- Genkit with OpenAI / Gemini / Groq / compatible providers
- Vitest + Playwright

## Setup

```bash
npm install
```

Create `.env.local` with at least:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:9002
NEXT_PUBLIC_SITE_URL=http://localhost:9002
SITE_URL=http://localhost:9002
CRON_SECRET=local-dev-secret
```

Optional AI config is documented in [.env.example](.env.example).

Start development:

```bash
npm run dev
```

Open `http://localhost:9002`.

## Main structure

- `src/app`: routes, layouts, route handlers, server actions
- `src/lib`: data access, caching, auth, business logic
- `src/components`: reusable UI and feature components
- `src/ai`: Genkit setup and AI flows
- `supabase/migrations`: database schema and RLS
- `docs`: product, setup, and engineering documentation

## Key commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run genkit:dev
```

## Deployment notes

- `vercel.json` configures cron routes for premium expiry, salary digests, pro insights, review SLA sync, and claim reverification.
- `apphosting.yaml` also exists, so the active production hosting target should be verified before changing deployment infrastructure.

## Important env groups

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- URLs: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `SITE_URL`
- AI: `AI_PRIMARY_PROVIDER` plus provider-specific keys/models
- Security: `CRON_SECRET`
- Analytics/ads: GA, Meta Pixel, Ads, AdSense vars
- Email: provider creds plus `EMAIL_FROM`, `SUPPORT_EMAIL`, `ADMIN_EMAIL`
