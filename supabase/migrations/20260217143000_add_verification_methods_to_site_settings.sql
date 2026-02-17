-- Add missing verification method configuration used by claim flow and admin settings
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS verification_methods TEXT[] DEFAULT ARRAY['email', 'phone', 'document', 'video'];

-- Ensure main settings row has usable defaults
UPDATE public.site_settings
SET verification_methods = COALESCE(
  verification_methods,
  ARRAY['email', 'phone', 'document', 'video']
)
WHERE id = 'main';
