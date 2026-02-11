-- Multi-business + premium + messaging (tables + RPC)

create table if not exists public.user_businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id text not null references public.businesses(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','manager','employee')),
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(user_id, business_id)
);

create unique index if not exists user_businesses_one_primary_per_user
  on public.user_businesses(user_id)
  where is_primary = true;

create index if not exists idx_user_businesses_user_id on public.user_businesses(user_id);
create index if not exists idx_user_businesses_business_id on public.user_businesses(business_id);

alter table public.user_businesses enable row level security;
do $$ begin
  create policy "Users can view own business assignments"
    on public.user_businesses for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Admins can manage business assignments"
    on public.user_businesses for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage business assignments"
    on public.user_businesses for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

drop trigger if exists trg_user_businesses_updated_at on public.user_businesses;
create trigger trg_user_businesses_updated_at
before update on public.user_businesses
for each row execute function public.update_updated_at_column();

create table if not exists public.premium_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade unique,
  max_businesses integer not null default 1,
  subscription_tier text not null default 'none',
  subscription_status text not null default 'active' check (subscription_status in ('active','inactive','cancelled')),
  subscription_expires_at timestamptz,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.premium_users enable row level security;
do $$ begin
  create policy "Users can view own premium record"
    on public.premium_users for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Admins can manage premium users"
    on public.premium_users for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage premium users"
    on public.premium_users for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

drop trigger if exists trg_premium_users_updated_at on public.premium_users;
create trigger trg_premium_users_updated_at
before update on public.premium_users
for each row execute function public.update_updated_at_column();

create table if not exists public.premium_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id text references public.businesses(id) on delete set null,
  payment_reference text not null unique,
  payment_method text default 'offline',
  amount_usd numeric(10,2),
  currency text default 'USD',
  status text not null default 'pending' check (status in ('pending','verified','rejected','refunded')),
  notes text,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  target_tier text default 'gold',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_premium_payments_user_id on public.premium_payments(user_id);
create index if not exists idx_premium_payments_status on public.premium_payments(status);
create index if not exists idx_premium_payments_created_at on public.premium_payments(created_at desc);

alter table public.premium_payments enable row level security;
do $$ begin
  create policy "Users can view their own payments"
    on public.premium_payments for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Admins can view all payments"
    on public.premium_payments for select
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Admins can update payments"
    on public.premium_payments for update
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage payments"
    on public.premium_payments for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

drop trigger if exists trg_premium_payments_updated_at on public.premium_payments;
create trigger trg_premium_payments_updated_at
before update on public.premium_payments
for each row execute function public.update_updated_at_column();

-- Messaging table (premium contact)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_name text,
  sender_email text,
  content text not null,
  is_from_business boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_messages_business_id on public.messages(business_id);
create index if not exists idx_messages_created_at on public.messages(created_at desc);

alter table public.messages enable row level security;
do $$ begin
  create policy "Anyone can send a regular message" on public.messages
    for insert
    with check (
      (is_from_business = false) or
      (
        auth.uid() is not null and
        exists (
          select 1 from public.profiles
          where id = auth.uid()
            and (role = 'admin' or business_id = messages.business_id)
        )
      )
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Owners and admins can view messages" on public.messages
    for select
    using (
      auth.uid() is not null and
      exists (
        select 1 from public.profiles
        where id = auth.uid()
          and (role = 'admin' or business_id = messages.business_id)
      )
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Owners and admins can update messages" on public.messages
    for update
    using (
      auth.uid() is not null and
      exists (
        select 1 from public.profiles
        where id = auth.uid()
          and (role = 'admin' or business_id = messages.business_id)
      )
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage messages"
    on public.messages for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

-- RPC used by admin UI for atomic premium changes.
create or replace function public.toggle_user_premium(
  p_user_id uuid,
  p_tier text,
  p_is_premium boolean,
  p_granted_at timestamptz default now(),
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_business_ids text[];
  v_updated_count integer := 0;
begin
  update public.profiles
  set
    is_premium = p_is_premium,
    tier = p_tier,
    premium_granted_at = p_granted_at,
    premium_expires_at = p_expires_at,
    updated_at = timezone('utc'::text, now())
  where id = p_user_id;

  select coalesce(array_agg(business_id), array[]::text[])
  into v_business_ids
  from (
    select business_id from public.profiles where id = p_user_id and business_id is not null
    union
    select business_id from public.user_businesses where user_id = p_user_id
  ) x;

  if array_length(v_business_ids, 1) > 0 then
    update public.businesses
    set
      is_premium = p_is_premium,
      tier = p_tier,
      updated_at = timezone('utc'::text, now())
    where id = any(v_business_ids);
    get diagnostics v_updated_count = row_count;
  end if;

  return jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'tier', p_tier,
    'is_premium', p_is_premium,
    'businesses_updated', v_updated_count,
    'business_ids', v_business_ids
  );
exception when others then
  return jsonb_build_object('success', false, 'error', sqlerrm, 'detail', sqlstate);
end;
$$;

grant execute on function public.toggle_user_premium(uuid, text, boolean, timestamptz, timestamptz) to service_role;
grant execute on function public.toggle_user_premium(uuid, text, boolean, timestamptz, timestamptz) to postgres;

