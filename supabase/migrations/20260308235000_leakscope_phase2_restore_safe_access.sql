-- Leakscope Phase 2: restore safe app access under strict RLS
-- Date: 2026-03-08
-- Goal: Keep anon writes blocked while re-enabling legitimate reads and
-- authenticated self-service operations needed by the app.

DO $$
BEGIN
  -- Core public reads used by directory/business pages.
  IF to_regclass('public.businesses') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'businesses'
      AND policyname = 'Phase2 public read businesses'
    ) THEN
      CREATE POLICY "Phase2 public read businesses"
        ON public.businesses
        FOR SELECT TO anon, authenticated
        USING (coalesce(status, 'active') <> 'deleted');
    END IF;
    GRANT SELECT ON public.businesses TO anon, authenticated;
  END IF;

  IF to_regclass('public.categories') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'categories'
      AND policyname = 'Phase2 public read categories'
    ) THEN
      CREATE POLICY "Phase2 public read categories"
        ON public.categories
        FOR SELECT TO anon, authenticated
        USING (coalesce(is_active, true));
    END IF;
    GRANT SELECT ON public.categories TO anon, authenticated;
  END IF;

  IF to_regclass('public.subcategories') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'subcategories'
      AND policyname = 'Phase2 public read subcategories'
    ) THEN
      CREATE POLICY "Phase2 public read subcategories"
        ON public.subcategories
        FOR SELECT TO anon, authenticated
        USING (coalesce(is_active, true));
    END IF;
    GRANT SELECT ON public.subcategories TO anon, authenticated;
  END IF;

  IF to_regclass('public.amenities') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'amenities'
      AND policyname = 'Phase2 public read amenities'
    ) THEN
      CREATE POLICY "Phase2 public read amenities"
        ON public.amenities
        FOR SELECT TO anon, authenticated
        USING (true);
    END IF;
    GRANT SELECT ON public.amenities TO anon, authenticated;
  END IF;

  IF to_regclass('public.business_hours') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'business_hours'
      AND policyname = 'Phase2 public read business_hours'
    ) THEN
      CREATE POLICY "Phase2 public read business_hours"
        ON public.business_hours
        FOR SELECT TO anon, authenticated
        USING (true);
    END IF;
    GRANT SELECT ON public.business_hours TO anon, authenticated;
  END IF;

  IF to_regclass('public.reviews') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'reviews'
      AND policyname = 'Phase2 public read published reviews'
    ) THEN
      CREATE POLICY "Phase2 public read published reviews"
        ON public.reviews
        FOR SELECT TO anon, authenticated
        USING (coalesce(status, 'pending') = 'published');
    END IF;
    GRANT SELECT ON public.reviews TO anon, authenticated;
  END IF;

  IF to_regclass('public.updates') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'updates'
      AND policyname = 'Phase2 public read updates'
    ) THEN
      CREATE POLICY "Phase2 public read updates"
        ON public.updates
        FOR SELECT TO anon, authenticated
        USING (true);
    END IF;
    GRANT SELECT ON public.updates TO anon, authenticated;
  END IF;

  IF to_regclass('public.seasonal_collections') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'seasonal_collections'
      AND policyname = 'Phase2 public read active seasonal collections'
    ) THEN
      CREATE POLICY "Phase2 public read active seasonal collections"
        ON public.seasonal_collections
        FOR SELECT TO anon, authenticated
        USING (coalesce(active, true));
    END IF;
    GRANT SELECT ON public.seasonal_collections TO anon, authenticated;
  END IF;

  IF to_regclass('public.site_settings') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'site_settings'
      AND policyname = 'Phase2 public read site settings'
    ) THEN
      CREATE POLICY "Phase2 public read site settings"
        ON public.site_settings
        FOR SELECT TO anon, authenticated
        USING (true);
    END IF;
    GRANT SELECT ON public.site_settings TO anon, authenticated;
  END IF;

  -- Blog reads: only if status column exists.
  IF to_regclass('public.blog_articles') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'blog_articles' AND column_name = 'status'
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'blog_articles'
        AND policyname = 'Phase2 public read published blog articles'
      ) THEN
        CREATE POLICY "Phase2 public read published blog articles"
          ON public.blog_articles
          FOR SELECT TO anon, authenticated
          USING (status = 'published');
      END IF;
    END IF;
    GRANT SELECT ON public.blog_articles TO anon, authenticated;
  END IF;

  -- Salary analytics read models used on salary pages.
  IF to_regclass('public.salary_company_metrics') IS NOT NULL THEN
    GRANT SELECT ON public.salary_company_metrics TO anon, authenticated;
  END IF;
  IF to_regclass('public.salary_city_sector_metrics') IS NOT NULL THEN
    GRANT SELECT ON public.salary_city_sector_metrics TO anon, authenticated;
  END IF;
  IF to_regclass('public.salary_city_metrics') IS NOT NULL THEN
    GRANT SELECT ON public.salary_city_metrics TO anon, authenticated;
  END IF;
  IF to_regclass('public.salary_role_city_metrics') IS NOT NULL THEN
    GRANT SELECT ON public.salary_role_city_metrics TO anon, authenticated;
  END IF;
  IF to_regclass('public.salary_monthly_reports_public') IS NOT NULL THEN
    GRANT SELECT ON public.salary_monthly_reports_public TO anon, authenticated;
  END IF;

  -- Authenticated self-service tables.
  IF to_regclass('public.profiles') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Phase2 users read own profile'
    ) THEN
      CREATE POLICY "Phase2 users read own profile"
        ON public.profiles
        FOR SELECT TO authenticated
        USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Phase2 users update own profile'
    ) THEN
      CREATE POLICY "Phase2 users update own profile"
        ON public.profiles
        FOR UPDATE TO authenticated
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    END IF;
    GRANT SELECT, UPDATE ON public.profiles TO authenticated;
  END IF;

  IF to_regclass('public.saved_businesses') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'saved_businesses'
      AND policyname = 'Phase2 users manage own saved businesses'
    ) THEN
      CREATE POLICY "Phase2 users manage own saved businesses"
        ON public.saved_businesses
        FOR ALL TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_businesses TO authenticated;
  END IF;

  IF to_regclass('public.favorites') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'favorites'
      AND policyname = 'Phase2 users manage own favorites'
    ) THEN
      CREATE POLICY "Phase2 users manage own favorites"
        ON public.favorites
        FOR ALL TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
  END IF;

  IF to_regclass('public.review_votes') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'review_votes'
      AND policyname = 'Phase2 public read review votes'
    ) THEN
      CREATE POLICY "Phase2 public read review votes"
        ON public.review_votes
        FOR SELECT TO anon, authenticated
        USING (true);
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'review_votes'
      AND policyname = 'Phase2 users manage own review votes'
    ) THEN
      CREATE POLICY "Phase2 users manage own review votes"
        ON public.review_votes
        FOR ALL TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
    GRANT SELECT ON public.review_votes TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON public.review_votes TO authenticated;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
