#!/usr/bin/env node

/**
 * Complete business ownership restoration script
 * Handles both legacy profiles.business_id and new user_businesses table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const USER_ID = 'be90faa9-ed5a-4908-abe8-765e986ac497';
const BUSINESS_ID = 'cgi-maroc';

async function completeRestoration() {
  console.log('🔄 Starting complete business ownership restoration...\n');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // 1. Verify business exists
    console.log('1. Checking business existence...');
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, category, city')
      .eq('id', BUSINESS_ID)
      .single();
    
    if (businessError) {
      console.error('❌ Business not found:', businessError.message);
      return;
    }
    
    console.log(`✅ Found business: ${business.name} (${business.id})\n`);
    
    // 2. Verify user exists
    console.log('2. Checking user existence...');
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, email, business_id, role')
      .eq('id', USER_ID)
      .single();
    
    if (userError) {
      console.error('❌ User not found:', userError.message);
      return;
    }
    
    console.log(`✅ Found user: ${user.full_name} (${user.id})`);
    console.log(`   Current business_id: ${user.business_id}`);
    console.log(`   Role: ${user.role}\n`);
    
    // 3. Update legacy profiles.business_id (for backward compatibility)
    console.log('3. Updating legacy business association...');
    if (user.business_id !== BUSINESS_ID) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          business_id: BUSINESS_ID,
          role: 'pro'  // Ensure role is pro
        })
        .eq('id', USER_ID);
      
      if (updateError) {
        console.error('❌ Failed to update legacy profile:', updateError.message);
      } else {
        console.log('✅ Legacy profile updated successfully');
      }
    } else {
      console.log('✅ Legacy profile already correct');
    }
    
    // 4. Update user_businesses table (new system)
    console.log('\n4. Updating user_businesses table...');
    
    // Check if relationship already exists
    const { data: existingRelationship, error: checkError } = await supabase
      .from('user_businesses')
      .select('id')
      .eq('user_id', USER_ID)
      .eq('business_id', BUSINESS_ID)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error checking user_businesses:', checkError.message);
    } else if (existingRelationship) {
      console.log('✅ User-business relationship already exists in user_businesses');
    } else {
      // Create the relationship
      const { error: insertError } = await supabase
        .from('user_businesses')
        .insert({
          user_id: USER_ID,
          business_id: BUSINESS_ID,
          role: 'owner',
          is_primary: true
        });
      
      if (insertError) {
        console.error('❌ Failed to create user-business relationship:', insertError.message);
      } else {
        console.log('✅ User-business relationship created successfully');
      }
    }
    
    // 5. Check for conflicting claims
    console.log('\n5. Checking for conflicting claims...');
    const { data: conflictingClaims, error: claimsError } = await supabase
      .from('business_claims')
      .select('id, user_id, status')
      .eq('business_id', BUSINESS_ID)
      .eq('status', 'approved')
      .neq('user_id', USER_ID);
    
    if (claimsError) {
      console.error('❌ Error checking claims:', claimsError.message);
    } else if (conflictingClaims && conflictingClaims.length > 0) {
      console.warn('⚠️  Found conflicting approved claims:');
      for (const claim of conflictingClaims) {
        console.warn(`   - Claim ID: ${claim.id} by user ${claim.user_id}`);
      }
      
      // Ask user if they want to reject conflicting claims
      console.log('\n📝 These claims will prevent proper dashboard access.');
      console.log('You may want to reject them manually or contact the other users.');
    } else {
      console.log('✅ No conflicting approved claims found');
    }
    
    // 6. Final verification
    console.log('\n6. Final verification...');
    
    // Check profile
    const { data: finalProfile } = await supabase
      .from('profiles')
      .select('business_id, role')
      .eq('id', USER_ID)
      .single();
    
    // Check user_businesses
    const { data: finalUserBusinesses } = await supabase
      .from('user_businesses')
      .select('business_id, role, is_primary')
      .eq('user_id', USER_ID)
      .eq('business_id', BUSINESS_ID)
      .single();
    
    console.log('\n📋 Final Status:');
    console.log(`   Profile business_id: ${finalProfile?.business_id || 'null'}`);
    console.log(`   Profile role: ${finalProfile?.role || 'null'}`);
    console.log(`   User_businesses relationship: ${finalUserBusinesses ? '✅ Exists' : '❌ Missing'}`);
    if (finalUserBusinesses) {
      console.log(`   - Role: ${finalUserBusinesses.role}`);
      console.log(`   - Is Primary: ${finalUserBusinesses.is_primary}`);
    }
    
    if (finalProfile?.business_id === BUSINESS_ID && finalUserBusinesses) {
      console.log('\n🎉 Complete ownership restoration successful!');
      console.log('✅ User can now access their business dashboard');
    } else {
      console.log('\n❌ Restoration incomplete - manual verification required');
    }
    
    console.log(`\n📄 Summary:`);
    console.log(`   User: ${user.full_name} (${USER_ID})`);
    console.log(`   Business: ${business.name} (${BUSINESS_ID})`);
    console.log(`   Dashboard URL: https://avis.ma/dashboard/business/${BUSINESS_ID}`);
    
  } catch (error) {
    console.error('❌ Restoration failed with error:', error.message);
  }
}

if (require.main === module) {
  completeRestoration();
}

module.exports = { completeRestoration };