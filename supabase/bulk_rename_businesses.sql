-- COMPREHENSIVE BULK SLUG FIX SCRIPT
-- This script identifies businesses with random suffixes (e.g., -6uitd)
-- and renames them to cleaner, SEO-friendly slugs.

-- 1. Slugify helper function
CREATE OR REPLACE FUNCTION public.slugify(v_text TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        unaccent(v_text), -- Note: unaccent extension must be enabled
        '[^a-zA-Z0-9\s]+', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Unique Slug Generator helper
CREATE OR REPLACE FUNCTION public.generate_clean_slug(p_name TEXT, p_city TEXT)
RETURNS TEXT AS $$
DECLARE
    v_base TEXT;
    v_city TEXT;
    v_candidate TEXT;
    v_counter INT := 2;
BEGIN
    v_base := public.slugify(p_name);
    v_city := public.slugify(p_city);

    -- Try name only
    v_candidate := v_base;
    IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = v_candidate) THEN
        RETURN v_candidate;
    END IF;

    -- Try name-city
    v_candidate := v_base || '-' || v_city;
    IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = v_candidate) THEN
        RETURN v_candidate;
    END IF;

    -- Try name-city-N
    LOOP
        v_candidate := v_base || '-' || v_city || '-' || v_counter;
        IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = v_candidate) THEN
            RETURN v_candidate;
        END IF;
        v_counter := v_counter + 1;
        EXIT WHEN v_counter > 100;
    END LOOP;

    RETURN v_base || '-' || v_city || '-' || floor(random()*10000)::text; -- Fallback
END;
$$ LANGUAGE plpgsql;

-- 3. Bulk Fix Procedure
-- Run this to preview: SELECT id, public.generate_clean_slug(name, city) FROM businesses WHERE id ~ '-[a-z0-9]{5}$';
-- Run this to APPLY:
DO $$
DECLARE
    r RECORD;
    v_new_id TEXT;
BEGIN
    -- Ensure extensions are ready
    CREATE EXTENSION IF NOT EXISTS "unaccent";

    -- Ensure redirects table exists
    CREATE TABLE IF NOT EXISTS public.business_redirects (
        old_slug TEXT PRIMARY KEY,
        new_slug TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
    );

    FOR r IN (
        SELECT id, name, city 
        FROM public.businesses 
        WHERE id ~ '-[a-z0-9]{5}$' -- Matches the random 5-char suffix pattern
    ) LOOP
        v_new_id := public.generate_clean_slug(r.name, r.city);
        
        -- Only proceed if new_id is different (sanity check)
        IF v_new_id <> r.id THEN
            RAISE NOTICE 'Renaming % to %', r.id, v_new_id;
            
            -- Call the rename logic (inlined for safety in DO block)
            BEGIN
                -- 1. Create new record
                INSERT INTO public.businesses (
                    id, slug, name, type, category, subcategory, location, address, city, quartier, 
                    description, phone, website, whatsapp_number, company_size, employee_count, 
                    price_range, logo_url, logo_hint, cover_url, cover_hint, gallery_urls, 
                    image_url, tags, amenities, benefits, affiliate_link, affiliate_cta, 
                    admin_affiliate_link, admin_affiliate_cta, logo_requested, is_featured, 
                    is_sponsored, is_premium, tier, status, owner_id, user_id, 
                    overall_rating, average_rating, review_count, search_vector, created_at
                )
                SELECT 
                    v_new_id, v_new_id, name, type, category, subcategory, location, address, city, quartier, 
                    description, phone, website, whatsapp_number, company_size, employee_count, 
                    price_range, logo_url, logo_hint, cover_url, cover_hint, gallery_urls, 
                    image_url, tags, amenities, benefits, affiliate_link, affiliate_cta, 
                    admin_affiliate_link, admin_affiliate_cta, logo_requested, is_featured, 
                    is_sponsored, is_premium, tier, status, owner_id, user_id, 
                    overall_rating, average_rating, review_count, search_vector, created_at
                FROM public.businesses
                WHERE id = r.id;

                -- 2. Update references
                UPDATE public.profiles SET business_id = v_new_id WHERE business_id = r.id;
                UPDATE public.reviews SET business_id = v_new_id WHERE business_id = r.id;
                UPDATE public.updates SET business_id = v_new_id WHERE business_id = r.id;
                UPDATE public.salaries SET business_id = v_new_id WHERE business_id = r.id;
                UPDATE public.interviews SET business_id = v_new_id WHERE business_id = r.id;
                UPDATE public.business_claims SET business_id = v_new_id WHERE business_id = r.id;
                UPDATE public.review_reports SET business_id = v_new_id WHERE business_id = r.id;
                UPDATE public.media_reports SET business_id = v_new_id WHERE business_id = r.id;
                UPDATE public.favorites SET business_id = v_new_id WHERE business_id = r.id;
                UPDATE public.business_hours SET business_id = v_new_id WHERE business_id = r.id;
                UPDATE public.premium_payments SET business_id = v_new_id WHERE business_id = r.id;
                UPDATE public.support_tickets SET business_id = v_new_id WHERE business_id = r.id;
                UPDATE public.user_businesses SET business_id = v_new_id WHERE business_id = r.id;

                -- 3. Create redirect
                INSERT INTO public.business_redirects (old_slug, new_slug)
                VALUES (r.id, v_new_id)
                ON CONFLICT (old_slug) DO UPDATE SET new_slug = EXCLUDED.new_slug;

                -- 4. Delete old record
                DELETE FROM public.businesses WHERE id = r.id;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to rename %: %', r.id, SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;
