-- One-off repair for premium_payments expires_at schema-cache issues.
-- Run in Supabase SQL Editor on the target environment.

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

-- Validation
select
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('premium_payments', 'premium_payements')
  and column_name = 'expires_at'
order by table_name;
