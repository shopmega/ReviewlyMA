-- Keep DB cron expiration logic aligned with application logic for multi-business users.
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
  WITH expired_profiles AS (
    UPDATE public.profiles p
    SET
      is_premium = false,
      tier = 'standard',
      updated_at = timezone('utc'::text, now())
    WHERE
      (p.is_premium = true OR p.tier IN ('growth', 'gold'))
      AND p.premium_expires_at IS NOT NULL
      AND p.premium_expires_at < timezone('utc'::text, now())
    RETURNING p.id, p.business_id
  ),
  affected_business_ids AS (
    SELECT DISTINCT x.business_id
    FROM (
      SELECT ep.business_id
      FROM expired_profiles ep
      WHERE ep.business_id IS NOT NULL

      UNION

      SELECT ub.business_id
      FROM public.user_businesses ub
      JOIN expired_profiles ep ON ep.id = ub.user_id
    ) x
    WHERE x.business_id IS NOT NULL
  ),
  expired_businesses AS (
    UPDATE public.businesses b
    SET
      is_premium = false,
      tier = 'standard',
      updated_at = timezone('utc'::text, now())
    WHERE
      (b.is_premium = true OR b.tier IN ('growth', 'gold'))
      AND b.id IN (SELECT business_id FROM affected_business_ids)
    RETURNING b.id
  )
  SELECT
    (SELECT count(*) FROM expired_profiles),
    (SELECT count(*) FROM expired_businesses)
  INTO v_profiles_count, v_businesses_count;

  INSERT INTO public.admin_audit_log (admin_id, action, details)
  VALUES (
    NULL,
    'premium_expiration_job',
    jsonb_build_object(
      'profiles_updated', v_profiles_count,
      'businesses_updated', v_businesses_count,
      'ran_at', timezone('utc'::text, now()),
      'logic', 'multi_business_aware'
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'profiles_updated', v_profiles_count,
    'businesses_updated', v_businesses_count
  );
END;
$$;
