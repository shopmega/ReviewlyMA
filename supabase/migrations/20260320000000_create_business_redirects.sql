-- Create business_redirects table to handle SEO redirects when business IDs are changed
CREATE TABLE IF NOT EXISTS public.business_redirects (
    old_slug TEXT PRIMARY KEY,
    new_slug TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_redirects_old_slug ON public.business_redirects(old_slug);

-- RLS
ALTER TABLE public.business_redirects ENABLE ROW LEVEL SECURITY;

-- Public can read redirects
CREATE POLICY "Public can read redirects" ON public.business_redirects
    FOR SELECT USING (true);

-- Only service role/admins can manage redirects
CREATE POLICY "Admins can manage redirects" ON public.business_redirects
    FOR ALL USING (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    );
