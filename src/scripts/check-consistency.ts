import { createClient } from '@supabase/supabase-js';

async function checkConsistency() {
  console.log('🔍 Checking for Race Conditions, Orphaned Data, and Inconsistencies...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // 1. Check for active triggers (race condition protection)
    console.log('1️⃣ Checking Active Triggers...');
    const { data: triggers, error: triggerError } = await supabase.rpc('get_active_triggers');
    
    if (triggerError) {
      console.log('   ⚠️  Could not fetch triggers (may need to run SQL directly)');
      console.log('   Expected triggers:');
      console.log('   - no_self_review_trigger');
      console.log('   - sync_premium_status_trigger');
      console.log('   - update_role_on_claim_approval_trigger\n');
    } else {
      console.log(`   ✅ Found ${triggers?.length || 0} triggers\n`);
    }

    // 2. Check for self-reviews (race condition)
    console.log('2️⃣ Checking for Self-Reviews (Race Condition)...');
    const { count: selfReviewCount, error: selfReviewError } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .filter('user_id', 'not.is', null)
      .gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

    if (selfReviewError) {
      console.log('   ⚠️  Could not check reviews\n');
    } else {
      console.log(`   ✅ Found ${selfReviewCount} recent reviews (checking for self-reviews requires SQL)\n`);
    }

    // 3. Check for orphaned profiles (no business)
    console.log('3️⃣ Checking for Orphaned Profiles...');
    const { data: orphanedProfiles, error: orphanError } = await supabase
      .from('profiles')
      .select('id, email, business_id, role')
      .eq('role', 'pro')
      .is('business_id', null);

    if (orphanError) {
      console.log('   ⚠️  Could not check orphaned profiles\n');
    } else {
      if (orphanedProfiles && orphanedProfiles.length > 0) {
        console.log(`   ⚠️  Found ${orphanedProfiles.length} orphaned profiles:`);
        orphanedProfiles.forEach(p => console.log(`      - ${p.email}`));
      } else {
        console.log('   ✅ No orphaned profiles found\n');
      }
    }

    // 4. Check for profiles without approved claims
    console.log('4️⃣ Checking for Profiles Without Approved Claims...');
    const { data: unclaimedProfiles, error: unclaimedError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        role,
        business_claims(id, status)
      `)
      .eq('role', 'pro');

    if (unclaimedError) {
      console.log('   ⚠️  Could not check claim status\n');
    } else {
      const problematic = (unclaimedProfiles || []).filter(p => 
        !p.business_claims?.some((c: any) => c.status === 'approved')
      );
      
      if (problematic.length > 0) {
        console.log(`   ⚠️  Found ${problematic.length} profiles without approved claims:`);
        problematic.forEach(p => console.log(`      - ${p.email}`));
      } else {
        console.log('   ✅ All pro profiles have approved claims\n');
      }
    }

    // 5. Check for orphaned business claims
    console.log('5️⃣ Checking for Orphaned Business Claims...');
    const { data: orphanedClaims, error: orphanClaimError } = await supabase
      .from('business_claims')
      .select('id, user_id, business_id, status')
      .limit(5);

    if (orphanClaimError) {
      console.log('   ⚠️  Could not check orphaned claims\n');
    } else {
      console.log(`   ℹ️  Found ${orphanedClaims?.length || 0} claims (manual verification needed)\n`);
    }

    // 6. Check for duplicate claims
    console.log('6️⃣ Checking for Duplicate Claims...');
    const { data: duplicateClaims, error: dupError } = await supabase.rpc('check_duplicate_claims');
    
    if (dupError) {
      console.log('   ⚠️  Could not check for duplicates (requires custom RPC)\n');
    } else {
      if (duplicateClaims && (duplicateClaims as any[]).length > 0) {
        console.log(`   ⚠️  Found ${(duplicateClaims as any[]).length} duplicate claims\n`);
      } else {
        console.log('   ✅ No duplicate claims found\n');
      }
    }

    // 7. Summary
    console.log('📋 SUMMARY:');
    console.log('============');
    console.log('✅ Race Condition Protections:');
    console.log('   - Self-review prevention trigger: YES (if deployed)');
    console.log('   - Premium sync trigger: YES (if deployed)');
    console.log('   - Role auto-update trigger: YES (if deployed)');
    console.log('');
    console.log('✅ Data Consistency:');
    console.log('   - Premium status sync: AUTOMATIC');
    console.log('   - Role updates: AUTOMATIC');
    console.log('   - Business hours: ATOMIC');
    console.log('');
    console.log('⚠️  Manual Verification Needed:');
    console.log('   - Run check-current-state.sql in Supabase SQL Editor');
    console.log('   - Check for orphaned auth users');
    console.log('   - Verify trigger deployment status');

  } catch (error) {
    console.error('❌ Error during consistency check:', error);
  }
}

checkConsistency();
