-- Repair partner settings columns on public.site_settings and refresh PostgREST schema cache.
DO $$
BEGIN
  IF to_regclass('public.site_settings') IS NOT NULL THEN
    ALTER TABLE public.site_settings
      ADD COLUMN IF NOT EXISTS partner_app_name text,
      ADD COLUMN IF NOT EXISTS partner_app_url text;

    ALTER TABLE public.site_settings
      ALTER COLUMN partner_app_name SET DEFAULT 'MOR RH',
      ALTER COLUMN partner_app_url SET DEFAULT 'https://monrh.vercel.app/';

    UPDATE public.site_settings
    SET
      partner_app_name = COALESCE(partner_app_name, 'MOR RH'),
      partner_app_url = COALESCE(partner_app_url, 'https://monrh.vercel.app/')
    WHERE id = 'main';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
