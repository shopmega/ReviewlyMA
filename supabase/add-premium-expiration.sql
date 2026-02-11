-- Migration to add expiration tracking to premium features

-- 1. Add premium_expires_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;

-- 2. Add expires_at to premium_payments
ALTER TABLE public.premium_payments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 3. Update the audit log to include expiration if needed
ALTER TABLE public.premium_audit_log ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 4. Create an index for expiring premium profiles
CREATE INDEX IF NOT EXISTS idx_profiles_premium_expires_at ON public.profiles(premium_expires_at);

-- 5. Comment for documentation
COMMENT ON COLUMN public.profiles.premium_expires_at IS 'When the user premium status expires';
COMMENT ON COLUMN public.premium_payments.expires_at IS 'The expiration date granted by this specific payment';
