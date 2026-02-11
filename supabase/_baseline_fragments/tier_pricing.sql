-- Tier pricing columns expected by the app UI
alter table public.site_settings
add column if not exists tier_growth_monthly_price numeric default 99,
add column if not exists tier_growth_annual_price numeric default 990,
add column if not exists tier_gold_monthly_price numeric default 299,
add column if not exists tier_gold_annual_price numeric default 2900;

