begin;

-- Normalize legacy "pro" subscription tier to "gold".
-- Keep role="pro" untouched (this migration only affects subscription tiers).

update public.profiles
set tier = 'gold'
where tier = 'pro';

update public.businesses
set tier = 'gold'
where tier = 'pro';

update public.premium_users
set subscription_tier = 'gold'
where subscription_tier = 'pro';

update public.premium_payments
set target_tier = 'gold'
where target_tier = 'pro';

commit;

