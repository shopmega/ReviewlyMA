-- Minimal test to isolate the issue

-- Test Table
CREATE TABLE IF NOT EXISTS test_business_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id TEXT NOT NULL,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0
);

-- Test Index
CREATE INDEX IF NOT EXISTS idx_test_business_analytics_date ON test_business_analytics(business_id, date DESC);

-- Test Function
CREATE OR REPLACE FUNCTION test_update_business_analytics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO test_business_analytics (business_id, date, views)
    VALUES (NEW.business_id, CURRENT_DATE, 1)
    ON CONFLICT (business_id, date)
    DO UPDATE SET 
        views = test_business_analytics.views + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
