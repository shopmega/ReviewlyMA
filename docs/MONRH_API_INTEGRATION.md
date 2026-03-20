# API for MON RH (partner integration)

This document describes **our review app’s API** that [MON RH](https://monrh.vercel.app/) (or other partners) can call. MON RH can use these endpoints to integrate with our data (e.g. business search, health check).

**Base URL** (production): `https://reviewly-ma.vercel.app` (or your deployed app URL).

---

## Endpoints available to MON RH

### Health check

**GET** `{BASE_URL}/api/health`

- No authentication required.
- Returns app health and database status.

**Example response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-16T...",
  "uptime": 12345,
  "checks": { "database": "ok", "responseTime": 12 },
  "version": "0.1.0"
}
```

---

### Business search

**GET** `{BASE_URL}/api/businesses/search`

Query params:

| Param     | Required | Description                          |
|----------|----------|--------------------------------------|
| `q`      | Yes      | Search query (2–100 characters)     |
| `page`   | No       | Page number (default: 1)            |
| `limit`  | No       | Results per page (1–50, default: 10)|
| `category` | No     | Filter by category                   |
| `city`   | No       | Filter by city                       |

- No authentication required.
- Rate limit: 100 requests per minute per client (by IP).

**Example:**  
`GET {BASE_URL}/api/businesses/search?q=restaurant&city=Casablanca&limit=5`

**Example response (200):**
```json
{
  "results": [
    {
      "id": "uuid",
      "name": "...",
      "location": "...",
      "category": "...",
      "logo_url": "...",
      "city": "...",
      "overall_rating": 4.2,
      "description": "...",
      "is_claimed": false
    }
  ],
  "query": "restaurant",
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": { "category": null, "city": "Casablanca" },
  "meta": { "responseTime": "45ms" }
}
```

---

### Versioned business search (same contract)

**GET** `{BASE_URL}/api/v1/businesses/search`

Same parameters and response as `/api/businesses/search`. Use this for stable versioning if we add v2 later.

---

## CORS and rate limits

- Endpoints are intended for server-to-server calls from MON RH (or browser calls from their origin). If you need to allow MON RH’s origin explicitly, configure CORS for `https://monrh.vercel.app` in your Next.js/edge config.
- Rate limits are applied per client (IP). For higher or dedicated limits for MON RH, we can add partner API key authentication and separate limits later.

---

## Optional: partner API key (future)

To give MON RH (or other partners) a dedicated key and higher rate limits:

1. Add env `PARTNER_API_KEYS` or a DB table for partner keys.
2. In middleware or in each route, accept `Authorization: Bearer <key>` or `X-API-Key: <key>` and allowlist MON RH’s key.
3. Apply a separate (higher) rate limit for requests that present a valid partner key.

No partner key is required for the endpoints listed above today.

---

## How MON RH can leverage this API

MON RH (simulateurs, documents, droits du travail) can use the review app’s API in these ways:

### 1. **Company lookup / autocomplete**

When a user enters their employer name (e.g. in a letter generator, dispute form, or simulator):

- **Call:** `GET {BASE_URL}/api/businesses/search?q={employerName}&limit=5`
- **Use:** Show a dropdown of matching companies; user picks one to pre-fill name, city, category, or to link to the company page.
- **Deep link:** After selection, link to the company on Reviewly: `{BASE_URL}/businesses/{id}` (use the `id` from each search result).

### 2. **“Voir les avis sur cette entreprise”**

In MON RH flows (after a simulation, in an article, or in a document):

- Use **business search** to resolve the company, then show a button/link: **“Voir les avis et infos entreprise sur Reviewly”** → `{BASE_URL}/businesses/{id}`.
- Optionally fetch once via the API to show company name and city in the button (e.g. “Voir les avis pour **Entreprise X** à **Casablanca**”).

### 3. **Verify or suggest employer**

When the user types a company name:

- Call **search** with `q` and optional `city` to suggest or verify the employer.
- Use the returned `id` for any follow-up (e.g. store “employer_reviewly_id” for the document or simulation).

### 4. **Technical integration options**

| Integration type | How |
|------------------|-----|
| **Server-side (MON RH backend)** | Call `GET {BASE_URL}/api/businesses/search?q=...` from MON RH’s server. No CORS; rate limit 100/min per IP. |
| **Browser (MON RH frontend)** | Call the same URL from the browser. Ensure our app allows CORS for `https://monrh.vercel.app` (see below). |
| **Deep links only** | MON RH can build links to `{BASE_URL}/businesses/{id}` without calling the API (e.g. if they get `id` from another source). |

### 5. **CORS (if MON RH calls from the browser)**

If MON RH’s frontend calls your API from JavaScript, your app must allow their origin. In this project you can:

- Add in **Next.js config** (e.g. `next.config.ts`) or in a **custom API route/middleware** the header:  
  `Access-Control-Allow-Origin: https://monrh.vercel.app`  
  (and, if they send credentials or non-simple headers, allow `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers` as needed).

If MON RH only calls from their server, CORS is not required.

### 6. **Optional: single-business endpoint**

Today MON RH can use **search** and then use the first result or the chosen result’s `id`. If you want to support “get one business by id” (e.g. for permalinks or cache), you can add:

- **GET** `{BASE_URL}/api/businesses/{id}`  
  Returns public fields (id, name, city, category, overall_rating, …) for a single business.  
  This is not implemented yet; add it when you need it for MON RH or other partners.
