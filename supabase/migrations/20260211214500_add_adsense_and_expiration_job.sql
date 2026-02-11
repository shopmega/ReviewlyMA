begin;

-- AdSense settings on site_settings
alter table public.site_settings
add column if not exists adsense_enabled boolean not null default false,
add column if not exists adsense_client_id text,
add column if not exists adsense_auto_ads_enabled boolean not null default false,
add column if not exists adsense_config jsonb not null default '{}'::jsonb;

-- Ensure defaults for main row
update public.site_settings
set
  adsense_enabled = coalesce(adsense_enabled, false),
  adsense_auto_ads_enabled = coalesce(adsense_auto_ads_enabled, false),
  adsense_config = coalesce(adsense_config, '{}'::jsonb)
where id = 'main';

-- Expire premium profiles/businesses in DB (can be called by pg_cron or external cron)
create or replace function public.expire_premium_accounts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profiles_count int := 0;
  v_businesses_count int := 0;
begin
  with expired_profiles as (
    update public.profiles p
    set
      is_premium = false,
      tier = 'none',
      updated_at = timezone('utc'::text, now())
    where
      p.is_premium = true
      and p.premium_expires_at is not null
      and p.premium_expires_at < timezone('utc'::text, now())
    returning p.id, p.business_id
  )
  select count(*) into v_profiles_count from expired_profiles;

  with expired_businesses as (
    update public.businesses b
    set
      is_premium = false,
      tier = 'none',
      updated_at = timezone('utc'::text, now())
    where
      b.is_premium = true
      and exists (
        select 1
        from public.profiles p
        where p.business_id = b.id
          and p.premium_expires_at is not null
          and p.premium_expires_at < timezone('utc'::text, now())
      )
    returning b.id
  )
  select count(*) into v_businesses_count from expired_businesses;

  insert into public.admin_audit_log (admin_id, action, details)
  values (
    null,
    'premium_expiration_job',
    jsonb_build_object(
      'profiles_updated', v_profiles_count,
      'businesses_updated', v_businesses_count,
      'ran_at', timezone('utc'::text, now())
    )
  );

  return jsonb_build_object(
    'ok', true,
    'profiles_updated', v_profiles_count,
    'businesses_updated', v_businesses_count
  );
end;
$$;

grant execute on function public.expire_premium_accounts() to service_role;

-- Optional DB scheduler: run daily at 03:10 UTC, only if pg_cron exists.
do $$
declare
  v_jobid int;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      select jobid into v_jobid
      from cron.job
      where jobname = 'expire-premium-accounts-daily'
      limit 1;

      if v_jobid is not null then
        perform cron.unschedule(v_jobid);
      end if;

      perform cron.schedule(
        'expire-premium-accounts-daily',
        '10 3 * * *',
        $job$select public.expire_premium_accounts();$job$
      );
    exception
      when undefined_table then
        null;
      when undefined_function then
        null;
    end;
  end if;
end $$;

commit;
