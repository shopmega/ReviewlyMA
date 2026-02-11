# Admin Panel Setup Guide

## Overview
The Avis.ma admin panel provides complete moderation and content management capabilities, all wired to Supabase.

## Database Tables Required

### Core Tables (SUPABASE_SETUP.md)
- `profiles` - User accounts
- `businesses` - Business listings
- `reviews` - User reviews
- `updates` - Business announcements
- `salaries` - Salary information (employers)
- `interviews` - Interview experiences (employers)

### Admin Tables (ADMIN_TABLES.sql)
Run the SQL in `docs/ADMIN_TABLES.sql` to create:

| Table | Purpose |
|-------|---------|
| `seasonal_collections` | Homepage carousel management |
| `site_settings` | Global site configuration |
| `business_claims` | Business ownership claims |
| `review_reports` | Flagged reviews moderation |
| `media_reports` | Flagged media moderation |

## Admin Pages

### Dashboard (`/admin`)
- **Status:** ✅ Wired to Supabase
- Shows real-time counts of businesses, reviews, and users
- Quick links to all admin sections

### Statistiques (`/admin/statistiques`)
- **Status:** ✅ Wired to Supabase
- Real-time statistics with charts:
  - User growth (6 months)
  - Review volume (bar chart)
  - Business growth (area chart)
  - Category distribution (pie chart)
- Growth percentages calculated from actual data

### Établissements (`/admin/etablissements`)
- **Status:** ✅ Wired to Supabase
- List all businesses with search/filter
- Toggle featured status
- View business details

### Utilisateurs (`/admin/utilisateurs`)
- **Status:** ✅ Wired to Supabase
- List all registered users
- View roles (admin, pro, user)
- Role management (dropdown menu)

### Revendications (`/admin/revendications`)
- **Status:** ✅ Wired to Supabase
- View business ownership claims
- Approve/reject claims
- Table: `business_claims`

### Avis Signalements (`/admin/avis-signalements`)
- **Status:** ✅ Wired to Supabase
- View reported/flagged reviews
- Resolve or dismiss reports
- Table: `review_reports`

### Contenu (`/admin/contenu`)
- **Status:** ✅ Wired to Supabase
- View reported media/images
- Remove or keep media
- Table: `media_reports`

### Homepage (`/admin/homepage`)
- **Status:** ✅ Wired to Supabase
- Manage seasonal collections carousel
- View featured businesses
- Add/edit/delete collections
- Table: `seasonal_collections`

### Paramètres (`/admin/parametres`)
- **Status:** ✅ Wired to Supabase
- Site name and description
- Contact information
- Social media links
- Security settings (maintenance mode, registration)
- Table: `site_settings`

## Creating an Admin User

After the tables are created, promote a user to admin:

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

## Server Actions

Located in `src/app/actions/`:
- `auth.ts` - Authentication actions
- `collections.ts` - Seasonal collections CRUD
- `review.ts` - Review submission

## Mock Data

The file `src/lib/mock-data.ts` exists only for the seed script (`src/scripts/seed-supabase.ts`). It is NOT used by the live application.

To seed initial data:
```bash
npx tsx src/scripts/seed-supabase.ts
```

## RLS Policies Summary

All admin tables have Row Level Security enabled:
- **Read:** Public or user-specific
- **Write:** Admin role required (checked via `profiles.role = 'admin'`)
- **Service Role:** Bypasses RLS for server-side operations
