-- Set app logo URL for header/nav from site_settings.
-- Run in Supabase SQL Editor.

update public.site_settings
set
  site_logo_url = '/app-logo.png',
  updated_at = now()
where id = 'main';

select id, site_logo_url, updated_at
from public.site_settings
where id = 'main';
