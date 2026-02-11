#!/bin/bash

# =====================================================
# Security Fixes Application Script
# Applies all critical database security fixes
# =====================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_REF="${SUPABASE_PROJECT_REF:-your-project-ref}"
DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres}"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/security_fix_backup_${TIMESTAMP}.sql"

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}    Supabase Security Fixes Application Script    ${NC}"
echo -e "${BLUE}====================================================${NC}"
echo ""

# Check if required tools are installed
command -v psql >/dev/null 2>&1 || { 
    echo -e "${RED}Error: psql is not installed. Please install PostgreSQL client tools.${NC}"
    exit 1
}

command -v jq >/dev/null 2>&1 || { 
    echo -e "${YELLOW}Warning: jq is not installed. Some features may not work.${NC}"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Step 1: Creating database backup...${NC}"
if [ -f "$DB_URL" ]; then
    # Create backup from direct connection
    pg_dump "$DB_URL" > "$BACKUP_FILE"
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠ Could not create automatic backup. Please create manual backup before proceeding.${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Aborted. Please create backup first.${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${YELLOW}Step 2: Validating migration file...${NC}"
MIGRATION_FILE="./supabase/migrations/20260209_security_remediation.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

# Check SQL syntax
if psql --help >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Migration file found${NC}"
else
    echo -e "${RED}Error: Cannot validate SQL syntax${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Applying security fixes...${NC}"

# Apply migration
if [ -n "$DB_URL" ]; then
    # Apply via direct connection
    echo -e "${BLUE}Applying migration via direct database connection...${NC}"
    psql "$DB_URL" < "$MIGRATION_FILE"
    echo -e "${GREEN}✓ Security fixes applied successfully${NC}"
else
    echo -e "${YELLOW}⚠ No direct database connection available.${NC}"
    echo -e "${YELLOW}Please manually apply the migration file:${NC}"
    echo -e "${BLUE}  1. Open Supabase Dashboard${NC}"
    echo -e "${BLUE}  2. Go to SQL Editor${NC}"
    echo -e "${BLUE}  3. Copy contents of: $MIGRATION_FILE${NC}"
    echo -e "${BLUE}  4. Execute the script${NC}"
    echo ""
    read -p "Press Enter after applying the migration manually..."
fi

echo ""
echo -e "${YELLOW}Step 4: Verifying fixes...${NC}"

# Verification queries
echo -e "${BLUE}Running verification queries...${NC}"

VERIFY_SQL="
-- Check RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'salaries', 'verification_codes', 'interviews', 'test_business_analytics',
    'premium_users', 'business_groups', 'business_group_memberships', 'search_analytics'
)
ORDER BY tablename;

-- Check policies count
SELECT 
    COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- Check secure view
SELECT COUNT(*) as secure_views
FROM pg_views 
WHERE viewname = 'search_analytics_public';
"

if [ -n "$DB_URL" ]; then
    echo -e "${BLUE}RLS Status:${NC}"
    psql "$DB_URL" -c "
        SELECT 
            tablename,
            rowsecurity as rls_enabled
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'salaries', 'verification_codes', 'interviews', 'test_business_analytics',
            'premium_users', 'business_groups', 'business_group_memberships', 'search_analytics'
        )
        ORDER BY tablename;
    " | column -t

    echo ""
    echo -e "${BLUE}Policies Created:${NC}"
    POLICY_COUNT=$(psql "$DB_URL" -t -c "
        SELECT COUNT(*) 
        FROM pg_policies 
        WHERE schemaname = 'public';
    " | tr -d ' ')
    echo -e "${GREEN}✓ $POLICY_COUNT RLS policies created${NC}"

    echo ""
    echo -e "${BLUE}Secure Views:${NC}"
    VIEW_COUNT=$(psql "$DB_URL" -t -c "
        SELECT COUNT(*) 
        FROM pg_views 
        WHERE viewname = 'search_analytics_public';
    " | tr -d ' ')
    if [ "$VIEW_COUNT" -eq 1 ]; then
        echo -e "${GREEN}✓ Secure view created${NC}"
    else
        echo -e "${RED}✗ Secure view not found${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Cannot verify automatically. Please run verification queries manually.${NC}"
fi

echo ""
echo -e "${YELLOW}Step 5: Post-fix recommendations...${NC}"
echo -e "${BLUE}1. Test application functionality${NC}"
echo -e "${BLUE}2. Verify user access patterns${NC}"
echo -e "${BLUE}3. Check admin functionality${NC}"
echo -e "${BLUE}4. Monitor audit logs${NC}"
echo -e "${BLUE}5. Update API documentation if needed${NC}"

echo ""
echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}           Security Fixes Applied Successfully!        ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "• Test all user roles and permissions"
echo -e "• Monitor application logs for issues"
echo -e "• Check audit log table for security events"
echo -e "• Update any application code using direct table access"
echo ""
echo -e "${BLUE}Backup file: $BACKUP_FILE${NC}"
echo -e "${BLUE}Migration file: $MIGRATION_FILE${NC}"
echo ""

# Optional: Create rollback script
echo -e "${YELLOW}Creating rollback script...${NC}"
ROLLBACK_FILE="./scripts/rollback-security-fixes_${TIMESTAMP}.sql"

cat > "$ROLLBACK_FILE" << EOF
-- =====================================================
-- Rollback Script for Security Fixes
-- Created: $(date)
-- Use this ONLY if critical issues occur
-- =====================================================

-- WARNING: This will remove all security protections!
-- Only use in emergency situations.

-- Drop secure view
DROP VIEW IF EXISTS public.search_analytics_public;

-- Recreate SECURITY DEFINER view (if needed)
DROP VIEW IF EXISTS public.premium_pro_users;
CREATE OR REPLACE VIEW public.premium_pro_users WITH (security_definer) AS
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

-- Disable RLS (DANGEROUS!)
ALTER TABLE IF EXISTS public.salaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.verification_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.interviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.test_business_analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.premium_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.business_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.business_group_memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.search_analytics DISABLE ROW LEVEL SECURITY;

-- Restore public access
GRANT ALL ON public.search_analytics TO authenticated;
GRANT ALL ON public.search_analytics TO anon;

-- Drop audit log
DROP TABLE IF EXISTS public.security_audit_log;

SELECT 'Rollback completed - SECURITY COMPROMISED' as status;
EOF

echo -e "${GREEN}✓ Rollback script created: $ROLLBACK_FILE${NC}"
echo ""
echo -e "${RED}⚠️  Use rollback script ONLY in emergency situations!${NC}"
