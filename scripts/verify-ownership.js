#!/usr/bin/env node

/**
 * Final verification script for business ownership restoration
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const USER_ID = 'be90faa9-ed5a-4908-abe8-765e986ac497';
const BUSINESS_ID = 'cgi-maroc';

async function verifyOwnership() {
  console.log('🔍 Final verification of business ownership restoration...\n');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // 1. Verify user profile
    console.log('1. Verifying user profile...');
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, email, business_id, role')
      .eq('id', USER_ID)
      .single();
    
    if (userError) {
      console.error('❌ User verification failed:', userError.message);
      return;
    }
    
    console.log(`✅ User: ${user.full_name} (${user.id})`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Business ID: ${user.business_id}`);
    
    if (user.business_id !== BUSINESS_ID) {
      console.error('❌ User business_id does not match expected value');
      return;
    }
    
    // 2. Verify business details
    console.log('\n2. Verifying business details...');
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, category, city')
      .eq('id', BUSINESS_ID)
      .single();
    
    if (businessError) {
      console.error('❌ Business verification failed:', businessError.message);
      return;
    }
    
    console.log(`✅ Business: ${business.name} (${business.id})`);
    console.log(`   Category: ${business.category}`);
    console.log(`   City: ${business.city}`);
    
    // 3. Verify ownership link
    console.log('\n3. Verifying ownership link...');
    if (user.business_id === business.id) {
      console.log('✅ Ownership link verified - user.business_id matches business.id');
    } else {
      console.error('❌ Ownership link verification failed');
      return;
    }
    
    // 4. Check for any conflicting claims
    console.log('\n4. Checking for conflicting claims...');
    const { data: claims, error: claimsError } = await supabase
      .from('business_claims')
      .select('id, user_id, status')
      .eq('business_id', BUSINESS_ID)
      .eq('status', 'approved');
    
    if (claimsError) {
      console.error('❌ Claims check failed:', claimsError.message);
    } else if (claims && claims.length > 0) {
      const conflicting = claims.filter(claim => claim.user_id !== USER_ID);
      if (conflicting.length > 0) {
        console.warn('⚠️  Warning: Found conflicting approved claims:');
        conflicting.forEach(claim => {
          console.warn(`   - Claim ID: ${claim.id} by user ${claim.user_id}`);
        });
      } else {
        console.log('✅ No conflicting approved claims found');
      }
    } else {
      console.log('✅ No claims found for this business');
    }
    
    console.log('\n🎉 Ownership restoration verification completed successfully!');
    console.log(`📋 Summary:`);
    console.log(`   User: ${user.full_name} (${USER_ID})`);
    console.log(`   Business: ${business.name} (${BUSINESS_ID})`);
    console.log(`   Status: Ownership successfully restored`);
    
  } catch (error) {
    console.error('❌ Verification failed with error:', error.message);
  }
}

if (require.main === module) {
  verifyOwnership();
}

module.exports = { verifyOwnership };