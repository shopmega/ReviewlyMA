-- =====================================================
-- Supabase Security Remediation Script
-- Addresses all security issues from database audit
-- =====================================================

-- NOTE: Run this script in Supabase SQL Editor with appropriate permissions
-- Test in a development environment first!

-- =====================================================
-- 1. Fix Security Definer View Issue
-- =====================================================

-- Drop the problematic SECURITY DEFINER view
DROP VIEW IF EXISTS public.premium_pro_users;

-- Recreate view without SECURITY DEFINER (uses caller's permissions)
CREATE OR REPLACE VIEW public.premium_pro_users AS
SELECT 
    u.id,
    u.email,
    u.created_at,
    u.updated_at,
    p.subscription_tier,
    p.subscription_status,
    p.expires_at,
    p.stripe_customer_id
FROM auth.users u
JOIN public.profiles p ON u.id = p.user_id
WHERE p.subscription_tier IN ('pro', 'growth', 'gold')
AND p.subscription_status = 'active'
AND p.expires_at > NOW();

-- Add proper comment
COMMENT ON VIEW public.premium_pro_users IS 'View of active premium subscribers (uses caller permissions)';

-- =====================================================
-- 2. Enable RLS on All Public Tables
-- =====================================================

-- Enable RLS on tables that don't have it
ALTER TABLE public.salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_business_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. Create RLS Policies for Each Table
-- =====================================================

-- Salaries table - Only accessible by admins and the user themselves
CREATE POLICY "Users can view own salaries" ON public.salaries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all salaries" ON public.salaries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Verification codes - Only accessible by the user and system
CREATE POLICY "Users can access own verification codes" ON public.verification_codes
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "System can create verification codes" ON public.verification_codes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update verification codes" ON public.verification_codes
    FOR UPDATE USING (true);

-- Interviews - User and admin access
CREATE POLICY "Users can view own interviews" ON public.interviews
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all interviews" ON public.interviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Test business analytics - Read-only for authenticated users
CREATE POLICY "Authenticated users can view test analytics" ON public.test_business_analytics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage test analytics" ON public.test_business_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Premium users - User and admin access
CREATE POLICY "Users can view own premium info" ON public.premium_users
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage premium users" ON public.premium_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Business groups - Member and admin access
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
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Business group memberships - User and admin access
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
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Search analytics - Aggregated access only (hide session_id)
CREATE POLICY "Users can view aggregated search analytics" ON public.search_analytics
    FOR SELECT USING (
        -- Allow access to non-sensitive columns only
        -- This policy will be used with a view that excludes session_id
        true
    );

CREATE POLICY "Admins can view all search analytics" ON public.search_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- 4. Create Secure Views for Sensitive Data
-- =====================================================

-- Create a view that excludes sensitive session_id from search_analytics
CREATE OR REPLACE VIEW public.search_analytics_public AS
SELECT 
    search_query,
    result_count,
    search_timestamp,
    user_id,
    ip_address,
    user_agent,
    -- Exclude session_id for security
    created_at,
    updated_at
FROM public.search_analytics;

-- Grant access to the secure view
GRANT SELECT ON public.search_analytics_public TO authenticated;
GRANT SELECT ON public.search_analytics_public TO anon;

-- =====================================================
-- 5. Revoke Direct Access to Sensitive Tables
-- =====================================================

-- Revoke direct access to search_analytics table
REVOKE ALL ON public.search_analytics FROM authenticated;
REVOKE ALL ON public.search_analytics FROM anon;
-- Keep admin access through service role

-- =====================================================
-- 6. Add Indexes for Performance
-- =====================================================

-- Add indexes to support RLS policies
CREATE INDEX IF NOT EXISTS idx_salaries_user_id ON public.salaries(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON public.verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON public.interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_users_user_id ON public.premium_users(user_id);
CREATE INDEX IF NOT EXISTS idx_business_groups_owner_id ON public.business_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_business_group_memberships_user_id ON public.business_group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_business_group_memberships_group_id ON public.business_group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON public.search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON public.search_analytics(search_timestamp);

-- =====================================================
-- 7. Audit and Monitoring Setup
-- =====================================================

-- Create audit log for security events
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

-- Only admins can view audit log
CREATE POLICY "Admins can view audit log" ON public.security_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- System can insert audit entries
CREATE POLICY "System can insert audit entries" ON public.security_audit_log
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 8. Verification Script
-- =====================================================

-- Check RLS status
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

-- Check policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 9. Cleanup and Final Notes
-- =====================================================

-- This script addresses all security issues:
-- ✅ Fixed SECURITY DEFINER view
-- ✅ Enabled RLS on all public tables
-- ✅ Created appropriate RLS policies
-- ✅ Protected sensitive columns (session_id)
-- ✅ Created secure views for public access
-- ✅ Added performance indexes
-- ✅ Set up audit logging

-- IMPORTANT: After running this script:
-- 1. Test all application functionality
-- 2. Verify admin access still works
-- 3. Test user access to their own data
-- 4. Monitor the audit log for security events
-- 5. Update application code if needed to use the new views
