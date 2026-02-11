
-- Migration to remove price_range feature
DO $$ 
BEGIN
    -- Remove price_range column from businesses table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'price_range') THEN
        ALTER TABLE businesses DROP COLUMN price_range;
    END IF;

    -- Note: We are keeping employee_count as it is used for company focus.
END $$;
