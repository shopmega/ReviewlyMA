alter table public.job_offers
  add column if not exists company_match_confidence text not null default 'none'
    check (company_match_confidence in ('high', 'medium', 'low', 'none')),
  add column if not exists company_match_method text not null default 'none'
    check (company_match_method in ('slug', 'id', 'name', 'website', 'scored', 'manual', 'none')),
  add column if not exists company_match_candidates jsonb not null default '[]'::jsonb;

create index if not exists idx_job_offers_company_match_confidence
  on public.job_offers(company_match_confidence);

create or replace view public.admin_job_offer_mapping_v1 as
select
  jo.id as job_offer_id,
  jo.user_id,
  jo.business_id,
  jo.company_name,
  jo.job_title,
  jo.city,
  jo.source_url,
  jo.status,
  jo.visibility,
  jo.company_match_confidence,
  jo.company_match_method,
  jo.company_match_candidates,
  jo.submitted_at,
  ja.overall_offer_score,
  ja.transparency_score,
  ja.market_position_label,
  ja.confidence_level
from public.job_offers jo
left join public.job_offer_analyses ja on ja.job_offer_id = jo.id
where jo.business_id is null
   or jo.company_match_confidence in ('medium', 'low', 'none');

grant select on public.admin_job_offer_mapping_v1 to service_role;
