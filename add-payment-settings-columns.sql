-- Add payment settings columns to site_settings table
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS payment_bank_name TEXT DEFAULT 'BMCE Bank',
ADD COLUMN IF NOT EXISTS payment_rib_number TEXT DEFAULT '011 780 0000 1234567890 12 34',
ADD COLUMN IF NOT EXISTS payment_beneficiary TEXT DEFAULT 'Platform SARL',
ADD COLUMN IF NOT EXISTS payment_chari_url TEXT DEFAULT 'https://chari.ma/avis',
ADD COLUMN IF NOT EXISTS payment_methods_enabled TEXT[] DEFAULT ARRAY['bank_transfer'];

-- Update any existing records with default values if the columns are added
UPDATE site_settings 
SET 
  payment_bank_name = COALESCE(payment_bank_name, 'BMCE Bank'),
  payment_rib_number = COALESCE(payment_rib_number, '011 780 0000 1234567890 12 34'),
  payment_beneficiary = COALESCE(payment_beneficiary, 'Platform SARL'),
  payment_chari_url = COALESCE(payment_chari_url, 'https://chari.ma/avis'),
  payment_methods_enabled = COALESCE(payment_methods_enabled, ARRAY['bank_transfer'])
WHERE 
  payment_bank_name IS NULL 
  OR payment_rib_number IS NULL 
  OR payment_beneficiary IS NULL
  OR payment_chari_url IS NULL
  OR payment_methods_enabled IS NULL;
