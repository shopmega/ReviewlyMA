-- Migration to normalize 'none' tier to 'standard'
-- and update defaults to ensure consistency with TypeScript types.

BEGIN;

-- 1. Update existing 'none' values to 'standard'
UPDATE public.profiles SET tier = 'standard' WHERE tier = 'none';
UPDATE public.businesses SET tier = 'standard' WHERE tier = 'none';

-- 2. Update column defaults
ALTER TABLE public.profiles ALTER COLUMN tier SET DEFAULT 'standard';
ALTER TABLE public.businesses ALTER COLUMN tier SET DEFAULT 'standard';

-- 3. Update the expiration function to use 'standard' instead of 'none'
CREATE OR REPLACE FUNCTION public.expire_premium_accounts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profiles_count int := 0;
  v_businesses_count int := 0;
BEGIN
  -- Update profiles
  WITH expired_profiles AS (
    UPDATE public.profiles p
    SET
      is_premium = false,
      tier = 'standard', -- Changed from 'none'
      updated_at = timezone('utc'::text, now())
    WHERE
      (p.is_premium = true OR p.tier IN ('growth', 'gold'))
      AND p.premium_expires_at IS NOT NULL
      AND p.premium_expires_at < timezone('utc'::text, now())
    RETURNING p.id, p.business_id
  )
  SELECT count(*) INTO v_profiles_count FROM expired_profiles;

  -- Update businesses associated with expired profiles
  WITH expired_businesses AS (
    UPDATE public.businesses b
    SET
      is_premium = false,
      tier = 'standard', -- Changed from 'none'
      updated_at = timezone('utc'::text, now())
    WHERE
      (b.is_premium = true OR b.tier IN ('growth', 'gold'))
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.business_id = b.id
          AND p.premium_expires_at IS NOT NULL
          AND p.premium_expires_at < timezone('utc'::text, now())
      )
    RETURNING b.id
  )
  SELECT count(*) INTO v_businesses_count FROM expired_businesses;

  -- Log action
  INSERT INTO public.admin_audit_log (admin_id, action, details)
  VALUES (
    null,
    'premium_expiration_job',
    jsonb_build_object(
      'profiles_updated', v_profiles_count,
      'businesses_updated', v_businesses_count,
      'ran_at', timezone('utc'::text, now()),
      'normalized_to', 'standard'
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'profiles_updated', v_profiles_count,
    'businesses_updated', v_businesses_count
  );
END;
$$;

COMMIT;
