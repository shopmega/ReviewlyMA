-- Add payment settings columns to site_settings table
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS payment_bank_name TEXT DEFAULT 'BMCE Bank',
ADD COLUMN IF NOT EXISTS payment_rib_number TEXT DEFAULT '011 780 0000 1234567890 12 34',
ADD COLUMN IF NOT EXISTS payment_beneficiary TEXT DEFAULT 'Avis.ma SARL',
ADD COLUMN IF NOT EXISTS payment_chari_url TEXT DEFAULT 'https://chari.ma/avis',
ADD COLUMN IF NOT EXISTS payment_methods_enabled TEXT[] DEFAULT ARRAY['bank_transfer'];

-- Verify the columns were added successfully
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'site_settings' 
AND column_name LIKE 'payment_%'
ORDER BY column_name;