-- Blog CMS table for editorial publishing through admin panel.

create table if not exists public.blog_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  category text not null default 'how_to'
    check (category in ('pillar', 'how_to', 'analysis', 'report')),
  content_md text not null,
  cluster_links jsonb not null default '[]'::jsonb,
  read_time_minutes integer not null default 6
    check (read_time_minutes between 1 and 60),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint blog_articles_slug_len_check check (char_length(trim(slug)) between 3 and 180),
  constraint blog_articles_title_len_check check (char_length(trim(title)) between 10 and 180),
  constraint blog_articles_description_len_check check (char_length(trim(description)) between 40 and 320),
  constraint blog_articles_content_len_check check (char_length(trim(content_md)) between 80 and 30000),
  constraint blog_articles_status_published_at_check check (
    (status <> 'published')
    or (published_at is not null)
  )
);

create index if not exists idx_blog_articles_status_published_at
  on public.blog_articles(status, published_at desc nulls last, created_at desc);

create index if not exists idx_blog_articles_category_status
  on public.blog_articles(category, status);

drop trigger if exists trg_blog_articles_updated_at on public.blog_articles;
create trigger trg_blog_articles_updated_at
before update on public.blog_articles
for each row execute function public.update_updated_at_column();

alter table public.blog_articles enable row level security;

drop policy if exists "Public can read published blog articles" on public.blog_articles;
create policy "Public can read published blog articles"
on public.blog_articles for select
using (status = 'published');

drop policy if exists "Admins can manage blog articles" on public.blog_articles;
create policy "Admins can manage blog articles"
on public.blog_articles for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));
