-- Migration to add is_premium column to profiles and businesses
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

-- Update RLS if needed (usually profiles are handled by auth or specific admin policies)
-- The existing policies should already allow admins to see/update this column.
