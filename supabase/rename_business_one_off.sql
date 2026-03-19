-- REUSABLE SQL SCRIPT FOR RENAMING A BUSINESS
-- Run this directly in the Supabase SQL Editor.
-- Update the variables at the top.

DO $$
DECLARE
    p_old_id TEXT := 'swissport-6uitd'; -- <--- UPDATE THIS
    p_new_id TEXT := 'swissport';      -- <--- UPDATE THIS
    v_exists_old BOOLEAN;
    v_exists_new BOOLEAN;
BEGIN
    -- 0. Ensure redirects table exists
    CREATE TABLE IF NOT EXISTS public.business_redirects (
        old_slug TEXT PRIMARY KEY,
        new_slug TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
    );

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read redirects' AND tablename = 'business_redirects') THEN
        ALTER TABLE public.business_redirects ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Public can read redirects" ON public.business_redirects FOR SELECT USING (true);
    END IF;

    -- 1. Validation
    SELECT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_old_id) INTO v_exists_old;
    IF NOT v_exists_old THEN
        RAISE NOTICE 'Business with ID % not found. Skipping.', p_old_id;
        RETURN;
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_new_id) INTO v_exists_new;
    IF v_exists_new THEN
        RAISE EXCEPTION 'Business with ID % already exists. Cannot rename.', p_new_id;
    END IF;

    -- 2. Create the new business record (copy of the old one)
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
        p_new_id, p_new_id, name, type, category, subcategory, location, address, city, quartier, 
        description, phone, website, whatsapp_number, company_size, employee_count, 
        price_range, logo_url, logo_hint, cover_url, cover_hint, gallery_urls, 
        image_url, tags, amenities, benefits, affiliate_link, affiliate_cta, 
        admin_affiliate_link, admin_affiliate_cta, logo_requested, is_featured, 
        is_sponsored, is_premium, tier, status, owner_id, user_id, 
        overall_rating, average_rating, review_count, search_vector, created_at
    FROM public.businesses
    WHERE id = p_old_id;

    -- 3. Update all referencing tables
    UPDATE public.profiles SET business_id = p_new_id WHERE business_id = p_old_id;
    UPDATE public.reviews SET business_id = p_new_id WHERE business_id = p_old_id;
    UPDATE public.updates SET business_id = p_new_id WHERE business_id = p_old_id;
    UPDATE public.salaries SET business_id = p_new_id WHERE business_id = p_old_id;
    UPDATE public.interviews SET business_id = p_new_id WHERE business_id = p_old_id;
    UPDATE public.business_claims SET business_id = p_new_id WHERE business_id = p_old_id;
    UPDATE public.review_reports SET business_id = p_new_id WHERE business_id = p_old_id;
    UPDATE public.media_reports SET business_id = p_new_id WHERE business_id = p_old_id;
    UPDATE public.favorites SET business_id = p_new_id WHERE business_id = p_old_id;
    UPDATE public.business_hours SET business_id = p_new_id WHERE business_id = p_old_id;
    UPDATE public.premium_payments SET business_id = p_new_id WHERE business_id = p_old_id;
    UPDATE public.support_tickets SET business_id = p_new_id WHERE business_id = p_old_id;
    UPDATE public.user_businesses SET business_id = p_new_id WHERE business_id = p_old_id;

    -- 4. Create redirect
    INSERT INTO public.business_redirects (old_slug, new_slug)
    VALUES (p_old_id, p_new_id)
    ON CONFLICT (old_slug) DO UPDATE SET new_slug = EXCLUDED.new_slug;

    -- 5. Delete the old record
    DELETE FROM public.businesses WHERE id = p_old_id;

    RAISE NOTICE 'Successfully renamed business from % to %', p_old_id, p_new_id;
END $$;
