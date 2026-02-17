-- Ensure premium payment records carry an explicit expiration timestamp.
-- This supports reliable admin display and premium expiration audits.
DO $$
DECLARE
  v_table_name TEXT;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY['premium_payments', 'premium_payements']
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = v_table_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ',
        v_table_name
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_expires_at ON public.%I(expires_at)',
        v_table_name,
        v_table_name
      );
    END IF;
  END LOOP;
END $$;

-- Backfill verified payments with profile expiration when possible.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'premium_payments'
  ) THEN
    UPDATE public.premium_payments pp
    SET expires_at = p.premium_expires_at
    FROM public.profiles p
    WHERE pp.user_id = p.id
      AND pp.status = 'verified'
      AND pp.expires_at IS NULL
      AND p.premium_expires_at IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'premium_payements'
  ) THEN
    EXECUTE $sql$
      UPDATE public.premium_payements pp
      SET expires_at = p.premium_expires_at
      FROM public.profiles p
      WHERE pp.user_id = p.id
        AND pp.status = 'verified'
        AND pp.expires_at IS NULL
        AND p.premium_expires_at IS NOT NULL
    $sql$;
  END IF;
END $$;
