begin;

-- Normalize common mojibake values introduced by CSV imports
-- so business filters match canonical categories/cities.

update public.businesses
set category = 'Éducation & Formation'
where category ilike '%Ã‰ducation%';

update public.businesses
set category = 'Énergie & Environnement'
where category ilike '%Ã‰nergie%';

update public.businesses
set category = 'Santé & Bien-être'
where category ilike '%SantÃ©%';

update public.businesses
set category = 'Hôtels & Hébergement'
where category ilike '%HÃ´tels%';

update public.businesses
set city = 'Laayoune'
where city ilike '%laï¿½youne%'
   or city ilike '%la�youne%';

-- Keep tags aligned for affected city
update public.businesses
set tags = array(
  select case
    when t ilike '%laï¿½youne%' or t ilike '%la�youne%' then 'Laayoune'
    else t
  end
  from unnest(coalesce(tags, array[]::text[])) as t
)
where exists (
  select 1
  from unnest(coalesce(tags, array[]::text[])) as t
  where t ilike '%laï¿½youne%' or t ilike '%la�youne%'
);

commit;
