# =====================================================
# Security Fixes Application Script (PowerShell)
# Applies all critical database security fixes
# =====================================================

param(
    [string]$ProjectRef = $env:SUPABASE_PROJECT_REF,
    [string]$DbUrl = $env:SUPABASE_DB_URL,
    [switch]$SkipBackup,
    [switch]$Force
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Write-Separator {
    Write-ColorOutput "====================================================" "Blue"
    Write-ColorOutput "    Supabase Security Fixes Application Script    " "Blue"
    Write-ColorOutput "====================================================" "Blue"
    Write-Host ""
}

function Test-Prerequisites {
    Write-ColorOutput "Step 1: Checking prerequisites..." "Yellow"
    
    # Check if psql is available
    try {
        $null = Get-Command psql -ErrorAction Stop
        Write-ColorOutput "✓ psql is available" "Green"
    } catch {
        Write-ColorOutput "✗ psql is not installed. Please install PostgreSQL client tools." "Red"
        return $false
    }
    
    # Check if migration file exists
    $MigrationFile = "./supabase/migrations/20260209_security_remediation.sql"
    if (Test-Path $MigrationFile) {
        Write-ColorOutput "✓ Migration file found: $MigrationFile" "Green"
    } else {
        Write-ColorOutput "✗ Migration file not found: $MigrationFile" "Red"
        return $false
    }
    
    return $true
}

function New-DatabaseBackup {
    param([string]$DbUrl, [string]$BackupDir)
    
    if ($SkipBackup) {
        Write-ColorOutput "⚠ Skipping backup (SkipBackup specified)" "Yellow"
        return $null
    }
    
    Write-ColorOutput "Step 2: Creating database backup..." "Yellow"
    
    $Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $BackupFile = "$BackupDir\security_fix_backup_$Timestamp.sql"
    
    # Create backup directory
    if (!(Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    
    if ($DbUrl) {
        try {
            # Create backup
            & pg_dump $DbUrl > $BackupFile
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "✓ Backup created: $BackupFile" "Green"
                return $BackupFile
            } else {
                throw "pg_dump failed with exit code $LASTEXITCODE"
            }
        } catch {
            Write-ColorOutput "✗ Backup failed: $($_.Exception.Message)" "Red"
            if (!$Force) {
                $response = Read-Host "Continue anyway? (y/N)"
                if ($response -notmatch '^[Yy]') {
                    Write-ColorOutput "Aborted. Please resolve backup issues first." "Red"
                    exit 1
                }
            }
        }
    } else {
        Write-ColorOutput "⚠ No database connection available. Please create manual backup." "Yellow"
        if (!$Force) {
            $response = Read-Host "Continue anyway? (y/N)"
            if ($response -notmatch '^[Yy]') {
                Write-ColorOutput "Aborted. Please create backup first." "Red"
                exit 1
            }
        }
    }
    
    return $null
}

function Invoke-SecurityMigration {
    param([string]$MigrationFile, [string]$DbUrl)
    
    Write-ColorOutput "Step 3: Applying security fixes..." "Yellow"
    
    if ($DbUrl) {
        try {
            Write-ColorOutput "Applying migration via direct database connection..." "Blue"
            & psql $DbUrl -f $MigrationFile
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "✓ Security fixes applied successfully" "Green"
                return $true
            } else {
                throw "psql failed with exit code $LASTEXITCODE"
            }
        } catch {
            Write-ColorOutput "✗ Migration failed: $($_.Exception.Message)" "Red"
            return $false
        }
    } else {
        Write-ColorOutput "⚠ No direct database connection available." "Yellow"
        Write-ColorOutput "Please manually apply the migration:" "Yellow"
        Write-ColorOutput "  1. Open Supabase Dashboard" "Blue"
        Write-ColorOutput "  2. Go to SQL Editor" "Blue"
        Write-ColorOutput "  3. Copy contents of: $MigrationFile" "Blue"
        Write-ColorOutput "  4. Execute the script" "Blue"
        Write-Host ""
        $null = Read-Host "Press Enter after applying the migration manually"
        return $true
    }
}

function Test-SecurityFixes {
    param([string]$DbUrl)
    
    Write-ColorOutput "Step 4: Verifying fixes..." "Yellow"
    
    if ($DbUrl) {
        try {
            Write-ColorOutput "Checking RLS status..." "Blue"
            $rlsQuery = @"
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
"@
            
            $rlsResult = & psql $DbUrl -c $rlsQuery -t -A
            Write-ColorOutput "RLS Status:" "Blue"
            Write-Host $rlsResult
            
            Write-Host ""
            Write-ColorOutput "Checking policies..." "Blue"
            $policyQuery = "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';"
            $policyCount = & psql $DbUrl -c $policyQuery -t -A
            $policyCount = $policyCount.Trim()
            Write-ColorOutput "✓ $policyCount RLS policies created" "Green"
            
            Write-Host ""
            Write-ColorOutput "Checking secure views..." "Blue"
            $viewQuery = "SELECT COUNT(*) FROM pg_views WHERE viewname = 'search_analytics_public';"
            $viewCount = & psql $DbUrl -c $viewQuery -t -A
            $viewCount = $viewCount.Trim()
            
            if ($viewCount -eq "1") {
                Write-ColorOutput "✓ Secure view created" "Green"
            } else {
                Write-ColorOutput "✗ Secure view not found" "Red"
            }
            
        } catch {
            Write-ColorOutput "⚠ Cannot verify automatically: $($_.Exception.Message)" "Yellow"
        }
    } else {
        Write-ColorOutput "⚠ Cannot verify automatically. Please run verification queries manually." "Yellow"
    }
}

function New-RollbackScript {
    param([string]$OutputDir)
    
    Write-ColorOutput "Step 5: Creating rollback script..." "Yellow"
    
    $Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $RollbackFile = "$OutputDir\rollback-security-fixes_$Timestamp.sql"
    
    $RollbackContent = @"
-- =====================================================
-- Rollback Script for Security Fixes
-- Created: $(Get-Date)
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
"@
    
    $RollbackContent | Out-File -FilePath $RollbackFile -Encoding UTF8
    Write-ColorOutput "✓ Rollback script created: $RollbackFile" "Green"
    Write-ColorOutput "⚠️  Use rollback script ONLY in emergency situations!" "Red"
}

function Show-NextSteps {
    param([string]$BackupFile)
    
    Write-Host ""
    Write-ColorOutput "====================================================" "Green"
    Write-ColorOutput "           Security Fixes Applied Successfully!        " "Green"
    Write-ColorOutput "====================================================" "Green"
    Write-Host ""
    Write-ColorOutput "Next Steps:" "Yellow"
    Write-ColorOutput "• Test all user roles and permissions" "White"
    Write-ColorOutput "• Monitor application logs for issues" "White"
    Write-ColorOutput "• Check audit log table for security events" "White"
    Write-ColorOutput "• Update any application code using direct table access" "White"
    Write-Host ""
    
    if ($BackupFile) {
        Write-ColorOutput "Backup file: $BackupFile" "Blue"
    }
    Write-ColorOutput "Migration file: ./supabase/migrations/20260209_security_remediation.sql" "Blue"
    Write-Host ""
}

# Main execution
try {
    Write-Separator
    
    # Check prerequisites
    if (!(Test-Prerequisites)) {
        exit 1
    }
    
    # Create backup
    $BackupDir = "./backups"
    $BackupFile = New-DatabaseBackup -DbUrl $DbUrl -BackupDir $BackupDir
    
    # Apply migration
    $MigrationFile = "./supabase/migrations/20260209_security_remediation.sql"
    if (!(Invoke-SecurityMigration -MigrationFile $MigrationFile -DbUrl $DbUrl)) {
        exit 1
    }
    
    # Verify fixes
    Test-SecurityFixes -DbUrl $DbUrl
    
    # Create rollback script
    New-RollbackScript -OutputDir "./scripts"
    
    # Show next steps
    Show-NextSteps -BackupFile $BackupFile
    
} catch {
    Write-ColorOutput "Script failed: $($_.Exception.Message)" "Red"
    exit 1
}
