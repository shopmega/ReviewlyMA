-- Harden premium payment RLS for both possible table spellings.
-- Some environments may have schema drift with "premium_payements".
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
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table_name);

      EXECUTE format('DROP POLICY IF EXISTS "Users can insert own pending payments" ON public.%I', v_table_name);
      EXECUTE format('DROP POLICY IF EXISTS "Users can insert their own payments" ON public.%I', v_table_name);
      EXECUTE format('DROP POLICY IF EXISTS "Users can view their own payments" ON public.%I', v_table_name);
      EXECUTE format('DROP POLICY IF EXISTS "Users can update their own pending payments" ON public.%I', v_table_name);

      EXECUTE format(
        'CREATE POLICY "Users can insert own pending payments" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = ''pending'')',
        v_table_name
      );
      EXECUTE format(
        'CREATE POLICY "Users can view their own payments" ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)',
        v_table_name
      );
      EXECUTE format(
        'CREATE POLICY "Users can update their own pending payments" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = ''pending'') WITH CHECK (auth.uid() = user_id AND status = ''pending'')',
        v_table_name
      );

      EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO authenticated', v_table_name);
    END IF;
  END LOOP;
END $$;
