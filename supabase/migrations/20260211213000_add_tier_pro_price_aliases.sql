begin;

alter table public.site_settings
add column if not exists tier_pro_monthly_price numeric,
add column if not exists tier_pro_annual_price numeric;

update public.site_settings
set
  tier_pro_monthly_price = coalesce(tier_pro_monthly_price, tier_gold_monthly_price, 299),
  tier_pro_annual_price = coalesce(tier_pro_annual_price, tier_gold_annual_price, 2900)
where id = 'main';

commit;

