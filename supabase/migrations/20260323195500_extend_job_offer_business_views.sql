create or replace view public.job_offer_business_insights as
with base as (
  select
    jo.business_id,
    jo.job_title,
    jo.job_title_normalized,
    jo.submitted_at,
    jo.salary_min,
    jo.salary_max,
    jo.work_model,
    jo.contract_type,
    ja.transparency_score,
    ja.overall_offer_score,
    ja.market_position_label,
    ja.confidence_level
  from public.job_offers jo
  join public.job_offer_analyses ja on ja.job_offer_id = jo.id
  where jo.status = 'approved'
    and jo.business_id is not null
),
work_model_ranked as (
  select
    business_id,
    work_model,
    count(*)::int as sample_count,
    row_number() over (partition by business_id order by count(*) desc, work_model asc) as rank_position
  from base
  where work_model is not null
  group by business_id, work_model
),
contract_ranked as (
  select
    business_id,
    contract_type,
    count(*)::int as sample_count,
    row_number() over (partition by business_id order by count(*) desc, contract_type asc) as rank_position
  from base
  where contract_type is not null
  group by business_id, contract_type
),
role_ranked as (
  select
    business_id,
    coalesce(nullif(job_title_normalized, ''), nullif(job_title, ''), 'unknown-role') as role_key,
    max(job_title) as role_label,
    count(*)::int as offer_count,
    row_number() over (
      partition by business_id
      order by count(*) desc, coalesce(nullif(job_title_normalized, ''), nullif(job_title, ''), 'unknown-role') asc
    ) as rank_position
  from base
  group by business_id, coalesce(nullif(job_title_normalized, ''), nullif(job_title, ''), 'unknown-role')
),
work_model_top as (
  select business_id, work_model
  from work_model_ranked
  where rank_position = 1
),
contract_top as (
  select business_id, contract_type
  from contract_ranked
  where rank_position = 1
),
top_roles as (
  select
    business_id,
    jsonb_agg(
      jsonb_build_object(
        'role_key', role_key,
        'role_label', role_label,
        'offer_count', offer_count
      )
      order by offer_count desc, role_key asc
    ) as top_hiring_roles
  from role_ranked
  where rank_position <= 3
  group by business_id
)
select
  base.business_id,
  count(*)::int as approved_offer_count,
  round(avg(case when base.salary_min is not null or base.salary_max is not null then 100 else 0 end)::numeric, 2) as salary_disclosure_rate,
  round(avg(base.transparency_score)::numeric, 2) as avg_transparency_score,
  round(avg(base.overall_offer_score)::numeric, 2) as avg_overall_offer_score,
  round(avg(
    case base.confidence_level
      when 'high' then 100
      when 'medium' then 60
      else 20
    end
  )::numeric, 2) as avg_benchmark_confidence_score,
  round(avg(case when base.market_position_label = 'below_market' then 100 else 0 end)::numeric, 2) as below_market_rate,
  round(avg(case when base.market_position_label in ('above_market', 'strong_offer') then 100 else 0 end)::numeric, 2) as above_market_rate,
  round(avg(case when base.salary_min is null and base.salary_max is null then 100 else 0 end)::numeric, 2) as missing_salary_rate,
  round(avg(case when base.work_model = 'onsite' then 100 else 0 end)::numeric, 2) as onsite_rate,
  round(avg(case when base.work_model = 'hybrid' then 100 else 0 end)::numeric, 2) as hybrid_rate,
  round(avg(case when base.work_model = 'remote' then 100 else 0 end)::numeric, 2) as remote_rate,
  round(avg(case when base.contract_type = 'cdi' then 100 else 0 end)::numeric, 2) as cdi_rate,
  max(work_model_top.work_model) as dominant_work_model,
  max(contract_top.contract_type) as dominant_contract_type,
  max(top_roles.top_hiring_roles) as top_hiring_roles,
  max(base.submitted_at) as last_offer_at
from base
left join work_model_top on work_model_top.business_id = base.business_id
left join contract_top on contract_top.business_id = base.business_id
left join top_roles on top_roles.business_id = base.business_id
group by base.business_id;

create or replace view public.job_offer_business_monthly_trends as
with base as (
  select
    jo.business_id,
    date_trunc('month', jo.submitted_at)::date as month_date,
    jo.salary_min,
    jo.salary_max,
    ja.transparency_score,
    ja.overall_offer_score
  from public.job_offers jo
  join public.job_offer_analyses ja on ja.job_offer_id = jo.id
  where jo.status = 'approved'
    and jo.business_id is not null
)
select
  business_id,
  month_date,
  to_char(month_date, 'YYYY-MM') as month_key,
  count(*)::int as approved_offer_count,
  round(avg(case when salary_min is not null or salary_max is not null then 100 else 0 end)::numeric, 2) as salary_disclosure_rate,
  round(avg(transparency_score)::numeric, 2) as avg_transparency_score,
  round(avg(overall_offer_score)::numeric, 2) as avg_overall_offer_score
from base
group by business_id, month_date
order by business_id, month_date asc;

grant select on public.job_offer_business_insights to authenticated, anon, service_role;
grant select on public.job_offer_business_monthly_trends to authenticated, anon, service_role;
