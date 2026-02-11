-- Add new columns for monetization
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS affiliate_link TEXT,
ADD COLUMN IF NOT EXISTS affiliate_cta TEXT;

-- Index for future performance if needed
CREATE INDEX IF NOT EXISTS idx_businesses_is_premium ON businesses(is_premium);
