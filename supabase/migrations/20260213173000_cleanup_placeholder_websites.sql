begin;

-- Remove placeholder/fake website URLs from imported businesses.
-- Keep only meaningful domains.

update public.businesses
set website = null
where website is not null
  and (
    lower(website) like '%example.com%'
    or lower(website) like '%test.com%'
    or lower(website) like '%placeholder%'
    or lower(website) like '%localhost%'
    or lower(website) like '%.local%'
    or lower(website) like '%yourdomain%'
    or lower(website) like '%your-domain%'
    or lower(website) like '%your-site%'
  );

commit;

