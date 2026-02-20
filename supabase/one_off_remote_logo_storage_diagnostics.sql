-- Logo storage diagnostics (read-only).
-- Run in Supabase SQL Editor on the target environment.

-- 1) Bucket presence/config for business media.
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id in ('business-images', 'claim-proofs', 'carousel-images')
order by id;

-- 2) Storage policies affecting business-images.
select
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    coalesce(qual, '') ilike '%business-images%'
    or coalesce(with_check, '') ilike '%business-images%'
  )
order by policyname;

-- 3) Logo URL/path shape in businesses table.
select
  count(*) filter (where logo_url is null or btrim(logo_url) = '') as no_logo,
  count(*) filter (where logo_url ilike 'http://%' or logo_url ilike 'https://%') as full_url_logo,
  count(*) filter (where logo_url is not null and logo_url not ilike 'http://%' and logo_url not ilike 'https://%') as storage_path_logo
from public.businesses;

-- 4) Invalid logo path formats that can break rendering.
select
  id,
  name,
  logo_url
from public.businesses
where logo_url is not null
  and btrim(logo_url) <> ''
  and logo_url not ilike 'http://%'
  and logo_url not ilike 'https://%'
  and logo_url not like 'businesses/%'
order by updated_at desc nulls last
limit 50;

-- 5) DB logo refs that point to missing storage objects.
with logo_refs as (
  select
    b.id as business_id,
    b.name as business_name,
    b.logo_url,
    case
      when b.logo_url ilike 'http://%' or b.logo_url ilike 'https://%'
        then regexp_replace(b.logo_url, '^.*?/object/public/business-images/', '')
      else b.logo_url
    end as normalized_logo_path
  from public.businesses b
  where b.logo_url is not null
    and btrim(b.logo_url) <> ''
),
logo_refs_in_bucket as (
  select *
  from logo_refs
  where normalized_logo_path is not null
    and normalized_logo_path <> ''
    and normalized_logo_path not ilike 'http://%'
    and normalized_logo_path not ilike 'https://%'
)
select
  r.business_id,
  r.business_name,
  r.logo_url,
  r.normalized_logo_path
from logo_refs_in_bucket r
left join storage.objects o
  on o.bucket_id = 'business-images'
 and o.name = r.normalized_logo_path
where o.id is null
order by r.business_name
limit 100;

-- 6) Orphan storage objects (logo-like files not referenced by businesses.logo_url).
with normalized_logo_refs as (
  select distinct
    case
      when logo_url ilike 'http://%' or logo_url ilike 'https://%'
        then regexp_replace(logo_url, '^.*?/object/public/business-images/', '')
      else logo_url
    end as path
  from public.businesses
  where logo_url is not null
    and btrim(logo_url) <> ''
)
select
  o.name as object_path,
  o.created_at,
  o.updated_at
from storage.objects o
left join normalized_logo_refs r on r.path = o.name
where o.bucket_id = 'business-images'
  and (o.name ilike '%/logo.%' or o.name ilike '%logo%')
  and r.path is null
order by o.updated_at desc nulls last
limit 100;
