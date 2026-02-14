begin;

-- Normalize mojibake city names left by legacy CSV decoding issues.
-- This targets known variants observed in imports.

with city_map(broken, fixed) as (
  values
    ('FÃ¨s', 'Fès'),
    ('MeknÃ¨s', 'Meknès'),
    ('TÃ©touan', 'Tétouan'),
    ('BÃ©ni Mellal', 'Béni Mellal'),
    ('Laï¿½youne', 'Laayoune'),
    ('La�youne', 'Laayoune')
)
update public.businesses b
set city = m.fixed
from city_map m
where b.city = m.broken;

-- Also clean mojibake fragments if they appear in location/address text.
update public.businesses
set location = replace(location, 'Laï¿½youne', 'Laayoune')
where location like '%Laï¿½youne%';

update public.businesses
set location = replace(location, 'La�youne', 'Laayoune')
where location like '%La�youne%';

update public.businesses
set address = replace(address, 'Laï¿½youne', 'Laayoune')
where address like '%Laï¿½youne%';

update public.businesses
set address = replace(address, 'La�youne', 'Laayoune')
where address like '%La�youne%';

commit;

