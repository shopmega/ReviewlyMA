-- Add partner settings to site_settings table
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS partner_app_name TEXT DEFAULT 'MOR RH',
ADD COLUMN IF NOT EXISTS partner_app_url TEXT DEFAULT 'https://monrh.vercel.app/';

-- Update existing 'main' row with default values
UPDATE site_settings 
SET 
  partner_app_name = COALESCE(partner_app_name, 'MOR RH'),
  partner_app_url = COALESCE(partner_app_url, 'https://monrh.vercel.app/')
WHERE id = 'main';
