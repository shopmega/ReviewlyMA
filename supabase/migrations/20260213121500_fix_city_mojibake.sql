begin;

-- Fix known mojibake city values introduced by CSV decoding issues.
update public.businesses
set city = 'Laayoune'
where city = 'La�youne';

-- Fallback cleanup for replacement-character corruption in city names.
-- This strips U+FFFD and trims surrounding spaces.
update public.businesses
set city = btrim(replace(city, U&'\FFFD', ''))
where city like '%' || U&'\FFFD' || '%';

commit;

