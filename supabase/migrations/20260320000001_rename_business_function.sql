-- Function to safely rename a business ID across all tables
-- This uses a Copy-Update-Delete pattern to satisfy foreign key constraints
CREATE OR REPLACE FUNCTION public.rename_business(
    p_old_id TEXT,
    p_new_id TEXT
) RETURNS VOID AS $$
DECLARE
    v_exists_old BOOLEAN;
    v_exists_new BOOLEAN;
BEGIN
    -- 1. Validation
    SELECT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_old_id) INTO v_exists_old;
    IF NOT v_exists_old THEN
        RAISE EXCEPTION 'Business with ID % not found', p_old_id;
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_new_id) INTO v_exists_new;
    IF v_exists_new THEN
        RAISE EXCEPTION 'Business with ID % already exists', p_new_id;
    END IF;

    -- 2. Create the new business record (copy of the old one)
    -- We use a temporary table or just insert from select
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

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
