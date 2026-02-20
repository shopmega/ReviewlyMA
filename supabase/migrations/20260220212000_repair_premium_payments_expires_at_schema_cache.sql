-- Ensure premium payment expiration column exists and refresh PostgREST schema cache.
DO $$
DECLARE
  v_table_name text;
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
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS expires_at timestamptz',
        v_table_name
      );
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
