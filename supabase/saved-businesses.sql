-- Table for saved/bookmarked businesses
create table if not exists public.saved_businesses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  business_id text references public.businesses(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, business_id)
);

-- Enable RLS
alter table public.saved_businesses enable row level security;

-- Policies
create policy "Users can view their own saved businesses"
  on public.saved_businesses for select
  using (auth.uid() = user_id);

create policy "Users can save businesses"
  on public.saved_businesses for insert
  with check (auth.uid() = user_id);

create policy "Users can unsave businesses"
  on public.saved_businesses for delete
  using (auth.uid() = user_id);
