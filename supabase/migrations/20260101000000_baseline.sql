-- Baseline schema for Avis-prod (Supabase reset / squash migration)
-- Apply to a fresh project after resetting Supabase.

begin;

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- Helpers
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create or replace function public.sync_business_legacy_columns()
returns trigger
language plpgsql
as $$
begin
  if new.overall_rating is null and new.average_rating is not null then
    new.overall_rating := new.average_rating;
  end if;
  if new.average_rating is null and new.overall_rating is not null then
    new.average_rating := new.overall_rating;
  end if;
  if new.image_url is null then
    new.image_url := coalesce(new.logo_url, new.cover_url);
  end if;
  return new;
end;
$$;

create or replace function public.is_admin_user(p_uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_uid
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin_user(uuid) from public;
grant execute on function public.is_admin_user(uuid) to authenticated, anon, service_role;

-- businesses
create table if not exists public.businesses (
  id text primary key,
  slug text unique,
  name text not null,
  type text default 'company',
  category text,
  subcategory text,
  location text,
  address text,
  city text,
  quartier text,
  description text,
  phone text,
  website text,
  whatsapp_number text,

  company_size text,
  employee_count int,
  price_range int,

  logo_url text,
  logo_hint text,
  cover_url text,
  cover_hint text,
  gallery_urls text[] not null default '{}'::text[],
  image_url text,

  tags text[] not null default '{}'::text[],
  amenities text[] not null default '{}'::text[],
  benefits text[] not null default '{}'::text[],

  affiliate_link text,
  affiliate_cta text,
  admin_affiliate_link text,
  admin_affiliate_cta text,

  logo_requested boolean not null default false,
  is_featured boolean not null default false,
  is_sponsored boolean not null default false,
  is_premium boolean not null default false,
  tier text not null default 'none',

  status text not null default 'active' check (status in ('active','suspended','deleted')),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,

  owner_id uuid references auth.users(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,

  overall_rating numeric(3,2) not null default 0,
  average_rating numeric(3,2) not null default 0,
  review_count integer not null default 0,

  search_vector tsvector,

  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists idx_businesses_category on public.businesses(category);
create index if not exists idx_businesses_city on public.businesses(city);
create index if not exists idx_businesses_quartier on public.businesses(quartier);
create index if not exists idx_businesses_overall_rating on public.businesses(overall_rating desc);
create index if not exists idx_businesses_average_rating on public.businesses(average_rating desc);
create index if not exists idx_businesses_review_count on public.businesses(review_count desc);
create index if not exists idx_businesses_featured on public.businesses(is_featured);
create index if not exists idx_businesses_sponsored on public.businesses(is_sponsored);
create index if not exists idx_businesses_logo_requested on public.businesses(logo_requested);
create index if not exists idx_businesses_search_vector on public.businesses using gin(search_vector);

drop trigger if exists trg_businesses_updated_at on public.businesses;
create trigger trg_businesses_updated_at
before update on public.businesses
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_businesses_sync_legacy on public.businesses;
create trigger trg_businesses_sync_legacy
before insert or update on public.businesses
for each row execute function public.sync_business_legacy_columns();

alter table public.businesses enable row level security;

do $$ begin
  create policy "Public can read businesses" on public.businesses for select using (status <> 'deleted');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Owners can update their business" on public.businesses for update using (auth.uid() = owner_id);
exception when duplicate_object then null; end $$;

-- profiles
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('user','pro','admin')),
  avatar_url text,

  is_premium boolean not null default false,
  tier text not null default 'none',
  premium_granted_at timestamptz,
  premium_expires_at timestamptz,

  business_id text references public.businesses(id) on delete set null,
  auto_approve_media boolean not null default false,
  deletion_scheduled_at timestamptz,
  email_preferences jsonb not null default '{"marketing":true,"system":true,"review_replies":true,"claim_updates":true}'::jsonb,

  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_tier on public.profiles(tier);
create index if not exists idx_profiles_business_id on public.profiles(business_id);
create index if not exists idx_profiles_is_premium on public.profiles(is_premium);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

alter table public.profiles enable row level security;
-- auth -> profiles trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
-- profiles policies

do $$ begin
  create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can view all profiles" on public.profiles for select using (public.is_admin_user(auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role can manage profiles" on public.profiles for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;

-- businesses admin/service policies

do $$ begin
  create policy "Admins can manage businesses" on public.businesses for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role can manage businesses" on public.businesses for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Base app tables (reviews/updates/salaries/interviews)
-- ---------------------------------------------------------------------------

create table if not exists public.reviews (
  id bigserial primary key,
  business_id text references public.businesses(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  is_anonymous boolean not null default false,
  rating int not null check (rating between 1 and 5),
  title text,
  content text,
  date date default current_date,
  likes int not null default 0,
  dislikes int not null default 0,
  sub_ratings jsonb,
  status text not null default 'pending' check (status in ('published','pending','rejected','deleted')),
  owner_reply text,
  owner_reply_date date,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_reviews_business_id on public.reviews(business_id);
create index if not exists idx_reviews_user_id on public.reviews(user_id);
create index if not exists idx_reviews_status on public.reviews(status);
create index if not exists idx_reviews_created_at on public.reviews(created_at desc);

drop trigger if exists trg_reviews_updated_at on public.reviews;
create trigger trg_reviews_updated_at
before update on public.reviews
for each row execute function public.update_updated_at_column();

alter table public.reviews enable row level security;

do $$ begin
  create policy "Public reviews are viewable by everyone"
    on public.reviews for select using (status = 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can insert their own reviews"
    on public.reviews for insert to authenticated
    with check (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update their own reviews"
    on public.reviews for update to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can delete their own reviews"
    on public.reviews for delete to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can manage reviews"
    on public.reviews for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role can manage reviews"
    on public.reviews for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;

create table if not exists public.updates (
  id bigserial primary key,
  business_id text references public.businesses(id) on delete cascade not null,
  title text not null,
  content text not null,
  date date default current_date,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.updates enable row level security;
do $$ begin
  create policy "Public updates are viewable by everyone"
    on public.updates for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage updates"
    on public.updates for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;

create table if not exists public.salaries (
  id bigserial primary key,
  business_id text references public.businesses(id) on delete cascade not null,
  job_title text not null,
  salary numeric not null,
  location text,
  date text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.salaries enable row level security;
do $$ begin
  create policy "Public salaries are viewable by everyone"
    on public.salaries for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage salaries"
    on public.salaries for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;

create table if not exists public.interviews (
  id bigserial primary key,
  business_id text references public.businesses(id) on delete cascade not null,
  job_title text not null,
  experience text,
  difficulty text,
  questions text[],
  date text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.interviews enable row level security;
do $$ begin
  create policy "Public interviews are viewable by everyone"
    on public.interviews for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage interviews"
    on public.interviews for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;

-- ---- Appended: docs/ADMIN_TABLES.sql ----
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
  with check (auth.uid() = user_id);
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
-- ---- Appended: supa_migration_notifications.sql ----
-- Create notifications table
create table if not exists public.notifications (
    id bigint generated by default as identity primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    message text not null,
    type text not null, -- 'review', 'system', 'claim_update', etc.
    link text, -- URL to redirect to
    is_read boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
    on public.notifications for select
    using (auth.uid() = user_id);

create policy "Users can update their own notifications (mark as read)"
    on public.notifications for update
    using (auth.uid() = user_id);

-- Only system/admins can insert (usually done via server actions with service role or triggers)
-- For now, we allow authenticated users to insert if they are triggering an action (like a review)
-- meaningful security would likely require a trigger function or service role,
-- but for this app architecture, we'll allow insert for now or rely on server actions.
create policy "Authenticated users can insert notifications"
    on public.notifications for insert
    with check (auth.role() = 'authenticated');
-- ---- Appended: supa_migration_follows_alerts.sql ----
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
-- ---- Appended: supabase/create-business-hours-table.sql ----
-- Create business_hours table if it doesn't exist
-- day_of_week: 0=Dimanche, 1=Lundi, ..., 6=Samedi

CREATE TABLE IF NOT EXISTS public.business_hours (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(business_id, day_of_week)
);

-- RLS
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public business hours are viewable by everyone" ON public.business_hours;
CREATE POLICY "Public business hours are viewable by everyone" 
ON public.business_hours
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Owners can manage their own business hours" ON public.business_hours;
CREATE POLICY "Owners can manage their own business hours" 
ON public.business_hours
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.business_id = business_hours.business_id
    AND profiles.role = 'pro'
  )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_business_hours_business_id ON business_hours(business_id);

-- Atomic RPC function to replace business hours
-- This is used by the dashboard to save hours safely
CREATE OR REPLACE FUNCTION public.replace_business_hours(
    p_business_id TEXT,
    p_hours JSONB
) RETURNS VOID AS $$
BEGIN
    -- Delete existing hours for this business
    DELETE FROM public.business_hours WHERE business_id = p_business_id;
    
    -- Insert new hours from the JSONB array
    -- We use COALESCE and handle empty strings for time conversion
    INSERT INTO public.business_hours (business_id, day_of_week, open_time, close_time, is_closed)
    SELECT 
        p_business_id, 
        (h->>'day_of_week')::INT, 
        (NULLIF(h->>'open_time', ''))::TIME,
        (NULLIF(h->>'close_time', ''))::TIME,
        COALESCE((h->>'is_closed')::BOOLEAN, false)
    FROM jsonb_array_elements(p_hours) h;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ---- Appended: supabase/review-votes-trigger.sql ----
-- Review Votes table and triggers
-- Handles counting likes and dislikes on the reviews table

-- 1. Create review_votes table
CREATE TABLE IF NOT EXISTS public.review_votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    review_id BIGINT NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(review_id, user_id)
);

-- 2. Enable RLS
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Review votes are viewable by everyone" ON public.review_votes;
CREATE POLICY "Review votes are viewable by everyone" ON public.review_votes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can vote" ON public.review_votes;
CREATE POLICY "Authenticated users can vote" ON public.review_votes
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own vote" ON public.review_votes;
CREATE POLICY "Users can update their own vote" ON public.review_votes
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own vote" ON public.review_votes;
CREATE POLICY "Users can delete their own vote" ON public.review_votes
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Trigger function to update reviews table
CREATE OR REPLACE FUNCTION public.handle_review_vote_change()
RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT or UPDATE
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Recompute likes and dislikes for this review
        UPDATE public.reviews
        SET 
            likes = (SELECT COUNT(*) FROM public.review_votes WHERE review_id = NEW.review_id AND vote_type = 'like'),
            dislikes = (SELECT COUNT(*) FROM public.review_votes WHERE review_id = NEW.review_id AND vote_type = 'dislike')
        WHERE id = NEW.review_id;
        RETURN NEW;
    -- For DELETE
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.reviews
        SET 
            likes = (SELECT COUNT(*) FROM public.review_votes WHERE review_id = OLD.review_id AND vote_type = 'like'),
            dislikes = (SELECT COUNT(*) FROM public.review_votes WHERE review_id = OLD.review_id AND vote_type = 'dislike')
        WHERE id = OLD.review_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create triggers
DROP TRIGGER IF EXISTS on_review_vote_change ON public.review_votes;
CREATE TRIGGER on_review_vote_change
AFTER INSERT OR UPDATE OR DELETE ON public.review_votes
FOR EACH ROW EXECUTE FUNCTION public.handle_review_vote_change();


-- ---- Appended: supabase/migrations/20260124_create_support_tickets.sql ----

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('account', 'billing', 'business', 'reviews', 'technical', 'other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    admin_response TEXT,
    admin_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_read_by_user BOOLEAN NOT NULL DEFAULT TRUE,
    is_read_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support Ticket Messages (for threads)
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist and have correct references if table was created previously
DO $$ 
BEGIN 
    -- Add is_read_by_user if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='is_read_by_user') THEN
        ALTER TABLE public.support_tickets ADD COLUMN is_read_by_user BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;

    -- Add is_read_by_admin if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='is_read_by_admin') THEN
        ALTER TABLE public.support_tickets ADD COLUMN is_read_by_admin BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    -- Add business_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='business_id') THEN
        ALTER TABLE public.support_tickets ADD COLUMN business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON public.support_ticket_messages(ticket_id);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
CREATE POLICY "Users can view own tickets"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can create their own tickets
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users create tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all tickets
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
CREATE POLICY "Admins can view all tickets"
ON public.support_tickets
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Policy: Admins can update all tickets
DROP POLICY IF EXISTS "Admins can update tickets" ON public.support_tickets;
CREATE POLICY "Admins can update tickets"
ON public.support_tickets
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Support Ticket Messages Policies
DROP POLICY IF EXISTS "Users can view own ticket messages" ON public.support_ticket_messages;
CREATE POLICY "Users can view own ticket messages"
ON public.support_ticket_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.support_tickets
        WHERE support_tickets.id = support_ticket_messages.ticket_id
        AND support_tickets.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can send messages to own tickets" ON public.support_ticket_messages;
CREATE POLICY "Users can send messages to own tickets"
ON public.support_ticket_messages
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.support_tickets
        WHERE support_tickets.id = support_ticket_messages.ticket_id
        AND support_tickets.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Admins can view all ticket messages" ON public.support_ticket_messages;
CREATE POLICY "Admins can view all ticket messages"
ON public.support_ticket_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins can send messages to any ticket" ON public.support_ticket_messages;
CREATE POLICY "Admins can send messages to any ticket"
ON public.support_ticket_messages
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_ticket_updated_at();

-- Grant permissions
GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT ALL ON public.support_ticket_messages TO service_role;

-- Add tracking to review_reports
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='review_reports' AND column_name='is_read') THEN
        ALTER TABLE public.review_reports ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;


-- ---- Appended: supabase/migrations/20260125_create_amenities.sql ----

-- Create amenities table
CREATE TABLE IF NOT EXISTS public.amenities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    icon TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE(name, group_name)
);

-- RLS Policies
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to amenities"
    ON public.amenities FOR SELECT
    USING (true);

CREATE POLICY "Allow admin write access to amenities"
    ON public.amenities FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Seed defaults from location-discovery.ts
INSERT INTO public.amenities (name, group_name, icon) VALUES
    -- FlexibilitÃ©
    ('TÃ©lÃ©travail', 'FlexibilitÃ©', 'ðŸ '),
    ('Horaires flexibles', 'FlexibilitÃ©', 'ðŸ '),
    ('CrÃ©dit temps', 'FlexibilitÃ©', 'ðŸ '),
    
    -- SantÃ© & Bien-Ãªtre
    ('Mutuelle santÃ©', 'SantÃ© & Bien-Ãªtre', 'ðŸ¥'),
    ('Salle de sport', 'SantÃ© & Bien-Ãªtre', 'ðŸ¥'),
    ('Salle de repos', 'SantÃ© & Bien-Ãªtre', 'ðŸ¥'),
    ('Pause cafÃ©', 'SantÃ© & Bien-Ãªtre', 'ðŸ¥'),
    
    -- Avantages financiers
    ('Tickets restaurant', 'Avantages financiers', 'ðŸ’°'),
    ('Prime performance', 'Avantages financiers', 'ðŸ’°'),
    ('CongÃ©s supplÃ©mentaires', 'Avantages financiers', 'ðŸ’°'),
    ('Bonus annuel', 'Avantages financiers', 'ðŸ’°'),
    
    -- DÃ©veloppement
    ('Formation continue', 'DÃ©veloppement', 'ðŸ“š'),
    ('Ã‰volution de carriÃ¨re', 'DÃ©veloppement', 'ðŸ“š'),
    ('Coaching', 'DÃ©veloppement', 'ðŸ“š'),
    ('Mentorat', 'DÃ©veloppement', 'ðŸ“š'),
    
    -- Infrastructures
    ('Parking gratuit', 'Infrastructures', 'ðŸ¢'),
    ('Transport en commun', 'Infrastructures', 'ðŸ¢'),
    ('CrÃ¨che entreprise', 'Infrastructures', 'ðŸ¢'),
    ('Ascenseur', 'Infrastructures', 'ðŸ¢'),
    ('AccÃ¨s PMR', 'Infrastructures', 'ðŸ¢'),
    ('Cantine', 'Infrastructures', 'ðŸ¢'),
    
    -- Culture & Ã‰quipe
    ('Team building', 'Culture & Ã‰quipe', 'ðŸ¤'),
    ('Ã‰vÃ©nements internes', 'Culture & Ã‰quipe', 'ðŸ¤'),
    ('Open space', 'Culture & Ã‰quipe', 'ðŸ¤'),
    ('Bureau privÃ©', 'Culture & Ã‰quipe', 'ðŸ¤')
ON CONFLICT (name, group_name) DO NOTHING;


-- ---- Appended: supabase/business-reports.sql ----

-- Business Reports Table
CREATE TABLE IF NOT EXISTS public.business_reports (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id text REFERENCES public.businesses(id) ON DELETE CASCADE,
    reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    reason text NOT NULL, -- 'closed', 'duplicate', 'incorrect_info', 'offensive', 'scam', 'other'
    details text,
    status text DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
    admin_notes text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Business Reports
ALTER TABLE public.business_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report businesses" ON public.business_reports
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own reports" ON public.business_reports
FOR SELECT USING (reporter_id = auth.uid());

CREATE POLICY "Admins can manage all business reports" ON public.business_reports
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_business_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_business_report_updated
    BEFORE UPDATE ON public.business_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_business_reports_updated_at();


-- ---- Appended: supabase/saved-businesses.sql ----

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


-- ---- Appended: supabase/audit-logs-and-profiles.sql ----

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL, -- e.g., 'delete_review', 'approve_claim', 'update_role'
    target_type text NOT NULL, -- e.g., 'review', 'business_claim', 'profile'
    target_id text, -- ID of the object being acted upon
    details jsonb DEFAULT '{}', -- Additional context (old values, new values, reasons)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Profiles Update
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auto_approve_media boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_preferences jsonb DEFAULT '{
    "marketing": true,
    "system": true,
    "review_replies": true,
    "claim_updates": true
}'::jsonb;

-- Function to record audit logs (optional helper)
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be used if we wanted DB-level logging, 
    -- but usually application-level logging is more descriptive for admin actions.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ---- Appended: supabase/create-categories-system.sql ----

-- Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT, -- Lucide icon name or emoji
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Subcategories Table
CREATE TABLE IF NOT EXISTS public.subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, slug)
);

-- Add popular_searches_config to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS popular_searches_config JSONB DEFAULT '[
    {"label": "Restaurants Ã  Casablanca", "href": "/businesses?search=Restaurant&city=Casablanca"},
    {"label": "Salons de coiffure", "href": "/businesses?search=Coiffure"},
    {"label": "HÃ´tels Ã  Rabat", "href": "/businesses?category=HÃ´tels&city=Rabat"}
]'::jsonb;

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to active categories" 
ON public.categories FOR SELECT 
USING (is_active = true);

CREATE POLICY "Allow admin full access to categories" 
ON public.categories FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow public read access to active subcategories" 
ON public.subcategories FOR SELECT 
USING (is_active = true);

CREATE POLICY "Allow admin full access to subcategories" 
ON public.subcategories FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON public.subcategories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- ---- Appended: supabase/add-premium-pricing-settings.sql ----

-- Add premium pricing settings to site_settings table
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS premium_annual_price DECIMAL(10,2) DEFAULT 500.00,
ADD COLUMN IF NOT EXISTS premium_monthly_price DECIMAL(10,2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS premium_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS premium_description TEXT DEFAULT 'Devenez membre Premium et bÃ©nÃ©ficiez de fonctionnalitÃ©s exclusives pour propulser votre Ã©tablissement.';

-- Update the updated_at trigger if it exists to handle the new columns
-- If the trigger doesn't exist yet, create it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_site_settings_updated_at') THEN
        CREATE TRIGGER update_site_settings_updated_at 
            BEFORE UPDATE ON site_settings 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;


-- ---- Appended: supabase/add-email-settings.sql ----

-- Add email configuration fields to site_settings table
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS email_provider TEXT DEFAULT 'console',
ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
ADD COLUMN IF NOT EXISTS sendgrid_api_key TEXT,
ADD COLUMN IF NOT EXISTS mailjet_api_key TEXT,
ADD COLUMN IF NOT EXISTS mailjet_api_secret TEXT,
ADD COLUMN IF NOT EXISTS email_from TEXT DEFAULT 'noreply@avis.ma';


-- ---- Appended: add-payment-settings-columns.sql ----

-- Add payment settings columns to site_settings table
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS payment_bank_name TEXT DEFAULT 'BMCE Bank',
ADD COLUMN IF NOT EXISTS payment_rib_number TEXT DEFAULT '011 780 0000 1234567890 12 34',
ADD COLUMN IF NOT EXISTS payment_beneficiary TEXT DEFAULT 'Avis.ma SARL',
ADD COLUMN IF NOT EXISTS payment_chari_url TEXT DEFAULT 'https://chari.ma/avis',
ADD COLUMN IF NOT EXISTS payment_methods_enabled TEXT[] DEFAULT ARRAY['bank_transfer'];

-- Update any existing records with default values if the columns are added
UPDATE site_settings 
SET 
  payment_bank_name = COALESCE(payment_bank_name, 'BMCE Bank'),
  payment_rib_number = COALESCE(payment_rib_number, '011 780 0000 1234567890 12 34'),
  payment_beneficiary = COALESCE(payment_beneficiary, 'Avis.ma SARL'),
  payment_chari_url = COALESCE(payment_chari_url, 'https://chari.ma/avis'),
  payment_methods_enabled = COALESCE(payment_methods_enabled, ARRAY['bank_transfer'])
WHERE 
  payment_bank_name IS NULL 
  OR payment_rib_number IS NULL 
  OR payment_beneficiary IS NULL
  OR payment_chari_url IS NULL
  OR payment_methods_enabled IS NULL;
-- site_settings v2 manual


-- ---- Fragment: site_settings_v2.sql ----

-- site_settings v2 (manual fragment)
alter table public.site_settings
add column if not exists enable_reviews boolean default true,
add column if not exists enable_salaries boolean default true,
add column if not exists enable_interviews boolean default true,
add column if not exists enable_messaging boolean default false,
add column if not exists enable_claims boolean default true,
add column if not exists site_logo_url text,
add column if not exists google_analytics_id text,
add column if not exists facebook_pixel_id text,
add column if not exists office_address text default 'Casablanca, Morocco',
add column if not exists office_phone text,
add column if not exists copyright_text text,
add column if not exists home_sections_config jsonb;

update public.site_settings
set
  enable_reviews = coalesce(enable_reviews, true),
  enable_salaries = coalesce(enable_salaries, true),
  enable_interviews = coalesce(enable_interviews, true),
  enable_messaging = coalesce(enable_messaging, false),
  enable_claims = coalesce(enable_claims, true),
  office_address = coalesce(office_address, 'Casablanca, Morocco')
where id = 'main';



-- ---- Fragment: tier_pricing.sql ----

-- Tier pricing columns expected by the app UI
alter table public.site_settings
add column if not exists tier_growth_monthly_price numeric default 99,
add column if not exists tier_growth_annual_price numeric default 990,
add column if not exists tier_gold_monthly_price numeric default 299,
add column if not exists tier_gold_annual_price numeric default 2900;



-- ---- Fragment: supabase/_baseline_fragments/admin_audit_log.sql ----

-- Admin audit log (bulk operations)

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.admin_audit_log enable row level security;

do $$ begin
  create policy "Admins can manage admin audit log"
    on public.admin_audit_log for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role can manage admin audit log"
    on public.admin_audit_log for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;



-- ---- Fragment: supabase/_baseline_fragments/premium_and_multi_business.sql ----

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



-- ---- Fragment: supabase/_baseline_fragments/claims_verification.sql ----

-- Claim verification codes + atomic status update RPC

-- business_claims in docs/ADMIN_TABLES.sql lacks updated_at; add it for atomic updates.
alter table public.business_claims
add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

create table if not exists public.verification_codes (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.business_claims(id) on delete cascade,
  method text not null,
  code text not null,
  verified boolean not null default false,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_verification_codes_claim_method
  on public.verification_codes(claim_id, method, verified);

alter table public.verification_codes enable row level security;

do $$ begin
  create policy "Users can insert verification codes for own claim"
    on public.verification_codes for insert
    to authenticated
    with check (
      exists (
        select 1 from public.business_claims c
        where c.id = verification_codes.claim_id
          and c.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can view verification codes for own claim"
    on public.verification_codes for select
    to authenticated
    using (
      exists (
        select 1 from public.business_claims c
        where c.id = verification_codes.claim_id
          and c.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update verification codes for own claim"
    on public.verification_codes for update
    to authenticated
    using (
      exists (
        select 1 from public.business_claims c
        where c.id = verification_codes.claim_id
          and c.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role can manage verification codes"
    on public.verification_codes for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

create or replace function public.update_claim_proof_status(
  p_claim_id uuid,
  p_method text,
  p_status text
)
returns table(claim_id uuid, proof_status jsonb, success boolean)
language plpgsql
as $$
begin
  update public.business_claims
  set proof_status = jsonb_set(
      coalesce(proof_status, '{}'::jsonb),
      array[p_method],
      to_jsonb(p_status::text)
    ),
    updated_at = timezone('utc'::text, now())
  where id = p_claim_id
  returning public.business_claims.id, public.business_claims.proof_status, true;
end;
$$;

grant execute on function public.update_claim_proof_status(uuid, text, text) to authenticated;
grant execute on function public.update_claim_proof_status(uuid, text, text) to service_role;



-- ---- Fragment: supabase/_baseline_fragments/ads_tables.sql ----

-- Advertising / monetization tables referenced by src/

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid references auth.users(id) on delete set null,
  title text not null,
  content text not null,
  target_business_ids text[],
  targeting_criteria jsonb,
  budget_cents integer not null default 0,
  spent_cents integer not null default 0,
  status text not null default 'draft' check (status in ('draft','active','paused','completed')),
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.ads enable row level security;
do $$ begin
  create policy "Users can view their own ads"
    on public.ads for select
    using (auth.uid() = advertiser_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Users can create ads"
    on public.ads for insert to authenticated
    with check (auth.uid() = advertiser_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Users can update their ads"
    on public.ads for update to authenticated
    using (auth.uid() = advertiser_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage ads"
    on public.ads for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;

drop trigger if exists trg_ads_updated_at on public.ads;
create trigger trg_ads_updated_at
before update on public.ads
for each row execute function public.update_updated_at_column();

create table if not exists public.competitor_ads (
  id uuid primary key default gen_random_uuid(),
  advertiser_business_id text references public.businesses(id) on delete cascade,
  target_competitor_ids text[],
  title text not null,
  content text not null,
  media_urls text[],
  budget_cents integer not null default 0,
  spent_cents integer not null default 0,
  status text not null default 'draft' check (status in ('draft','active','paused','completed')),
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.competitor_ads enable row level security;
do $$ begin
  create policy "Business owners can manage competitor ads"
    on public.competitor_ads for all to authenticated
    using (
      exists (
        select 1 from public.businesses b
        where b.id = competitor_ads.advertiser_business_id
          and b.owner_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1 from public.businesses b
        where b.id = competitor_ads.advertiser_business_id
          and b.owner_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage competitor ads"
    on public.competitor_ads for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;

drop trigger if exists trg_competitor_ads_updated_at on public.competitor_ads;
create trigger trg_competitor_ads_updated_at
before update on public.competitor_ads
for each row execute function public.update_updated_at_column();

create table if not exists public.pinned_content (
  id uuid primary key default gen_random_uuid(),
  business_id text references public.businesses(id) on delete cascade,
  title text not null,
  content text not null,
  media_urls text[],
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.pinned_content enable row level security;
do $$ begin
  create policy "Business owners can manage pinned content"
    on public.pinned_content for all to authenticated
    using (
      exists (select 1 from public.businesses b where b.id = pinned_content.business_id and b.owner_id = auth.uid())
    )
    with check (
      exists (select 1 from public.businesses b where b.id = pinned_content.business_id and b.owner_id = auth.uid())
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage pinned content"
    on public.pinned_content for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;

drop trigger if exists trg_pinned_content_updated_at on public.pinned_content;
create trigger trg_pinned_content_updated_at
before update on public.pinned_content
for each row execute function public.update_updated_at_column();



-- ---- Fragment: supabase/_baseline_fragments/analytics_tables.sql ----

-- Analytics + monitoring tables referenced by src/

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  user_id uuid references auth.users(id) on delete set null,
  business_id text references public.businesses(id) on delete set null,
  session_id text not null,
  timestamp timestamptz not null default timezone('utc'::text, now()),
  properties jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.analytics_events enable row level security;
do $$ begin
  create policy "Public can insert analytics events"
    on public.analytics_events for insert
    with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage analytics events"
    on public.analytics_events for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

create index if not exists idx_analytics_events_timestamp on public.analytics_events(timestamp desc);
create index if not exists idx_analytics_events_event on public.analytics_events(event);
create index if not exists idx_analytics_events_session_id on public.analytics_events(session_id);

create table if not exists public.search_analytics (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  city text,
  results_count integer not null default 0,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.search_analytics enable row level security;
do $$ begin
  create policy "Public can insert search analytics"
    on public.search_analytics for insert
    with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage search analytics"
    on public.search_analytics for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

create or replace view public.search_logs as
select query, count(*)::int as count
from public.search_analytics
group by query;

grant select on public.search_logs to anon;
grant select on public.search_logs to authenticated;

create table if not exists public.business_analytics (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(id) on delete cascade,
  event_type text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.business_analytics enable row level security;
do $$ begin
  create policy "Public can insert business analytics"
    on public.business_analytics for insert
    with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage business analytics"
    on public.business_analytics for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

create index if not exists idx_business_analytics_business_id on public.business_analytics(business_id);
create index if not exists idx_business_analytics_event_type on public.business_analytics(event_type);
create index if not exists idx_business_analytics_created_at on public.business_analytics(created_at desc);

create table if not exists public.carousel_analytics (
  id uuid primary key default gen_random_uuid(),
  collection_id text,
  event_type text not null check (event_type in ('impression','click')),
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  timestamp timestamptz not null default timezone('utc'::text, now()),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.carousel_analytics enable row level security;
do $$ begin
  create policy "Public can insert carousel analytics"
    on public.carousel_analytics for insert
    with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage carousel analytics"
    on public.carousel_analytics for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;

create table if not exists public.error_reports (
  id text primary key,
  message text not null,
  stack text,
  type text not null,
  timestamp timestamptz not null default timezone('utc'::text, now()),
  url text not null,
  user_agent text,
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  context jsonb not null default '{}'::jsonb,
  severity text not null,
  resolved boolean not null default false,
  occurrences integer not null default 1,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

alter table public.error_reports enable row level security;
do $$ begin
  create policy "Public can insert error reports"
    on public.error_reports for insert
    with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Service role can manage error reports"
    on public.error_reports for all to service_role
    using (true) with check (true);
exception when duplicate_object then null; end $$;



-- ---- Fragment: supabase/_baseline_fragments/safe_delete_user.sql ----

-- Safe user deletion RPC used by admin actions

create or replace function public.safe_delete_user(user_id_param uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb := '{}'::jsonb;
  deleted_count integer;
  is_admin boolean := false;
begin
  is_admin := exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
  if not (is_admin or auth.role() = 'service_role') then
    raise exception 'Not authorized';
  end if;

  with deleted as (
    delete from public.reviews where user_id = user_id_param returning 1
  ) select count(*) into deleted_count from deleted;
  result := result || jsonb_build_object('reviews_deleted', deleted_count);

  with deleted as (
    delete from public.business_claims where user_id = user_id_param returning 1
  ) select count(*) into deleted_count from deleted;
  result := result || jsonb_build_object('claims_deleted', deleted_count);

  with deleted as (
    delete from public.support_ticket_messages where sender_id = user_id_param returning 1
  ) select count(*) into deleted_count from deleted;
  result := result || jsonb_build_object('support_messages_deleted', deleted_count);

  with deleted as (
    delete from public.premium_payments where user_id = user_id_param returning 1
  ) select count(*) into deleted_count from deleted;
  result := result || jsonb_build_object('payments_deleted', deleted_count);

  with deleted as (
    delete from public.favorites where user_id = user_id_param returning 1
  ) select count(*) into deleted_count from deleted;
  result := result || jsonb_build_object('favorites_deleted', deleted_count);

  with deleted as (
    delete from public.notifications where user_id = user_id_param returning 1
  ) select count(*) into deleted_count from deleted;
  result := result || jsonb_build_object('notifications_deleted', deleted_count);

  with deleted as (
    delete from public.profiles where id = user_id_param returning 1
  ) select count(*) into deleted_count from deleted;
  result := result || jsonb_build_object('profile_deleted', deleted_count);

  with deleted as (
    delete from auth.users where id = user_id_param returning 1
  ) select count(*) into deleted_count from deleted;
  result := result || jsonb_build_object('auth_user_deleted', deleted_count);

  return result;
end;
$$;

grant execute on function public.safe_delete_user(uuid) to service_role;



-- ---- Fragment: supabase/_baseline_fragments/storage_config.sql ----

-- Storage buckets + RLS policies for buckets referenced by src/
-- Note: On some Supabase projects, migration role is not owner of storage.objects.
-- We intentionally avoid ALTER/GRANT operations that require table ownership.

insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
values
  ('claim-proofs', 'claim-proofs', false, false, 104857600, '{application/pdf,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm}'),
  ('business-images', 'business-images', true, true, 104857600, '{image/jpeg,image/png,image/webp,image/gif,image/svg+xml}'),
  ('carousel-images', 'carousel-images', true, true, 104857600, '{image/jpeg,image/png,image/webp,image/gif,image/svg+xml}')
on conflict (id) do nothing;

-- storage.objects RLS/policies must be configured by an owner-capable role.
-- This baseline intentionally skips policy creation to avoid 42501 failures
-- on reset projects where migration role does not own storage.objects.



commit;

