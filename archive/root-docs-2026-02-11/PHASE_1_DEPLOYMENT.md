# Phase 1 Deployment Guide

## 📋 Pre-Deployment Checklist

- [ ] Read `PHASE_1_IMPLEMENTATION_SUMMARY.md`
- [ ] Review SQL migration script for syntax
- [ ] Backup current database
- [ ] Have admin access to Supabase
- [ ] Test in staging environment first

---

## 🚀 Deployment Steps

### Step 1: Deploy Database Migration

1. **Open Supabase Dashboard**
   - Go to your project
   - Navigate to SQL Editor
   
2. **Copy SQL Migration Script**
   - Open: `docs/PREMIUM_SECURITY_IMPLEMENTATION.sql`
   - Copy entire content

3. **Execute Migration**
   ```
   Paste into Supabase SQL Editor
   Click "Run" button
   Wait for completion (should take ~10-15 seconds)
   ```

4. **Verify Migration Success**
   ```sql
   -- Check if tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_name IN ('premium_audit_log', 'premium_payments', 'messages')
   ORDER BY table_name;
   
   -- Expected output:
   -- messages
   -- premium_audit_log
   -- premium_payments
   ```

5. **Verify Indexes Created**
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename IN ('premium_audit_log', 'premium_payments')
   ORDER BY tablename, indexname;
   
   -- Should show:
   -- idx_premium_audit_log_admin_id
   -- idx_premium_audit_log_created_at
   -- idx_premium_audit_log_user_id
   -- idx_premium_payments_created_at
   -- idx_premium_payments_status
   -- idx_premium_payments_user_id
   ```

6. **Verify RLS Policies**
   ```sql
   SELECT tablename, policyname FROM pg_policies 
   WHERE tablename IN ('premium_audit_log', 'premium_payments', 'messages')
   ORDER BY tablename, policyname;
   ```

### Step 2: Deploy Code Changes

1. **Update Admin Actions**
   - File: `src/app/actions/admin.ts`
   - Status: ✅ Already updated
   - Contains:
     - Enhanced `toggleUserPremium()` with audit logging
     - Fixed `deleteBusiness()` with premium reset
     - New `verifyOfflinePayment()` function
     - New `rejectOfflinePayment()` function

2. **Deploy to Production**
   ```bash
   # Commit changes
   git add src/app/actions/admin.ts
   git commit -m "Phase 1: Add premium security and audit logging"
   
   # Deploy (your deployment process)
   npm run build
   npm run deploy
   ```

### Step 3: Post-Deployment Verification

1. **Test Premium Toggle**
   ```
   1. Go to Admin → Users
   2. Select any user
   3. Click "Passer Premium" or "Retirer Premium"
   4. Verify success message
   5. Check premium_audit_log table for new entry:
      SELECT * FROM premium_audit_log ORDER BY created_at DESC LIMIT 1;
   ```

2. **Test Business Deletion**
   ```
   1. Go to Admin → Businesses
   2. Select a business owned by a premium user
   3. Click delete
   4. Confirm deletion
   5. Check the user's profile:
      SELECT id, email, role, is_premium, business_id 
      FROM profiles WHERE email = 'user@example.com';
      
      Expected: role='user', is_premium=false, business_id=null
   ```

3. **Test Offline Payment Verification**
   ```
   1. In Supabase, create test payment record:
   
   INSERT INTO premium_payments (
     user_id, 
     business_id,
     payment_reference, 
     payment_method, 
     status
   ) VALUES (
     'user-uuid-here',
     'business-id-here',
     'TEST-001',
     'offline',
     'pending'
   );
   
   2. Call verification function (will need UI - for now test in code)
   3. Verify user now has is_premium=true
   4. Check audit log records the change
   ```

---

## 🔍 Verification Queries

### Check All Premium Users
```sql
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.is_premium,
  p.premium_granted_at,
  b.name as business_name
FROM profiles p
LEFT JOIN businesses b ON p.business_id = b.id
WHERE p.is_premium = true
ORDER BY p.premium_granted_at DESC;
```

### Check Recent Premium Changes
```sql
SELECT 
  pal.user_id,
  p.email,
  pal.action,
  pal.previous_status,
  pal.new_status,
  pal.payment_reference,
  pal.created_at
FROM premium_audit_log pal
LEFT JOIN profiles p ON pal.user_id = p.id
ORDER BY pal.created_at DESC
LIMIT 20;
```

### Check Pending Offline Payments
```sql
SELECT 
  pp.id,
  p.email,
  pp.payment_reference,
  pp.payment_method,
  pp.status,
  pp.created_at
