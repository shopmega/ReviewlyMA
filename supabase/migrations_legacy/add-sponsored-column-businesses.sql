-- Add is_sponsored column to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT FALSE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_businesses_sponsored ON businesses(is_sponsored);

-- Update RLS policies if needed
-- Note: This assumes the businesses table already has RLS enabled