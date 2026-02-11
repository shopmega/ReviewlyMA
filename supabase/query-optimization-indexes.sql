-- Database Query Optimization Indexes
-- Add these indexes to improve query performance
-- This script safely checks for table existence before creating indexes

-- ============================================
-- CORE TABLES (Always exist)
-- ============================================

-- Business search indexes
CREATE INDEX IF NOT EXISTS idx_businesses_name_search ON businesses USING gin(to_tsvector('french', name));
CREATE INDEX IF NOT EXISTS idx_businesses_location_search ON businesses USING gin(to_tsvector('french', location));
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);
CREATE INDEX IF NOT EXISTS idx_businesses_rating ON businesses(overall_rating DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_is_featured ON businesses(is_featured) WHERE is_featured = true;

-- Composite index for common search queries
CREATE INDEX IF NOT EXISTS idx_businesses_search_composite ON businesses(category, city, overall_rating DESC);

-- Full-text search index for businesses
CREATE INDEX IF NOT EXISTS idx_businesses_fts ON businesses USING gin(
  to_tsvector('french', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(location, ''))
);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_business_id ON profiles(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON profiles(is_premium) WHERE is_premium = true;

-- Business claims indexes
CREATE INDEX IF NOT EXISTS idx_business_claims_user_id ON business_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_business_claims_status ON business_claims(status);
CREATE INDEX IF NOT EXISTS idx_business_claims_business_id ON business_claims(business_id);
CREATE INDEX IF NOT EXISTS idx_business_claims_created_at ON business_claims(created_at DESC);

-- ============================================
-- OPTIONAL TABLES (Only create if table exists)
-- ============================================

-- Business hours indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_hours') THEN
        CREATE INDEX IF NOT EXISTS idx_business_hours_business_id ON business_hours(business_id);
    END IF;
END $$;

-- Saved businesses indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saved_businesses') THEN
        CREATE INDEX IF NOT EXISTS idx_saved_businesses_user_id ON saved_businesses(user_id);
        CREATE INDEX IF NOT EXISTS idx_saved_businesses_business_id ON saved_businesses(business_id);
    END IF;
END $$;

-- Messages indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        CREATE INDEX IF NOT EXISTS idx_messages_business_id ON messages(business_id);
        CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
        -- Index for unread messages (read_at IS NULL)
        CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at) WHERE read_at IS NULL;
    END IF;
END $$;

-- Notifications indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read) WHERE is_read = false;
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    END IF;
END $$;

-- Audit logs indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    END IF;
END $$;

-- Premium payments indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'premium_payments') THEN
        CREATE INDEX IF NOT EXISTS idx_premium_payments_user_id ON premium_payments(user_id);
        CREATE INDEX IF NOT EXISTS idx_premium_payments_status ON premium_payments(status);
        CREATE INDEX IF NOT EXISTS idx_premium_payments_created_at ON premium_payments(created_at DESC);
    END IF;
END $$;

-- Analytics indexes (if analytics table exists - check for different possible names)
DO $$
BEGIN
    -- Check for analytics_events table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_events') THEN
        CREATE INDEX IF NOT EXISTS idx_analytics_events_business_id ON analytics_events(business_id);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_event_date ON analytics_events(event_date DESC);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
    END IF;
    
    -- Check for business_analytics table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_analytics') THEN
        CREATE INDEX IF NOT EXISTS idx_business_analytics_business_id ON business_analytics(business_id);
        
        -- Check which date column exists and create appropriate index
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_analytics' AND column_name = 'analytics_date') THEN
            CREATE INDEX IF NOT EXISTS idx_business_analytics_analytics_date ON business_analytics(analytics_date DESC);
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_analytics' AND column_name = 'date') THEN
            CREATE INDEX IF NOT EXISTS idx_business_analytics_date ON business_analytics(date DESC);
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_analytics' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_business_analytics_created_at ON business_analytics(created_at DESC);
        END IF;
    END IF;
    
    -- Check for generic analytics table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics') THEN
        CREATE INDEX IF NOT EXISTS idx_analytics_business_id ON analytics(business_id);
        CREATE INDEX IF NOT EXISTS idx_analytics_event_date ON analytics(event_date DESC);
        CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
    END IF;
END $$;
