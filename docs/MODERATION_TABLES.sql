-- =============================================
-- MODERATION TABLES FOR AVIS.MA
-- =============================================

-- 1. Business Claims (Pro users claiming ownership)
create table public.business_claims (
  id uuid default uuid_generate_v4() primary key,
  business_id text references businesses(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  full_name text not null,
  job_title text,
  email text not null,
  phone text,
  proof_document_url text,
  message text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reviewed_at timestamp with time zone
);

-- 2. Review Reports (Flagged reviews)
create table public.review_reports (
  id uuid default uuid_generate_v4() primary key,
  review_id integer not null,
  business_id text references businesses(id) on delete cascade,
  reporter_id uuid references profiles(id) on delete set null,
  reason text not null check (reason in ('spam', 'fake', 'offensive', 'irrelevant', 'other')),
  details text,
  status text default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved_at timestamp with time zone
);

-- 3. Media Reports (Flagged images/content)
create table public.media_reports (
  id uuid default uuid_generate_v4() primary key,
  media_url text not null,
  media_type text default 'image' check (media_type in ('image', 'video', 'document')),
  business_id text references businesses(id) on delete cascade,
  reporter_id uuid references profiles(id) on delete set null,
  reason text not null check (reason in ('inappropriate', 'copyright', 'misleading', 'spam', 'other')),
  details text,
  status text default 'pending' check (status in ('pending', 'removed', 'dismissed')),
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved_at timestamp with time zone
);

-- RLS Policies
alter table business_claims enable row level security;
alter table review_reports enable row level security;
alter table media_reports enable row level security;

-- Business Claims Policies
create policy "Users can view own claims" on business_claims for select using (auth.uid() = user_id);
create policy "Users can create claims" on business_claims for insert with check (auth.uid() = user_id);
create policy "Admins can view all claims" on business_claims for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can update claims" on business_claims for update using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Review Reports Policies  
create policy "Users can create reports" on review_reports for insert with check (auth.uid() = reporter_id);
create policy "Admins can view all reports" on review_reports for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can update reports" on review_reports for update using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Media Reports Policies
create policy "Users can create media reports" on media_reports for insert with check (auth.uid() = reporter_id);
create policy "Admins can view media reports" on media_reports for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can update media reports" on media_reports for update using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Add business_id to profiles for Pro users
alter table profiles add column if not exists business_id text references businesses(id) on delete set null;
