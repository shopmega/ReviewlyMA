-- Reporting + business media diagnostics (read-only).
-- Run in Supabase SQL Editor on target environment.

-- =========================================================
-- A) REPORTING DOMAIN HEALTH
-- =========================================================

-- A1) Table presence + RLS for report tables
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('review_reports', 'business_reports', 'media_reports')
order by tablename;

-- A2) Policy inventory for report tables
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('review_reports', 'business_reports', 'media_reports')
order by tablename, policyname;

-- A3) Report lifecycle integrity snapshots
select
  'review_reports_invalid_status' as check_name,
  count(*)::bigint as issue_count
from public.review_reports
where status not in ('pending', 'resolved', 'dismissed')
union all
select
  'review_reports_missing_review',
  count(*)::bigint
from public.review_reports rr
left join public.reviews r on r.id = rr.review_id
where r.id is null
union all
select
  'business_reports_missing_business',
  count(*)::bigint
from public.business_reports br
left join public.businesses b on b.id = br.business_id
where b.id is null
order by check_name;

-- =========================================================
-- B) PRO MEDIA / COVER-GALLERY CONSISTENCY
-- =========================================================

-- B1) Coverage snapshot
select
  count(*) filter (where cover_url is null or btrim(cover_url) = '') as cover_missing_count,
  count(*) filter (where gallery_urls is null or cardinality(gallery_urls) = 0) as gallery_missing_count,
  count(*) filter (
    where (cover_url is null or btrim(cover_url) = '')
      and gallery_urls is not null
      and cardinality(gallery_urls) > 0
  ) as cover_missing_but_gallery_present_count
from public.businesses;

-- B2) Invalid cover path formats
select
  id,
  name,
  cover_url
from public.businesses
where cover_url is not null
  and btrim(cover_url) <> ''
  and cover_url not ilike 'http://%'
  and cover_url not ilike 'https://%'
  and cover_url not like 'businesses/%'
order by updated_at desc nulls last
limit 100;

-- B2.b) Invalid logo path formats
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
limit 100;

-- B3) Cover URL points to missing object in storage bucket
with cover_refs as (
  select
    b.id as business_id,
    b.name as business_name,
    b.cover_url,
    case
      when b.cover_url ilike 'http://%' or b.cover_url ilike 'https://%'
        then regexp_replace(b.cover_url, '^.*?/object/public/business-images/', '')
      else b.cover_url
    end as normalized_cover_path
  from public.businesses b
  where b.cover_url is not null
    and btrim(b.cover_url) <> ''
),
cover_refs_in_bucket as (
  select *
  from cover_refs
  where normalized_cover_path is not null
    and normalized_cover_path <> ''
    and normalized_cover_path not ilike 'http://%'
    and normalized_cover_path not ilike 'https://%'
)
select
  r.business_id,
  r.business_name,
  r.cover_url,
  r.normalized_cover_path
from cover_refs_in_bucket r
left join storage.objects o
  on o.bucket_id = 'business-images'
 and o.name = r.normalized_cover_path
where o.id is null
order by r.business_name
limit 100;

-- B3.b) Logo URL points to missing object in storage bucket
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

-- B4) Gallery entries that are missing storage objects
with gallery_expanded as (
  select
    b.id as business_id,
    b.name as business_name,
    unnest(coalesce(b.gallery_urls, '{}'::text[])) as raw_gallery_path
  from public.businesses b
),
gallery_normalized as (
  select
    business_id,
    business_name,
    raw_gallery_path,
    case
      when raw_gallery_path ilike 'http://%' or raw_gallery_path ilike 'https://%'
        then regexp_replace(raw_gallery_path, '^.*?/object/public/business-images/', '')
      else raw_gallery_path
    end as normalized_gallery_path
  from gallery_expanded
  where raw_gallery_path is not null
    and btrim(raw_gallery_path) <> ''
)
select
  g.business_id,
  g.business_name,
  g.raw_gallery_path,
  g.normalized_gallery_path
from gallery_normalized g
left join storage.objects o
  on o.bucket_id = 'business-images'
 and o.name = g.normalized_gallery_path
where o.id is null
order by g.business_name
limit 100;

-- B4.b) Gallery placeholder entries (should be 0 after cleanup)
with gallery_expanded as (
  select
    b.id as business_id,
    b.name as business_name,
    unnest(coalesce(b.gallery_urls, '{}'::text[])) as gallery_item
  from public.businesses b
)
select
  business_id,
  business_name,
  gallery_item
from gallery_expanded
where gallery_item like '/placeholders/%'
   or gallery_item = '/placeholder-logo.png'
order by business_name
limit 100;

-- B5) Potential cross-field confusion: cover path exactly matches one gallery item
with gallery_expanded as (
  select
    b.id as business_id,
    unnest(coalesce(b.gallery_urls, '{}'::text[])) as gallery_item
  from public.businesses b
)
select
  b.id as business_id,
  b.name as business_name,
  b.cover_url,
  g.gallery_item as matching_gallery_item
from public.businesses b
join gallery_expanded g on g.business_id = b.id
where b.cover_url is not null
  and btrim(b.cover_url) <> ''
  and b.cover_url = g.gallery_item
order by b.updated_at desc nulls last
limit 100;

-- B6) Placeholder media still persisted in DB (should be 0 after cleanup + migration)
select
  count(*) filter (where logo_url like '/placeholders/%' or logo_url = '/placeholder-logo.png') as logo_placeholders_count,
  count(*) filter (where cover_url like '/placeholders/%' or cover_url = '/placeholder-logo.png') as cover_placeholders_count,
  count(*) filter (
    where exists (
      select 1
      from unnest(coalesce(gallery_urls, '{}'::text[])) as item
      where item like '/placeholders/%' or item = '/placeholder-logo.png'
    )
  ) as gallery_placeholders_count
from public.businesses;

-- B7) Last 50 created businesses carrying placeholders (should return 0 rows)
select
  id,
  name,
  created_at,
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
order by created_at desc
limit 50;
