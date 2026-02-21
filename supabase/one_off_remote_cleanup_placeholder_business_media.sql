-- One-off cleanup for placeholder media persisted on businesses.
-- Run in Supabase SQL Editor on the target environment.

-- 1) Preview affected rows.
select
  id,
  name,
  logo_url,
  cover_url,
  gallery_urls
from public.businesses
where (logo_url like '/placeholders/%' or logo_url = '/placeholder-logo.png')
   or (cover_url like '/placeholders/%' or cover_url = '/placeholder-logo.png')
   or exists (
     select 1
     from unnest(coalesce(gallery_urls, '{}'::text[])) as item
     where item like '/placeholders/%' or item = '/placeholder-logo.png'
   )
order by updated_at desc nulls last
limit 200;

-- 2) Cleanup.
with cleaned as (
  select
    id,
    case
      when logo_url like '/placeholders/%' or logo_url = '/placeholder-logo.png' then null
      else logo_url
    end as sanitized_logo_url,
    case
      when cover_url like '/placeholders/%' or cover_url = '/placeholder-logo.png' then null
      else cover_url
    end as sanitized_cover_url,
    (
      select coalesce(array_agg(item), '{}'::text[])
      from unnest(coalesce(b.gallery_urls, '{}'::text[])) as item
      where item is not null
        and btrim(item) <> ''
        and item not like '/placeholders/%'
        and item <> '/placeholder-logo.png'
    ) as sanitized_gallery_urls,
    case
      when image_url like '/placeholders/%' or image_url = '/placeholder-logo.png' then null
      else image_url
    end as sanitized_image_url
  from public.businesses b
),
to_update as (
  select
    id,
    sanitized_logo_url,
    sanitized_cover_url,
    sanitized_gallery_urls,
    coalesce(sanitized_image_url, sanitized_logo_url, sanitized_cover_url) as final_image_url
  from cleaned
)
update public.businesses b
set
  logo_url = u.sanitized_logo_url,
  cover_url = u.sanitized_cover_url,
  gallery_urls = u.sanitized_gallery_urls,
  image_url = u.final_image_url,
  updated_at = now()
from to_update u
where b.id = u.id
  and (
    b.logo_url is distinct from u.sanitized_logo_url
    or b.cover_url is distinct from u.sanitized_cover_url
    or b.gallery_urls is distinct from u.sanitized_gallery_urls
    or b.image_url is distinct from u.final_image_url
  );

-- 3) Validation summary (all should be 0).
select
  count(*) filter (where logo_url like '/placeholders/%' or logo_url = '/placeholder-logo.png') as logo_placeholders_left,
  count(*) filter (where cover_url like '/placeholders/%' or cover_url = '/placeholder-logo.png') as cover_placeholders_left,
  count(*) filter (
    where exists (
      select 1
      from unnest(coalesce(gallery_urls, '{}'::text[])) as item
      where item like '/placeholders/%' or item = '/placeholder-logo.png'
    )
  ) as gallery_placeholders_left
from public.businesses;