FROM premium_payments pp
LEFT JOIN profiles p ON pp.user_id = p.id
WHERE pp.status = 'pending'
ORDER BY pp.created_at DESC;
```

### Check RLS Policies
```sql
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  qual as policy_condition
FROM pg_policies 
WHERE tablename IN ('premium_audit_log', 'premium_payments', 'messages', 'business_analytics')
ORDER BY tablename, policyname;
```

---

## ⚠️ Troubleshooting

### Issue: RLS Policies Not Created

**Symptom:** Policies show as not existing

**Solution:**
```sql
-- Re-run policy creation manually
DO $$ BEGIN
  CREATE POLICY "Admins can view premium audit logs" ON premium_audit_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin')
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
```

### Issue: Indexes Not Created

**Symptom:** Slow queries on premium_audit_log

**Solution:**
```sql
-- Create indexes manually
CREATE INDEX IF NOT EXISTS idx_premium_audit_log_user_id ON premium_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_audit_log_admin_id ON premium_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_premium_audit_log_created_at ON premium_audit_log(created_at);
```

### Issue: Trigger Not Working

**Symptom:** Audit log not updating when premium status changes

**Solution:**
```sql
-- Check trigger status
SELECT * FROM information_schema.triggers WHERE trigger_name = 'premium_change_trigger';

-- Recreate trigger
DROP TRIGGER IF EXISTS premium_change_trigger ON profiles;
CREATE TRIGGER premium_change_trigger
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION log_premium_change();
```

### Issue: Permission Denied on Tables

**Symptom:** "permission denied for schema public"

**Solution:**
```sql
-- Grant service role permissions
GRANT ALL ON premium_audit_log TO service_role;
GRANT ALL ON premium_payments TO service_role;
GRANT ALL ON messages TO service_role;

-- Grant authenticated role read permissions
GRANT SELECT ON premium_audit_log TO authenticated;
GRANT SELECT ON premium_payments TO authenticated;
GRANT SELECT ON messages TO authenticated;
```

---

## 🎯 Success Indicators

After deployment, you should see:

- ✅ All three new tables exist in database
- ✅ All indexes exist and are used
- ✅ RLS policies are active
- ✅ Premium toggle logs to audit table
- ✅ Business deletion resets premium status
- ✅ No permission errors in logs

---

## 📊 Performance Impact

- **Database Size Increase:** ~500KB for new tables
- **Query Performance:** Minimal impact (proper indexes added)
- **Audit Log Growth:** ~100 bytes per premium status change
- **Premium Payment Records:** ~200 bytes per record

---

## 🔐 Security Checklist

After deployment:

- [ ] RLS policies enabled on all premium tables
- [ ] Service role has appropriate permissions
- [ ] Users can only see their own payment records
- [ ] Admins can only see and modify audit logs
- [ ] Audit logs immutable (insert-only)
- [ ] No direct table access for non-authenticated users

---

## 📝 Rollback Plan

If deployment fails:

1. **Backup exists?** ✅ (Pre-deployment backup)

2. **Rollback SQL** (if needed):
```sql
-- Remove triggers
DROP TRIGGER IF EXISTS premium_change_trigger ON profiles;
DROP FUNCTION IF EXISTS log_premium_change();

-- Drop new tables (WARNING: Data loss)
-- DROP TABLE IF EXISTS premium_audit_log CASCADE;
-- DROP TABLE IF EXISTS premium_payments CASCADE;
-- DROP TABLE IF EXISTS messages CASCADE;

-- Or just disable:
ALTER TABLE premium_audit_log DISABLE TRIGGER ALL;
ALTER TABLE premium_payments DISABLE TRIGGER ALL;
ALTER TABLE messages DISABLE TRIGGER ALL;
```

3. **Restore from backup** if needed

---

## 📞 Post-Deployment Support

### Monitoring
- Watch audit log for suspicious activity
- Monitor premium_payments for pending items
- Check error logs for permission issues

### Next Steps
- Start Phase 2: Admin Payment Verification UI
- Create admin interface for payment management
- Add payment submission form for users

### Documentation
- Phase 1: `PHASE_1_IMPLEMENTATION_SUMMARY.md`
- Roadmap: `PREMIUM_IMPLEMENTATION_ROADMAP.md`
- Role Comparison: `USER_ROLE_COMPARISON.md`

---

**Deployment Date:** [Fill when deployed]  
**Deployed By:** [Your name]  
**Status:** ⏳ Ready for deployment

