-- Create table for Seasonal Collections
create table public.seasonal_collections (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  subtitle text not null,
  image_url text not null,
  image_hint text,
  link_config jsonb not null default '{}'::jsonb,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table seasonal_collections enable row level security;

-- Policies
create policy "Public collections are viewable by everyone" on seasonal_collections for select using (true);
create policy "Admins can insert collections" on seasonal_collections for insert with check (auth.role() = 'service_role' or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can update collections" on seasonal_collections for update using (auth.role() = 'service_role' or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can delete collections" on seasonal_collections for delete using (auth.role() = 'service_role' or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
