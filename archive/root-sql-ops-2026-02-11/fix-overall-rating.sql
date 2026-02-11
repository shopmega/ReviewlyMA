-- Simple SQL script to fix overall_rating calculation
-- Run this in your Supabase SQL Editor

-- First, let's check current problematic businesses
SELECT 
    b.id,
    b.name,
    b.overall_rating,
    COUNT(r.id) as actual_review_count,
    COALESCE(AVG(r.rating), 0)::NUMERIC(3,1) as calculated_avg
FROM businesses b
LEFT JOIN reviews r ON b.id = r.business_id AND r.status = 'published'
GROUP BY b.id, b.name, b.overall_rating
HAVING b.overall_rating != COALESCE(AVG(r.rating), 0)::NUMERIC(3,1) OR b.overall_rating IS NULL
ORDER BY b.name;

-- Update all businesses with correct overall_rating and review_count
UPDATE businesses b
SET 
    overall_rating = COALESCE((
        SELECT AVG(r.rating)::NUMERIC(3,1)
        FROM reviews r
        WHERE r.business_id = b.id 
        AND r.status = 'published'
    ), 0),
    review_count = (
        SELECT COUNT(r.id)
        FROM reviews r
        WHERE r.business_id = b.id 
        AND r.status = 'published'
    ),
    updated_at = NOW()
WHERE b.overall_rating != COALESCE((
    SELECT AVG(r.rating)::NUMERIC(3,1)
    FROM reviews r
    WHERE r.business_id = b.id 
    AND r.status = 'published'
), 0) OR b.overall_rating IS NULL;

-- Verify the fix
SELECT COUNT(*) as businesses_fixed
FROM businesses b
WHERE b.overall_rating = COALESCE((
    SELECT AVG(r.rating)::NUMERIC(3,1)
    FROM reviews r
    WHERE r.business_id = b.id 
    AND r.status = 'published'
), 0);

-- Optional: Create the trigger for future automatic updates
-- (Uncomment the following lines if you want automatic updates)

/*
CREATE OR REPLACE FUNCTION update_business_overall_rating()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating NUMERIC;
    review_count INTEGER;
    business_id UUID;
BEGIN
    -- Get the business_id
    IF (TG_OP = 'DELETE') THEN
        business_id := OLD.business_id;
    ELSE
        business_id := NEW.business_id;
    END IF;

    -- Calculate average rating from published reviews
    SELECT 
        COALESCE(AVG(r.rating), 0)::NUMERIC(3,1),
        COUNT(r.id)
    INTO avg_rating, review_count
    FROM reviews r
    WHERE r.business_id = business_id 
    AND r.status = 'published';

    -- Update the business
    UPDATE businesses 
    SET 
        overall_rating = avg_rating,
        review_count = review_count,
        updated_at = NOW()
    WHERE id = business_id;

    -- Return appropriate record
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_business_rating_on_review_change ON reviews;

CREATE TRIGGER update_business_rating_on_review_change
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_business_overall_rating();
*/