create or replace view public.job_offer_business_insights as
with base as (
  select
    jo.business_id,
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
work_model_top as (
  select business_id, work_model
  from work_model_ranked
  where rank_position = 1
),
contract_top as (
  select business_id, contract_type
  from contract_ranked
  where rank_position = 1
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
  max(base.submitted_at) as last_offer_at
from base
left join work_model_top on work_model_top.business_id = base.business_id
left join contract_top on contract_top.business_id = base.business_id
group by base.business_id;

grant select on public.job_offer_business_insights to authenticated, anon, service_role;
