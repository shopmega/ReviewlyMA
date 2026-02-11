-- Create table for Website Settings
create table public.site_settings (
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

-- RLS
alter table site_settings enable row level security;

-- Policies
create policy "Settings are viewable by everyone" on site_settings for select using (true);
create policy "Admins can update settings" on site_settings for update using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can insert settings" on site_settings for insert with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Insert default settings
insert into site_settings (id) values ('main') on conflict do nothing;
