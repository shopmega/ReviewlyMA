-- Phase 1: Full-Text Search (FTS) Implementation
-- This migration adds robust PostgreSQL FTS with relevance ranking and fuzzy matching support.

-- 1. Enable pg_trgm for fuzzy matching (already enabled in previous migration, but safe to keep here)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add columns for business search and ranking
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- 2.1 Function to sync review counts
CREATE OR REPLACE FUNCTION sync_business_review_counts() RETURNS void AS $$
BEGIN
    UPDATE businesses b
    SET review_count = (
        SELECT count(*)
        FROM reviews r
        WHERE r.business_id = b.id AND r.status = 'published'
    );
END
$$ LANGUAGE plpgsql;

-- 2.2 Trigger to update review_count on review changes
CREATE OR REPLACE FUNCTION update_business_review_count() RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE businesses SET review_count = review_count + 1 WHERE id = NEW.business_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE businesses SET review_count = review_count - 1 WHERE id = OLD.business_id;
    END IF;
    RETURN NULL;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_business_review_count ON reviews;
CREATE TRIGGER trg_update_business_review_count
AFTER INSERT OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_business_review_count();

-- 3. Function to compute search vector for businesses
CREATE OR REPLACE FUNCTION businesses_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('french', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('french', coalesce(NEW.category, '')), 'B') ||
        setweight(to_tsvector('french', coalesce(NEW.city, '')), 'C') ||
        setweight(to_tsvector('french', coalesce(NEW.description, '')), 'D');
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 4. Trigger for businesses table
DROP TRIGGER IF EXISTS trg_businesses_search_vector_update ON businesses;
CREATE TRIGGER trg_businesses_search_vector_update
BEFORE INSERT OR UPDATE ON businesses
FOR EACH ROW EXECUTE FUNCTION businesses_search_vector_update();

-- 5. Populate search_vector and review_count for existing businesses
SELECT sync_business_review_counts();
UPDATE businesses SET search_vector = 
    setweight(to_tsvector('french', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(category, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(city, '')), 'C') ||
    setweight(to_tsvector('french', coalesce(description, '')), 'D');

-- 6. Create GIN index for fast FTS
CREATE INDEX IF NOT EXISTS idx_businesses_search_vector ON businesses USING gin(search_vector);

-- 7. Add Search Analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    city TEXT,
    results_count INTEGER DEFAULT 0,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Add index on analytics queries for performance monitoring
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at);

-- 9. Function for fuzzy matching + FTS
-- This combines FTS relevance with pg_trgm fuzzy matching
CREATE OR REPLACE FUNCTION search_businesses_advanced(search_query TEXT, search_city TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    name TEXT,
    category TEXT,
    city TEXT,
    overall_rating NUMERIC,
    review_count INTEGER,
    is_featured BOOLEAN,
    relevance FLOAT4
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        b.category,
        b.city,
        b.overall_rating,
        b.review_count,
        b.is_featured,
        (
            ts_rank_cd(b.search_vector, websearch_to_tsquery('french', search_query)) * 1.0 +
            similarity(b.name, search_query) * 0.5
        )::FLOAT4 as relevance
    FROM businesses b
    WHERE 
        (b.search_vector @@ websearch_to_tsquery('french', search_query) OR b.name % search_query)
        AND (search_city IS NULL OR b.city ILIKE search_city)
    ORDER BY b.is_featured DESC, relevance DESC
    LIMIT 20;
END
$$ LANGUAGE plpgsql;
