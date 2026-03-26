-- SQL Migration: Enable Guest Access for Job Offer Analysis
-- Phase: EXECUTION (Phase 1)
-- Date: 2026-03-25

-- 1. Make user_id nullable in job_offers
alter table public.job_offers alter column user_id drop not null;

-- 2. Add RLS policy to allow guests to create job offers
do $$ begin
  create policy "Guests can create job offers"
    on public.job_offers for insert
    with check (user_id is null);
exception when duplicate_object then null; end $$;

-- 3. Add RLS policy to allow anyone to read job offers if user_id is null (Security by ID)
do $$ begin
  create policy "Anyone can read anonymous job offers"
    on public.job_offers for select
    using (user_id is null);
exception when duplicate_object then null; end $$;

-- 4. Add RLS policy to allow anyone to read analyses for anonymous job offers
do $$ begin
  create policy "Anyone can read anonymous job offer analyses"
    on public.job_offer_analyses for select
    using (
      exists (
        select 1
        from public.job_offers jo
        where jo.id = job_offer_id
          and jo.user_id is null
      )
    );
exception when duplicate_object then null; end $$;

-- 5. Grant permissions to anon role
grant insert, select on public.job_offers to anon;
grant select on public.job_offer_analyses to anon;
