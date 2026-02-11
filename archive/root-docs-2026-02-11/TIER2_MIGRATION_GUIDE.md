# 🚀 TIER 2 Migration Guide - SQL Issue Fixed

## Issue
Received error: `cannot use subquery in check constraint`

## Root Cause
PostgreSQL doesn't support subqueries in CHECK constraints. The original approach tried to use:
```sql
ALTER TABLE reviews ADD CONSTRAINT no_self_review 
CHECK (
    NOT EXISTS (
        SELECT 1 FROM profiles WHERE ...
    )
);
```

## Solution
Changed from CHECK constraint to trigger-based approach:
- **Before:** Constraint with subquery (not supported)
- **After:** Function + trigger (fully supported)

## What Changed
The `tier2-data-consistency.sql` file now uses a trigger instead of a constraint:

### Old Approach (Unsupported):
```sql
ALTER TABLE reviews ADD CONSTRAINT no_self_review 
CHECK (NOT EXISTS (SELECT 1 FROM profiles WHERE ...));
```

### New Approach (Supported):
```sql
CREATE OR REPLACE FUNCTION check_no_self_review()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = NEW.user_id 
            AND profiles.business_id = NEW.business_id
        ) THEN
            RAISE EXCEPTION 'Business owners cannot review their own establishment';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_self_review_trigger
BEFORE INSERT OR UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION check_no_self_review();
```

## Impact
- ✅ Still prevents self-reviews (same functionality)
- ✅ Now works on all PostgreSQL/Supabase versions
- ✅ Still enforced at database level (can't bypass)
- ✅ Same security guarantee

## Deployment
Simply run the updated `supabase/tier2-data-consistency.sql` file as before - it will work correctly now!

## Verification
After running the migration:
```sql
-- Verify the function exists
SELECT proname FROM pg_proc WHERE proname = 'check_no_self_review';

-- Verify the trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'no_self_review_trigger';
```

The functionality is identical - only the implementation changed to be compatible with PostgreSQL limitations.