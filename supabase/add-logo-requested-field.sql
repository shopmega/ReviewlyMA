-- Add logo_requested field to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS logo_requested BOOLEAN DEFAULT FALSE;

-- Add index for performance in admin panel
CREATE INDEX IF NOT EXISTS idx_businesses_logo_requested ON public.businesses(logo_requested);
