-- Multi-Business Support Schema Preparation
-- This file prepares the database for future multi-business support for premium users
-- Current implementation: 1 business per user
-- Future implementation: Multiple businesses per premium user

-- Add user_businesses junction table for future multi-business support
-- This table will replace the single business_id in profiles table
CREATE TABLE IF NOT EXISTS user_businesses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    business_id text REFERENCES businesses(id) ON DELETE CASCADE,
    role text DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'employee')),
    is_primary boolean DEFAULT false, -- For determining which business to show by default
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure user can only have one primary business
    CONSTRAINT user_businesses_unique_primary UNIQUE (user_id, is_primary) 
        DEFERRABLE INITIALLY DEFERRED,
    
    -- Ensure user can't have duplicate roles for same business
    CONSTRAINT user_businesses_unique_user_business UNIQUE (user_id, business_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_businesses_user_id ON user_businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_businesses_business_id ON user_businesses(business_id);
CREATE INDEX IF NOT EXISTS idx_user_businesses_primary ON user_businesses(user_id) WHERE is_primary = true;

-- Add premium_users table for tracking multi-business permissions
CREATE TABLE IF NOT EXISTS premium_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    max_businesses integer DEFAULT 1, -- Number of businesses they can manage
    subscription_tier text DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'premium', 'enterprise')),
    subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'cancelled')),
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    features jsonb DEFAULT '{}', -- Store enabled features like 'multi_business', 'analytics', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for premium users
CREATE INDEX IF NOT EXISTS idx_premium_users_user_id ON premium_users(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_users_subscription_status ON premium_users(subscription_status);

-- Add business_groups table for franchise management (future feature)
-- This will allow grouping multiple locations under one franchise
CREATE TABLE IF NOT EXISTS business_groups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    franchise_code text UNIQUE, -- For franchise identification
    settings jsonb DEFAULT '{}', -- Group-wide settings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link businesses to groups
CREATE TABLE IF NOT EXISTS business_group_memberships (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id uuid REFERENCES business_groups(id) ON DELETE CASCADE,
    business_id text REFERENCES businesses(id) ON DELETE CASCADE,
    role text DEFAULT 'member' CHECK (role IN ('headquarters', 'branch', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT business_group_memberships_unique UNIQUE (group_id, business_id)
);

-- Migration notes for future implementation:
-- 1. When enabling multi-business, migrate existing profiles.business_id to user_businesses table
-- 2. Set is_primary = true for the migrated business
-- 3. Update all queries to use user_businesses instead of profiles.business_id
-- 4. Implement premium user checks before allowing additional business claims
-- 5. Add UI for business switching in dashboard

-- Example migration query (for future use):
-- INSERT INTO user_businesses (user_id, business_id, role, is_primary)
-- SELECT id, business_id, 'owner', true 
-- FROM profiles 
-- WHERE business_id IS NOT NULL;

-- Example business limit check (for future use):
-- SELECT COUNT(*) as business_count, pu.max_businesses
-- FROM user_businesses ub
-- JOIN premium_users pu ON ub.user_id = pu.user_id
-- WHERE ub.user_id = $1
-- GROUP BY pu.max_businesses
-- HAVING COUNT(*) < pu.max_businesses;

-- Comments for future developers:
-- The current single-business model uses profiles.business_id
-- The future multi-business model will use user_businesses junction table
-- Premium users will be able to manage multiple businesses based on their subscription tier
-- Business groups will support franchise management (e.g., KFC managing multiple locations)
