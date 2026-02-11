-- =====================================================
-- PHASE 1: PREMIUM FEATURES SECURITY & DATA CONSISTENCY
-- =====================================================
-- This migration implements:
-- 1. RLS Policies for premium-only features
-- 2. Audit tracking for premium status changes
-- 3. Payment status tracking
-- 4. Data consistency fixes

-- =====================================================
-- 1. ADD PREMIUM-RELATED COLUMNS TO PROFILES
-- =====================================================

-- Add premium status tracking columns if not exists
DO $$ 
BEGIN
    -- Add is_premium column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_premium'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add premium grant date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'premium_granted_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN premium_granted_at TIMESTAMPTZ;
    END IF;
    
    -- Add business_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'business_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- 2. ADD AUDIT LOGGING TABLE FOR PREMIUM CHANGES
-- =====================================================

CREATE TABLE IF NOT EXISTS premium_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('granted', 'revoked', 'auto_granted')),
    reason TEXT,
    payment_reference VARCHAR(255),
    previous_status BOOLEAN,
    new_status BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index for lookups
    CONSTRAINT audit_log_check CHECK (previous_status IS DISTINCT FROM new_status)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_premium_audit_log_user_id ON premium_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_audit_log_admin_id ON premium_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_premium_audit_log_created_at ON premium_audit_log(created_at);

COMMENT ON TABLE premium_audit_log IS 'Tracks all premium status changes for audit and compliance purposes';

-- Enable RLS on audit log
ALTER TABLE premium_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
DO $$ BEGIN
  CREATE POLICY "Admins can view premium audit logs" ON premium_audit_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin')
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 3. ADD PAYMENT TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS premium_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL,
    payment_reference VARCHAR(255) NOT NULL UNIQUE,
    payment_method VARCHAR(50) DEFAULT 'offline', -- offline, stripe, paypal, etc
    amount_usd DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'refunded')),
    notes TEXT,
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_premium_payments_user_id ON premium_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_payments_status ON premium_payments(status);
CREATE INDEX IF NOT EXISTS idx_premium_payments_created_at ON premium_payments(created_at);

COMMENT ON TABLE premium_payments IS 'Tracks premium payment transactions and their verification status';

-- Enable RLS on payments table
ALTER TABLE premium_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
DO $$ BEGIN
  CREATE POLICY "Users can view their own payments" ON premium_payments FOR SELECT USING (
    auth.uid() = user_id
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Admins can view all payments
DO $$ BEGIN
  CREATE POLICY "Admins can view all payments" ON premium_payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin')
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Admins can update payment status
DO $$ BEGIN
  CREATE POLICY "Admins can update payments" ON premium_payments FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin')
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 4. CREATE FUNCTION TO LOG PREMIUM CHANGES
-- =====================================================

CREATE OR REPLACE FUNCTION log_premium_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if is_premium status changed
    IF (OLD.is_premium IS DISTINCT FROM NEW.is_premium) THEN
        -- Skip logging if admin_id would be null (trigger context)
        -- This will be logged by the admin action instead
        BEGIN
            INSERT INTO premium_audit_log (
                admin_id,
                user_id,
                action,
                previous_status,
                new_status
            ) VALUES (
                auth.uid(),
                NEW.id,
                CASE WHEN NEW.is_premium THEN 'granted' ELSE 'revoked' END,
                OLD.is_premium,
                NEW.is_premium
            );
        EXCEPTION WHEN not_null_violation THEN
            -- Silent fail - admin action will log this properly
            NULL;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to log premium changes
DROP TRIGGER IF EXISTS premium_change_trigger ON profiles;
CREATE TRIGGER premium_change_trigger
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION log_premium_change();

-- =====================================================
-- 5. ADD MESSAGING TABLE WITH PREMIUM GATING
-- =====================================================

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    sender_name VARCHAR(255),
    sender_email VARCHAR(255),
    content TEXT NOT NULL,
    is_from_business BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_messages_business_id ON messages(business_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

COMMENT ON TABLE messages IS 'Direct messages between customers and premium businesses';

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Pro users can view messages for their premium company
DO $$ BEGIN
  CREATE POLICY "Premium pro users can view their messages" ON messages FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND role = 'pro'
      AND is_premium = true
    )
    OR sender_id = auth.uid()
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Pro users can send messages from their company
DO $$ BEGIN
  CREATE POLICY "Pro users can send company messages" ON messages FOR INSERT WITH CHECK (
    is_from_business = false OR (
      is_from_business = true AND business_id IN (
        SELECT business_id FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND role = 'pro'
        AND is_premium = true
      )
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 6. ADD INDEX FOR PREMIUM STATUS LOOKUPS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON profiles(is_premium);
CREATE INDEX IF NOT EXISTS idx_profiles_role_premium ON profiles(role, is_premium);
CREATE INDEX IF NOT EXISTS idx_businesses_is_premium ON businesses(is_premium);

-- =====================================================
-- 7. CREATE VIEW FOR PREMIUM USERS
-- =====================================================

DROP VIEW IF EXISTS premium_pro_users;
CREATE VIEW premium_pro_users AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.business_id,
    b.name as business_name,
    p.is_premium,
    p.premium_granted_at,
    p.created_at
FROM profiles p
LEFT JOIN businesses b ON p.business_id = b.id
WHERE p.role = 'pro' AND p.is_premium = true;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Allow service role to manage premium features
GRANT ALL ON premium_audit_log TO service_role;
GRANT ALL ON premium_payments TO service_role;
GRANT ALL ON messages TO service_role;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Run this in Supabase SQL editor to apply all changes
-- Verify with:
-- SELECT * FROM information_schema.tables WHERE table_name IN ('premium_audit_log', 'premium_payments', 'messages');
-- SELECT * FROM pg_indexes WHERE tablename = 'premium_audit_log';

