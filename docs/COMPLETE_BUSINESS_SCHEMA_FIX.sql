-- =====================================================
-- COMPLETE BUSINESS SCHEMA FIX v3
-- Adds ALL missing columns including missing sorting columns and types
-- =====================================================

DO $$ 
BEGIN
    -- 0. Create tier enum if not exists (handling dependency)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
        CREATE TYPE subscription_tier AS ENUM ('none', 'growth', 'pro');
    END IF;

    -- 1. Add subcategory
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'subcategory') THEN
        ALTER TABLE businesses ADD COLUMN subcategory VARCHAR(100);
    END IF;

    -- 2. Add city
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'city') THEN
        ALTER TABLE businesses ADD COLUMN city VARCHAR(100);
    END IF;

    -- 3. Add quartier
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'quartier') THEN
        ALTER TABLE businesses ADD COLUMN quartier VARCHAR(100);
    END IF;

    -- 4. Add phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'phone') THEN
        ALTER TABLE businesses ADD COLUMN phone VARCHAR(50);
    END IF;

    -- 5. Add website
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'website') THEN
        ALTER TABLE businesses ADD COLUMN website VARCHAR(255);
    END IF;

    -- 6. Add is_premium
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'is_premium') THEN
        ALTER TABLE businesses ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
    END IF;

    -- 7. Add logo_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'logo_url') THEN
        ALTER TABLE businesses ADD COLUMN logo_url TEXT;
    END IF;

    -- 8. Add logo_hint
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'logo_hint') THEN
        ALTER TABLE businesses ADD COLUMN logo_hint TEXT;
    END IF;

    -- 9. Add cover_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'cover_url') THEN
        ALTER TABLE businesses ADD COLUMN cover_url TEXT;
    END IF;

    -- 10. Add cover_hint
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'cover_hint') THEN
        ALTER TABLE businesses ADD COLUMN cover_hint TEXT;
    END IF;

    -- 11. Add gallery_urls (Array)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'gallery_urls') THEN
        ALTER TABLE businesses ADD COLUMN gallery_urls TEXT[];
    END IF;

    -- 12. Add tags (Array)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'tags') THEN
        ALTER TABLE businesses ADD COLUMN tags TEXT[];
    END IF;

    -- 13. Add benefits (Array)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'benefits') THEN
        ALTER TABLE businesses ADD COLUMN benefits TEXT[];
    END IF;

    -- 14. Add overall_rating 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'overall_rating') THEN
        ALTER TABLE businesses ADD COLUMN overall_rating NUMERIC(3, 2) DEFAULT 0;
    END IF;

    -- 15. Add is_featured
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'is_featured') THEN
        ALTER TABLE businesses ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
    END IF;

    -- 16. Add employee_count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'employee_count') THEN
        ALTER TABLE businesses ADD COLUMN employee_count VARCHAR(50);
    END IF;

    /* -- 17. Add price_range (REMOVED - Company Focused)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'price_range') THEN
        ALTER TABLE businesses ADD COLUMN price_range INT;
    END IF;
    */

    -- 18. Add is_sponsored (Vital for sorting)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'is_sponsored') THEN
        ALTER TABLE businesses ADD COLUMN is_sponsored BOOLEAN DEFAULT FALSE;
    END IF;

    -- 19. Add tier (Vital for sorting)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'tier') THEN
         -- Attempt to use connection with subscription_tier enum
        ALTER TABLE businesses ADD COLUMN tier subscription_tier DEFAULT 'none';
    END IF;

    -- 20. Add search_vector (Vital for text search)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'search_vector') THEN
        ALTER TABLE businesses ADD COLUMN search_vector tsvector;
    END IF;

END $$;

-- Create indexes for new columns if they don't exist
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);
CREATE INDEX IF NOT EXISTS idx_businesses_category_city ON businesses(category, city);
CREATE INDEX IF NOT EXISTS idx_businesses_overall_rating ON businesses(overall_rating);
CREATE INDEX IF NOT EXISTS idx_businesses_search_vector ON businesses USING GIN(search_vector);
