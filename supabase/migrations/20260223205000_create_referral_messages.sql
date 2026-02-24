-- In-app conversation thread for referral requests (candidate <-> offer owner).

create table if not exists public.job_referral_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.job_referral_requests(id) on delete cascade,
  sender_user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_job_referral_messages_request_created
  on public.job_referral_messages(request_id, created_at desc);

create index if not exists idx_job_referral_messages_sender
  on public.job_referral_messages(sender_user_id, created_at desc);

alter table public.job_referral_messages enable row level security;

drop policy if exists "Participants can read referral messages" on public.job_referral_messages;
create policy "Participants can read referral messages"
on public.job_referral_messages for select
to authenticated
using (
  exists (
    select 1
    from public.job_referral_requests r
    join public.job_referral_offers o on o.id = r.offer_id
    where r.id = request_id
      and (
        r.candidate_user_id = auth.uid()
        or o.user_id = auth.uid()
      )
  )
);

drop policy if exists "Participants can insert referral messages" on public.job_referral_messages;
create policy "Participants can insert referral messages"
on public.job_referral_messages for insert
to authenticated
with check (
  auth.uid() = sender_user_id
  and exists (
    select 1
    from public.job_referral_requests r
    join public.job_referral_offers o on o.id = r.offer_id
    where r.id = request_id
      and (
        r.candidate_user_id = auth.uid()
        or o.user_id = auth.uid()
      )
  )
);
