-- site_settings v2 (manual fragment)
alter table public.site_settings
add column if not exists enable_reviews boolean default true,
add column if not exists enable_salaries boolean default true,
add column if not exists enable_interviews boolean default true,
add column if not exists enable_messaging boolean default false,
add column if not exists enable_claims boolean default true,
add column if not exists site_logo_url text,
add column if not exists google_analytics_id text,
add column if not exists facebook_pixel_id text,
add column if not exists office_address text default 'Casablanca, Morocco',
add column if not exists office_phone text,
add column if not exists copyright_text text,
add column if not exists home_sections_config jsonb;

update public.site_settings
set
  enable_reviews = coalesce(enable_reviews, true),
  enable_salaries = coalesce(enable_salaries, true),
  enable_interviews = coalesce(enable_interviews, true),
  enable_messaging = coalesce(enable_messaging, false),
  enable_claims = coalesce(enable_claims, true),
  office_address = coalesce(office_address, 'Casablanca, Morocco')
where id = 'main';

