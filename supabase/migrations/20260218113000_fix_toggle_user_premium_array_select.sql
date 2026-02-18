-- Fix toggle_user_premium to avoid aggregate resolution edge cases.
CREATE OR REPLACE FUNCTION public.toggle_user_premium(
  p_user_id uuid,
  p_tier text,
  p_is_premium boolean,
  p_granted_at timestamptz DEFAULT now(),
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_business_ids text[];
  v_updated_count integer := 0;
BEGIN
  UPDATE public.profiles
  SET
    is_premium = p_is_premium,
    tier = p_tier,
    premium_granted_at = p_granted_at,
    premium_expires_at = p_expires_at,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  SELECT COALESCE(
    ARRAY(
      SELECT DISTINCT x.business_id
      FROM (
        SELECT p.business_id
        FROM public.profiles p
        WHERE p.id = p_user_id
          AND p.business_id IS NOT NULL
        UNION
        SELECT ub.business_id
        FROM public.user_businesses ub
        WHERE ub.user_id = p_user_id
          AND ub.business_id IS NOT NULL
      ) x
      ORDER BY x.business_id
    ),
    ARRAY[]::text[]
  )
  INTO v_business_ids;

  IF array_length(v_business_ids, 1) > 0 THEN
    UPDATE public.businesses
    SET
      is_premium = p_is_premium,
      tier = p_tier,
      updated_at = timezone('utc'::text, now())
    WHERE id = ANY(v_business_ids);
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'tier', p_tier,
    'is_premium', p_is_premium,
    'businesses_updated', v_updated_count,
    'business_ids', v_business_ids
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_user_premium(uuid, text, boolean, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.toggle_user_premium(uuid, text, boolean, timestamptz, timestamptz) TO postgres;
