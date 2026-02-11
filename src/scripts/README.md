# Scripts

This directory contains utility scripts for managing the Avis application.

## clear-app-data.js

This script clears all application data while preserving the database structure and configuration.

### Purpose
- Removes all user-generated content (reviews, updates, etc.)
- Preserves business profiles and user accounts
- Maintains database schema and policies
- Useful for testing, development, or data reset

### Tables cleared
- `reviews` - All user reviews
- `updates` - Business announcements/updates
- `salaries` - Salary information (if exists)
- `interviews` - Interview experiences (if exists)
- `saved_businesses` - User saved businesses (if exists)
- `business_claims` - Business claim requests (if exists)
- `proofs` - Proof documents for claims (if exists)
- `seasonal_collections` - Homepage collections (if exists)

### Tables preserved
- `businesses` - Business profiles
- `profiles` - User accounts
- `site_settings` - Application settings
- All table schemas, indexes, and policies

### Usage

1. Ensure your Supabase environment variables are set in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

2. Run the script:
```bash
node src/scripts/clear-app-data.js
```

Or with npx:
```bash
npx node src/scripts/clear-app-data.js
```

### Caution
- This action is irreversible
- All user-generated content will be permanently deleted
- Business profiles and user accounts will remain intact
- Database structure and configuration will be preserved