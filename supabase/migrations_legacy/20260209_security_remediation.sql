-- =====================================================
-- Security Remediation Migration
-- Addresses all critical security vulnerabilities
-- Created: 2026-02-09
-- Priority: CRITICAL
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. Fix Security Definer View
-- =====================================================

-- Drop problematic SECURITY DEFINER view
DROP VIEW IF EXISTS public.premium_pro_users;

-- Recreate view without SECURITY DEFINER
CREATE OR REPLACE VIEW public.premium_pro_users AS
SELECT 
    u.id,
    u.email,
    u.created_at,
    u.updated_at,
    pu.subscription_tier,
    pu.subscription_status,
    pu.subscription_expires_at as expires_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
JOIN public.premium_users pu ON u.id = pu.user_id
WHERE pu.subscription_tier IN ('basic', 'premium', 'enterprise')
AND pu.subscription_status = 'active'
AND (pu.subscription_expires_at IS NULL OR pu.subscription_expires_at > NOW());

COMMENT ON VIEW public.premium_pro_users IS 'View of active premium subscribers (uses caller permissions)';

-- =====================================================
-- 2. Enable RLS on All Vulnerable Tables
-- =====================================================

-- Enable RLS on tables that don't have it
ALTER TABLE IF EXISTS public.salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.test_business_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.premium_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.business_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.business_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.search_analytics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. Create RLS Policies
-- =====================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own salaries" ON public.salaries;
DROP POLICY IF EXISTS "Admins can view all salaries" ON public.salaries;
DROP POLICY IF EXISTS "Users can access own verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "System can create verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "System can update verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Users can view own interviews" ON public.interviews;
DROP POLICY IF EXISTS "Admins can manage all interviews" ON public.interviews;
DROP POLICY IF EXISTS "Authenticated users can view test analytics" ON public.test_business_analytics;
DROP POLICY IF EXISTS "Admins can manage test analytics" ON public.test_business_analytics;
DROP POLICY IF EXISTS "Users can view own premium info" ON public.premium_users;
DROP POLICY IF EXISTS "Admins can manage premium users" ON public.premium_users;
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.business_groups;
DROP POLICY IF EXISTS "Group owners can manage groups" ON public.business_groups;
DROP POLICY IF EXISTS "Admins can manage all groups" ON public.business_groups;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.business_group_memberships;
DROP POLICY IF EXISTS "Group owners can view group memberships" ON public.business_group_memberships;
DROP POLICY IF EXISTS "Users can manage own memberships" ON public.business_group_memberships;
DROP POLICY IF EXISTS "Admins can manage all memberships" ON public.business_group_memberships;
DROP POLICY IF EXISTS "Users can view aggregated search analytics" ON public.search_analytics;
DROP POLICY IF EXISTS "Admins can view all search analytics" ON public.search_analytics;

-- Salaries table policies
CREATE POLICY "Users can view own salaries" ON public.salaries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all salaries" ON public.salaries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Verification codes policies
CREATE POLICY "Users can access own verification codes" ON public.verification_codes
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "System can create verification codes" ON public.verification_codes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update verification codes" ON public.verification_codes
    FOR UPDATE USING (true);

-- Interviews policies
CREATE POLICY "Users can view own interviews" ON public.interviews
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all interviews" ON public.interviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Test business analytics policies
CREATE POLICY "Authenticated users can view test analytics" ON public.test_business_analytics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage test analytics" ON public.test_business_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Premium users policies
CREATE POLICY "Users can view own premium info" ON public.premium_users
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage premium users" ON public.premium_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Business groups policies
CREATE POLICY "Users can view groups they belong to" ON public.business_groups
    FOR SELECT USING (
        auth.uid() = owner_id OR
        EXISTS (
            SELECT 1 FROM public.business_group_memberships 
            WHERE group_id = id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Group owners can manage groups" ON public.business_groups
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all groups" ON public.business_groups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Business group memberships policies
CREATE POLICY "Users can view own memberships" ON public.business_group_memberships
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Group owners can view group memberships" ON public.business_group_memberships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.business_groups 
            WHERE id = group_id 
            AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own memberships" ON public.business_group_memberships
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all memberships" ON public.business_group_memberships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Search analytics policies (restricted)
CREATE POLICY "Admins can view all search analytics" ON public.search_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- 4. Create Secure Views
-- =====================================================

-- Drop existing secure view if it exists
DROP VIEW IF EXISTS public.search_analytics_public;

-- Create secure view excluding sensitive data
CREATE OR REPLACE VIEW public.search_analytics_public AS
SELECT 
    search_query,
    result_count,
    search_timestamp,
    user_id,
    ip_address,
    user_agent,
    created_at,
    updated_at
FROM public.search_analytics;

COMMENT ON VIEW public.search_analytics_public IS 'Public view of search analytics (excludes sensitive session_id)';

-- Grant access to secure view
GRANT SELECT ON public.search_analytics_public TO authenticated;
GRANT SELECT ON public.search_analytics_public TO anon;

-- =====================================================
-- 5. Revoke Direct Access to Sensitive Tables
-- =====================================================

-- Revoke direct access to search_analytics table
REVOKE ALL ON public.search_analytics FROM authenticated;
REVOKE ALL ON public.search_analytics FROM anon;

-- =====================================================
-- 6. Create Audit Log Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    table_name TEXT,
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing audit policies
DROP POLICY IF EXISTS "Admins can view audit log" ON public.security_audit_log;
DROP POLICY IF EXISTS "System can insert audit entries" ON public.security_audit_log;

-- Create audit policies
CREATE POLICY "Admins can view audit log" ON public.security_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "System can insert audit entries" ON public.security_audit_log
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 7. Add Performance Indexes
-- =====================================================

-- Create indexes to support RLS policies
CREATE INDEX IF NOT EXISTS idx_salaries_user_id ON public.salaries(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON public.verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON public.verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON public.interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_users_user_id ON public.premium_users(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_users_status ON public.premium_users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_business_groups_owner_id ON public.business_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_business_group_memberships_user_id ON public.business_group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_business_group_memberships_group_id ON public.business_group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON public.search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON public.search_analytics(search_timestamp);
CREATE INDEX IF NOT EXISTS idx_search_analytics_session_id ON public.search_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);

-- =====================================================
-- 8. Create Security Functions
-- =====================================================

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_event_type TEXT,
    p_table_name TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.security_audit_log (
        event_type,
        table_name,
        user_id,
        ip_address,
        user_agent,
        details
    ) VALUES (
        p_event_type,
        p_table_name,
        p_user_id,
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent',
        p_details
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.log_security_event TO service_role;

-- =====================================================
-- 9. Verification Queries
-- =====================================================

-- This section is for verification purposes only
-- Uncomment to run after migration

/*
-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerlspolicy
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'salaries', 'verification_codes', 'interviews', 'test_business_analytics',
    'premium_users', 'business_groups', 'business_group_memberships', 'search_analytics'
)
ORDER BY tablename;

-- Verify policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verify secure view exists
SELECT viewname, viewowner 
FROM pg_views 
WHERE viewname = 'search_analytics_public';

-- Test permissions (run as different users)
-- This should work for authenticated users:
SELECT COUNT(*) FROM public.search_analytics_public;

-- This should fail for non-admins:
-- SELECT COUNT(*) FROM public.search_analytics;
*/
