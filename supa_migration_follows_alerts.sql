-- 1. Create favorites/follows table
create table if not exists public.favorites (
  user_id uuid references auth.users(id) on delete cascade not null,
  business_id text references public.businesses(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, business_id)
);

alter table public.favorites enable row level security;

drop policy if exists "Users can view their own favorites" on public.favorites;
create policy "Users can view their own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own favorites" on public.favorites;
create policy "Users can insert their own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own favorites" on public.favorites;
create policy "Users can delete their own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);


-- 2. Enable Global Notifications (System Alerts)
-- Allow user_id to be NULL for global messages
alter table public.notifications alter column user_id drop not null;

-- Add index for performance check
create index if not exists notifications_user_id_idx on public.notifications(user_id);

-- Update RLS to allow viewing global notifications
drop policy if exists "Users can view their own notifications" on public.notifications;
-- Drop possibly created policy from previous run to avoid error if duplicated name
drop policy if exists "Users can view their own and global notifications" on public.notifications;

create policy "Users can view their own and global notifications"
  on public.notifications for select
  using (auth.uid() = user_id or user_id is null);

-- Allow business owners to see who follows them
drop policy if exists "Business owners can view their followers" on public.favorites;
create policy "Business owners can view their followers"
  on public.favorites for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.business_id = favorites.business_id
      and profiles.role = 'pro'
    )
  );
