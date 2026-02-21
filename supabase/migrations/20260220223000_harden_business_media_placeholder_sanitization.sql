begin;

create or replace function public.sync_business_legacy_columns()
returns trigger
language plpgsql
as $$
begin
  if new.logo_url is not null
     and (new.logo_url like '/placeholders/%' or new.logo_url = '/placeholder-logo.png') then
    new.logo_url := null;
  end if;

  if new.cover_url is not null
     and (new.cover_url like '/placeholders/%' or new.cover_url = '/placeholder-logo.png') then
    new.cover_url := null;
  end if;

  if new.gallery_urls is not null then
    select coalesce(array_agg(item), '{}'::text[])
      into new.gallery_urls
    from unnest(new.gallery_urls) as item
    where item is not null
      and btrim(item) <> ''
      and item not like '/placeholders/%'
      and item <> '/placeholder-logo.png';
  else
    new.gallery_urls := '{}'::text[];
  end if;

  if new.image_url is not null
     and (new.image_url like '/placeholders/%' or new.image_url = '/placeholder-logo.png') then
    new.image_url := null;
  end if;

  if new.overall_rating is null and new.average_rating is not null then
    new.overall_rating := new.average_rating;
  end if;
  if new.average_rating is null and new.overall_rating is not null then
    new.average_rating := new.overall_rating;
  end if;
  if new.image_url is null then
    new.image_url := coalesce(new.logo_url, new.cover_url);
  end if;
  return new;
end;
$$;

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

commit;
