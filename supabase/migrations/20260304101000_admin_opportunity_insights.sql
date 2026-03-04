-- Admin opportunity insights foundation
-- Date: 2026-03-04
-- Purpose: rank businesses for paid conversion (claimed) and acquisition outreach (unclaimed)

create table if not exists public.business_outreach_pipeline (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(id) on delete cascade,
  stage text not null default 'new' check (stage in ('new','contacted','interested','claimed','upgraded','lost')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  owner_admin_id uuid references public.profiles(id) on delete set null,
  source text not null default 'admin-opportunity' check (source in ('admin-opportunity','manual','import')),
  contact_name text,
  contact_email text,
  contact_phone text,
  contact_channel text check (contact_channel in ('email','phone','linkedin','whatsapp','other')),
  notes text,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  claimed_at timestamptz,
  upgraded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (business_id)
);

create index if not exists idx_business_outreach_pipeline_stage on public.business_outreach_pipeline(stage);
create index if not exists idx_business_outreach_pipeline_owner on public.business_outreach_pipeline(owner_admin_id);
create index if not exists idx_business_outreach_pipeline_next_follow_up on public.business_outreach_pipeline(next_follow_up_at);

alter table public.business_outreach_pipeline enable row level security;

do $$ begin
  create policy "Admins can manage outreach pipeline"
    on public.business_outreach_pipeline for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role can manage outreach pipeline"
    on public.business_outreach_pipeline for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

drop trigger if exists trg_business_outreach_pipeline_updated_at on public.business_outreach_pipeline;
create trigger trg_business_outreach_pipeline_updated_at
before update on public.business_outreach_pipeline
for each row execute function public.update_updated_at_column();

-- Opportunity read model.
-- 30-day rolling metrics + weighted score split for upgrade vs acquisition workflows.
create or replace view public.admin_business_opportunity_v1 as
with approved_claims as (
  select distinct business_id
  from public.business_claims
  where status = 'approved'
),
business_base as (
  select
    b.id as business_id,
    b.name,
    b.city,
    b.category,
    b.tier,
    b.is_premium,
    b.user_id,
    b.average_rating,
    b.review_count,
    (b.user_id is not null or ac.business_id is not null) as is_claimed
  from public.businesses b
  left join approved_claims ac on ac.business_id = b.id
  where b.status <> 'deleted'
),
analytics_30d as (
  select
    ba.business_id,
    count(*) filter (where ba.event_type = 'page_view')::int as views_30d,
    count(*) filter (where ba.event_type in ('phone_click','website_click','contact_form','whatsapp_click'))::int as leads_30d,
    count(*) filter (where ba.event_type = 'whatsapp_click')::int as whatsapp_clicks_30d,
    max(ba.created_at) as last_analytics_at
  from public.business_analytics ba
  where ba.created_at >= timezone('utc'::text, now()) - interval '30 days'
  group by ba.business_id
),
reviews_30d as (
  select
    r.business_id,
    count(*)::int as reviews_30d,
    avg(r.rating)::numeric(3,2) as avg_rating_30d,
    max(r.created_at) as last_review_at
  from public.reviews r
  where r.status = 'published'
    and r.created_at >= timezone('utc'::text, now()) - interval '30 days'
  group by r.business_id
),
saves_30d as (
  select
    sb.business_id,
    count(*)::int as saves_30d,
    max(sb.created_at) as last_saved_at
  from public.saved_businesses sb
  where sb.created_at >= timezone('utc'::text, now()) - interval '30 days'
  group by sb.business_id
),
metrics as (
  select
    bb.business_id,
    bb.name,
    bb.city,
    bb.category,
    bb.tier,
    bb.is_premium,
    bb.is_claimed,
    coalesce(a.views_30d, 0) as views_30d,
    coalesce(a.leads_30d, 0) as leads_30d,
    coalesce(a.whatsapp_clicks_30d, 0) as whatsapp_clicks_30d,
    coalesce(s.saves_30d, 0) as saves_30d,
    coalesce(r.reviews_30d, 0) as reviews_30d,
    coalesce(r.avg_rating_30d, bb.average_rating, 0)::numeric(3,2) as avg_rating_30d,
    case
      when coalesce(a.views_30d, 0) > 0 then round((coalesce(a.leads_30d, 0)::numeric / a.views_30d::numeric) * 100, 2)
      else 0
    end as lead_rate_30d,
    greatest(coalesce(a.last_analytics_at, 'epoch'::timestamptz), coalesce(r.last_review_at, 'epoch'::timestamptz), coalesce(s.last_saved_at, 'epoch'::timestamptz)) as last_signal_at
  from business_base bb
  left join analytics_30d a on a.business_id = bb.business_id
  left join reviews_30d r on r.business_id = bb.business_id
  left join saves_30d s on s.business_id = bb.business_id
),
scored as (
  select
    m.*,
    least(100::numeric,
      (ln((1 + m.views_30d)::numeric) * 18)
      + (ln((1 + m.leads_30d)::numeric) * 28)
      + (ln((1 + m.saves_30d)::numeric) * 20)
    ) as traction_score,
    least(100::numeric,
      ((m.avg_rating_30d / 5.0) * 65)
      + (least(m.reviews_30d, 25)::numeric / 25.0 * 35)
    ) as reputation_score,
    least(100::numeric,
      (least(m.lead_rate_30d, 25)::numeric / 25.0 * 80)
      + (least(m.whatsapp_clicks_30d, 10)::numeric / 10.0 * 20)
    ) as intent_score
  from metrics m
)
select
  s.business_id,
  s.name,
  s.city,
  s.category,
  s.tier,
  s.is_premium,
  s.is_claimed,
  s.views_30d,
  s.leads_30d,
  s.saves_30d,
  s.reviews_30d,
  s.avg_rating_30d,
  s.lead_rate_30d,
  round(s.traction_score::numeric, 2) as traction_score,
  round(s.reputation_score::numeric, 2) as reputation_score,
  round(s.intent_score::numeric, 2) as intent_score,
  round(
    (s.traction_score * 0.35)
    + (s.reputation_score * 0.30)
    + (s.intent_score * 0.35)
    + (case when s.is_claimed then 5 else 0 end),
    2
  ) as upgrade_score,
  round(
    (s.traction_score * 0.45)
    + (s.reputation_score * 0.20)
    + (s.intent_score * 0.35)
    + (case when s.is_claimed then 0 else 15 end),
    2
  ) as acquisition_score,
  case
    when (not s.is_claimed) and ((s.traction_score * 0.45) + (s.reputation_score * 0.20) + (s.intent_score * 0.35) + 15) >= 55
      then 'outreach'
    when s.is_claimed and (not s.is_premium) and ((s.traction_score * 0.35) + (s.reputation_score * 0.30) + (s.intent_score * 0.35) + 5) >= 60
      then 'upgrade'
    else 'monitor'
  end as recommended_action,
  s.last_signal_at
from scored s;

grant select on public.admin_business_opportunity_v1 to service_role;
