#!/usr/bin/env node

/**
 * Admin script to assign businesses to users
 * Usage: node scripts/admin-assign-business.js <user-email> <business-id> [role] [is-primary]
 * 
 * Examples:
 * node scripts/admin-assign-business.js user@example.com business-123
 * node scripts/admin-assign-business.js user@example.com business-123 owner true
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dashboardBaseUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://example.com').replace(/\/+$/, '');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function assignBusinessToUser() {
  // Parse command line arguments
  const email = process.argv[2];
  const businessId = process.argv[3];
  const role = process.argv[4] || 'owner';
  const isPrimary = process.argv[5] === 'true' || process.argv[5] === '1' || false;

  if (!email || !businessId) {
    console.error('❌ Usage: node admin-assign-business.js <user-email> <business-id> [role] [is-primary]');
    console.error('Examples:');
    console.error('  node admin-assign-business.js user@example.com business-123');
    console.error('  node admin-assign-business.js user@example.com business-123 owner true');
    console.error('  node admin-assign-business.js user@example.com business-123 manager false');
    process.exit(1);
  }

  console.log('🔄 Starting business assignment...\n');
  console.log(`User Email: ${email}`);
  console.log(`Business ID: ${businessId}`);
  console.log(`Role: ${role}`);
  console.log(`Is Primary: ${isPrimary}\n`);

  try {
    // 1. Find user by email
    console.log('1. Finding user by email...');
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error listing users:', usersError.message);
      process.exit(1);
    }

    const users = usersData?.users || [];
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.id} (${user.email})\n`);

    // 2. Verify business exists
    console.log('2. Verifying business exists...');
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, category, city')
      .eq('id', businessId)
      .single();

    if (businessError) {
      console.error(`❌ Business ${businessId} not found:`, businessError.message);
      process.exit(1);
    }

    console.log(`✅ Found business: ${business.name} (${business.id})\n`);

    // 3. Check current user business associations
    console.log('3. Checking current user associations...');
    
    // Check profiles table (legacy)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error checking user profile:', profileError.message);
      process.exit(1);
    }

    // Check user_businesses table (new system)
    const { data: userBusinesses, error: userBusinessesError } = await supabase
      .from('user_businesses')
      .select('business_id, role, is_primary')
      .eq('user_id', user.id);

    if (userBusinessesError && userBusinessesError.code !== 'PGRST116') {
      console.error('❌ Error checking user_businesses:', userBusinessesError.message);
    }

    console.log(`   Current profile business_id: ${profile.business_id || 'null'}`);
    console.log(`   Current profile role: ${profile.role}`);
    console.log(`   Current user_businesses entries: ${userBusinesses?.length || 0}\n`);

    // 4. Check for conflicting assignments
    console.log('4. Checking for conflicts...');
    
    // Check if business is already assigned to another user
    const { data: existingAssignments, error: existingError } = await supabase
      .from('user_businesses')
      .select('user_id')
      .eq('business_id', businessId)
      .eq('role', 'owner');

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('❌ Error checking existing assignments:', existingError.message);
    }

    if (existingAssignments && existingAssignments.length > 0) {
      const otherUserIds = existingAssignments
        .filter(assignment => assignment.user_id !== user.id)
        .map(assignment => assignment.user_id);
      
      if (otherUserIds.length > 0) {
        console.warn('⚠️  Warning: This business is already owned by other user(s):');
        for (const userId of otherUserIds) {
          console.warn(`   - User ID: ${userId}`);
        }
        console.log('');
      }
    }

    // 5. Update user profile (legacy system)
    console.log('5. Updating user profile (legacy system)...');
    
    const profileUpdate = {
      business_id: businessId,
      role: profile.role === 'user' ? 'pro' : profile.role
    };

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id);

    if (profileUpdateError) {
      console.error('❌ Error updating profile:', profileUpdateError.message);
    } else {
      console.log('✅ Profile updated successfully');
    }

    // 6. Update user_businesses table (new system)
    console.log('\n6. Updating user_businesses table (new system)...');
    
    // Remove any existing assignments for this user-business combination
    const { error: deleteError } = await supabase
      .from('user_businesses')
      .delete()
      .eq('user_id', user.id)
      .eq('business_id', businessId);

    if (deleteError) {
      console.error('❌ Error removing existing assignment:', deleteError.message);
    }

    // Add new assignment
    const { error: insertError } = await supabase
      .from('user_businesses')
      .insert({
        user_id: user.id,
        business_id: businessId,
        role: role,
        is_primary: isPrimary
      });

    if (insertError) {
      console.error('❌ Error creating new assignment:', insertError.message);
    } else {
      console.log('✅ User-business relationship created successfully');
    }

    // 7. Check for conflicting approved claims
    console.log('\n7. Checking for conflicting claims...');
    const { data: conflictingClaims, error: claimsError } = await supabase
      .from('business_claims')
      .select('id, user_id, status, full_name')
      .eq('business_id', businessId)
      .eq('status', 'approved')
      .neq('user_id', user.id);

    if (claimsError) {
      console.error('❌ Error checking claims:', claimsError.message);
    } else if (conflictingClaims && conflictingClaims.length > 0) {
      console.warn('⚠️  Warning: Found conflicting approved claims:');
      for (const claim of conflictingClaims) {
        console.warn(`   - Claim ID: ${claim.id} by ${claim.full_name} (${claim.user_id})`);
      }
      console.log('📝 You may want to reject these claims to prevent conflicts.\n');
    } else {
      console.log('✅ No conflicting approved claims found\n');
    }

    // 8. Final verification
    console.log('8. Final verification...');
    
    // Verify profile update
    const { data: finalProfile } = await supabase
      .from('profiles')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    // Verify user_businesses update
    const { data: finalUserBusinesses } = await supabase
      .from('user_businesses')
      .select('business_id, role, is_primary')
      .eq('user_id', user.id)
      .eq('business_id', businessId)
      .single();

    console.log('\n📋 Final Status:');
    console.log(`   Profile business_id: ${finalProfile?.business_id || 'null'}`);
    console.log(`   Profile role: ${finalProfile?.role || 'null'}`);
    console.log(`   User_businesses relationship: ${finalUserBusinesses ? '✅ Exists' : '❌ Missing'}`);
    if (finalUserBusinesses) {
      console.log(`   - Role: ${finalUserBusinesses.role}`);
      console.log(`   - Is Primary: ${finalUserBusinesses.is_primary}`);
    }

    if (finalProfile?.business_id === businessId && finalUserBusinesses) {
      console.log('\n🎉 Business assignment completed successfully!');
      console.log(`✅ User ${user.email} can now access business ${business.name}`);
      console.log(`   Dashboard URL: ${dashboardBaseUrl}/dashboard/business/${businessId}`);
    } else {
      console.log('\n❌ Assignment incomplete - manual verification required');
    }

    console.log(`\n📄 Summary:`);
    console.log(`   User: ${user.email} (${user.id})`);
    console.log(`   Business: ${business.name} (${business.id})`);
    console.log(`   Assigned Role: ${role}`);
    console.log(`   Is Primary: ${isPrimary}`);

  } catch (error) {
    console.error('❌ Assignment failed with error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  assignBusinessToUser();
}

module.exports = { assignBusinessToUser };
