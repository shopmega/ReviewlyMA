-- Add premium pricing settings to site_settings table
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS premium_annual_price DECIMAL(10,2) DEFAULT 500.00,
ADD COLUMN IF NOT EXISTS premium_monthly_price DECIMAL(10,2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS premium_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS premium_description TEXT DEFAULT 'Devenez membre Premium et bénéficiez de fonctionnalités exclusives pour propulser votre établissement.';

-- Update the updated_at trigger if it exists to handle the new columns
-- If the trigger doesn't exist yet, create it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_site_settings_updated_at') THEN
        CREATE TRIGGER update_site_settings_updated_at 
            BEFORE UPDATE ON site_settings 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
