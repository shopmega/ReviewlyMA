-- =============================================
-- COMPLETE ADMIN TABLES FOR AVIS.MA
-- Run this after the base tables (SUPABASE_SETUP.md)
-- =============================================

-- Ensure UUID extension is enabled
create extension if not exists "uuid-ossp";

-- =============================================
-- 1. SEASONAL COLLECTIONS (Homepage Carousel)
-- =============================================
create table if not exists public.seasonal_collections (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  subtitle text not null,
  image_url text not null,
  image_hint text,
  link_config jsonb not null default '{}'::jsonb,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for seasonal_collections
alter table seasonal_collections enable row level security;

create policy "Public collections are viewable by everyone" 
  on seasonal_collections for select using (true);
create policy "Admins can insert collections" 
  on seasonal_collections for insert 
  with check (auth.role() = 'service_role' or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can update collections" 
  on seasonal_collections for update 
  using (auth.role() = 'service_role' or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can delete collections" 
  on seasonal_collections for delete 
  using (auth.role() = 'service_role' or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));


-- =============================================
-- 2. SITE SETTINGS (Admin Configuration)
-- =============================================
create table if not exists public.site_settings (
  id text primary key default 'main',
  site_name text not null default 'Avis.ma',
  site_description text,
  contact_email text,
  support_phone text,
  facebook_url text,
  twitter_url text,
  instagram_url text,
  linkedin_url text,
  maintenance_mode boolean default false,
  allow_new_registrations boolean default true,
  require_email_verification boolean default true,
  default_language text default 'fr',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for site_settings
alter table site_settings enable row level security;

create policy "Settings are viewable by everyone" 
  on site_settings for select using (true);
create policy "Admins can update settings" 
  on site_settings for update 
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can insert settings" 
  on site_settings for insert 
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Insert default settings
insert into site_settings (id) values ('main') on conflict do nothing;


-- =============================================
-- 3. BUSINESS CLAIMS (Pro users claiming ownership)
-- =============================================
create table if not exists public.business_claims (
  id uuid default uuid_generate_v4() primary key,
  business_id text references businesses(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  full_name text not null,
  job_title text,
  email text not null,
  phone text,
  proof_document_url text,  -- Legacy field
  proof_status jsonb default '{}',  -- Current verification status for each method
  proof_data jsonb default '{}',    -- Metadata for verification (file URLs, verification flags)
  proof_methods text[] default '{}', -- Selected verification methods
  message text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reviewed_at timestamp with time zone
);

-- RLS for business_claims
alter table business_claims enable row level security;

create policy "Users can view own claims" 
  on business_claims for select 
  using (auth.uid() = user_id);
create policy "Users can create claims" 
  on business_claims for insert 
  with check (auth.uid() = user_id);
create policy "Admins can view all claims" 
  on business_claims for select 
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Users can update own claims for verification" on business_claims for update 
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (proof_status is distinct from old.proof_status or proof_data is distinct from old.proof_data)
    and old.status = status
    and old.admin_notes = admin_notes
    and old.reviewed_at = reviewed_at
  );
create policy "Admins can update all claims" on business_claims for update 
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));


-- =============================================
-- 4. REVIEW REPORTS (Flagged reviews)
-- =============================================
create table if not exists public.review_reports (
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

-- RLS for review_reports
alter table review_reports enable row level security;

create policy "Users can create reports" 
  on review_reports for insert 
  with check (auth.uid() = reporter_id);
create policy "Admins can view all reports" 
  on review_reports for select 
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can update reports" 
  on review_reports for update 
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));


-- =============================================
-- 5. MEDIA REPORTS (Flagged images/content)
-- =============================================
create table if not exists public.media_reports (
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

-- RLS for media_reports
alter table media_reports enable row level security;

create policy "Users can create media reports" 
  on media_reports for insert 
  with check (auth.uid() = reporter_id);
create policy "Admins can view media reports" 
  on media_reports for select 
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can update media reports" 
  on media_reports for update 
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));


-- =============================================
-- 6. ADD BUSINESS_ID TO PROFILES (For Pro users)
-- =============================================
alter table profiles add column if not exists business_id text references businesses(id) on delete set null;


-- =============================================
-- SUMMARY OF TABLES CREATED:
-- =============================================
-- 1. seasonal_collections - Homepage carousel management
-- 2. site_settings        - Global site configuration  
-- 3. business_claims      - Business ownership claims
-- 4. review_reports       - Flagged review moderation
-- 5. media_reports        - Flagged media moderation
-- 6. profiles.business_id - Links Pro users to their business
-- =============================================
