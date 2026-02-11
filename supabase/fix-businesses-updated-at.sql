-- Migration to fix missing updated_at columns on multiple tables
-- This ensures all core tables have the updated_at column required by triggers

-- 1. Helper function for triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Add updated_at to core tables
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['businesses', 'reviews', 'business_claims', 'review_reports', 'media_reports']) 
    LOOP
        -- Add column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = t AND column_name = 'updated_at'
        ) THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()', t);
        END IF;

        -- Update existing nulls
        EXECUTE format('UPDATE public.%I SET updated_at = NOW() WHERE updated_at IS NULL', t);

        -- Add trigger
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END $$;
