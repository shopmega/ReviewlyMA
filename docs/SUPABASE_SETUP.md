# Supabase Migration Plan

## 1. Environment Setup (Immediate Action Required)
You need to connect your project to Supabase.
1.  Go to [Supabase](https://supabase.com/) and create a new project.
2.  Get your **Project URL** and **anon public key** from Project Settings > API.
3.  Create a file named `.env.local` in the root directory.
4.  Add the following lines:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
    ```
5.  **Restart your server** (`npm run dev`) to load variables.

## 2. Database Schema (Run in Supabase SQL Editor)
Execute the following SQL commands in your Supabase Dashboard to create the necessary tables.

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Extends Auth Users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role text default 'user', -- 'user', 'admin', 'business_owner'
  avatar_url text,
  is_premium boolean default false,
  business_id text references businesses(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. BUSINESSES
create table public.businesses (
  id text primary key, -- slug (e.g., 'bimo-cafe')
  name text not null,
  type text not null, -- 'commerce' or 'employer'
  category text not null,
  location text not null,
  description text,
  website text,
  employee_count int,
  price_range int,
  is_featured boolean default false,
  overall_rating numeric default 0,
  logo_url text,
  logo_hint text,
  cover_url text,
  cover_hint text,
  gallery_urls text[] default '{}',
  tags text[], -- Array of strings
  amenities text[], -- Array of strings
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. REVIEWS
create table public.reviews (
  id bigserial primary key,
  business_id text references public.businesses(id) on delete cascade not null,
  user_id uuid references public.profiles(id), -- Optional if anonymous
  author_name text not null, -- needed for anonymous reviews
  is_anonymous boolean default false, -- indicates if review was posted anonymously
  rating int not null,
  title text,
  content text,
  date date default CURRENT_DATE,
  likes int default 0,
  dislikes int default 0,
  sub_ratings jsonb, -- Store service, quality etc as JSON
  status text default 'pending', -- 'published', 'pending', 'rejected'
  owner_reply text,
  owner_reply_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. UPDATES (Business Announcements)
create table public.updates (
  id bigserial primary key,
  business_id text references public.businesses(id) on delete cascade not null,
  title text not null,
  content text not null,
  date date default CURRENT_DATE,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. SALARIES (Employer only)
create table public.salaries (
  id bigserial primary key,
  business_id text references public.businesses(id) on delete cascade not null,
  job_title text not null,
  salary numeric not null,
  location text,
  date text, -- e.g. '2024'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. INTERVIEWS (Employer only)
create table public.interviews (
  id bigserial primary key,
  business_id text references public.businesses(id) on delete cascade not null,
  job_title text not null,
  experience text,
  difficulty text,
  questions text[],
  date text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Security Policies (RLS)
alter table profiles enable row level security;
alter table businesses enable row level security;
alter table reviews enable row level security;

-- Public Read Access
create policy "Public businesses are viewable by everyone" on businesses for select using (true);
create policy "Public reviews are viewable by everyone" on reviews for select using (status = 'published');

-- Insert Policies
create policy "Users can insert their own reviews" on reviews for insert with check (auth.role() = 'authenticated');

-- Update Policies
create policy "Users can update their own reviews" on reviews for update using (auth.uid() = user_id);

-- Business Update Policies
create policy "Owners can update their own business" on businesses
for update using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.business_id = businesses.id
    and profiles.role = 'pro'
  )
);
create policy "Admins can update any business" on businesses
for update using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- Delete Policies
create policy "Users can delete their own reviews" on reviews for delete using (auth.uid() = user_id);
```

## 3. Data Migration Strategy
Once tables are created, we will write a script to utilize `src/lib/data.ts` and push that data into Supabase.

1.  Create `src/scripts/seed-supabase.ts`.
2.  Iterate through the `businesses` array.
3.  Insert business record.
4.  Insert related reviews, salaries, etc.

3.  Run the seed script:
    ```bash
    npx tsx src/scripts/seed-supabase.ts
    ```

## 4. Codebase Refactoring
We need to replace the content of `src/lib/data.ts` functions with Supabase calls.

**Example Change:**
*   **Old:**
    ```typescript
    export const getBusinesses = async () => businesses;
    ```
*   **New:**
    ```typescript
    import { createClient } from '@/lib/supabase/client'; // or server
    
    export const getBusinesses = async () => {
       const supabase = createClient();
       const { data } = await supabase.from('businesses').select('*');
       return data;
    }
    ```

## 5. Deployment (Vercel)
1. Push code to GitHub.
2. Import project in Vercel.
3. Add the same Environment Variables (`NEXT_PUBLIC_SUPABASE_URL`, etc.) in Vercel Project Settings.

### 4. Create Seasonal Collections Table
Run the SQL found in [docs/SEASONAL_COLLECTIONS.sql](./SEASONAL_COLLECTIONS.sql) to create the table for managing homepage collections.
