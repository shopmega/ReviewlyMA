-- Trigger to automatically update business overall_rating when reviews are added/updated/deleted

-- Function to calculate and update business overall rating
CREATE OR REPLACE FUNCTION update_business_overall_rating()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating NUMERIC;
    review_count INTEGER;
BEGIN
    -- Get the business_id (either from NEW or OLD depending on operation)
    DECLARE
        business_id UUID;
    BEGIN
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

        -- Update the business overall_rating and review_count
        UPDATE businesses 
        SET 
            overall_rating = avg_rating,
            review_count = review_count,
            updated_at = NOW()
        WHERE id = business_id;

        -- Also update search vector if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'businesses' AND column_name = 'search_vector') THEN
            UPDATE businesses 
            SET search_vector = setweight(to_tsvector('french', COALESCE(name, '')), 'A') ||
                               setweight(to_tsvector('french', COALESCE(description, '')), 'B') ||
                               setweight(to_tsvector('french', COALESCE(category, '')), 'C')
            WHERE id = business_id;
        END IF;
    END;

    -- Return appropriate record
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_business_rating_on_review_change ON reviews;

-- Create trigger for INSERT, UPDATE, DELETE on reviews
CREATE TRIGGER update_business_rating_on_review_change
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_business_overall_rating();

-- Also create a function to manually recalculate all business ratings (for fixing existing data)
CREATE OR REPLACE FUNCTION recalculate_all_business_ratings()
RETURNS void AS $$
BEGIN
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
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Run the recalculation for existing data
SELECT recalculate_all_business_ratings();

-- Add comment for documentation
COMMENT ON FUNCTION update_business_overall_rating() IS 
'Trigger function that automatically updates business overall_rating and review_count when reviews are inserted, updated, or deleted';

COMMENT ON TRIGGER update_business_rating_on_review_change ON reviews IS 
'Automatically updates business overall_rating when review status changes or reviews are added/removed';