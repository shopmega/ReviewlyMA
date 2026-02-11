#!/usr/bin/env node

/**
 * Script to restore business ownership for a user
 * User UUID: be90faa9-ed5a-4908-abe8-765e986ac497
 * Business ID: cgi-maroc
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

// Target user and business
const USER_ID = 'be90faa9-ed5a-4908-abe8-765e986ac497';
const BUSINESS_ID = 'cgi-maroc';

async function restoreOwnership() {
  console.log('🔄 Starting business ownership restoration...\n');
  
  try {
    // 1. Check if business exists
    console.log('🔍 Checking if business exists...');
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, slug, category, city, created_at')
      .eq('id', BUSINESS_ID)
      .single();
    
    if (businessError) {
      console.error('❌ Business not found:', businessError.message);
      process.exit(1);
    }
    
    console.log('✅ Business found:');
    console.log(`   ID: ${business.id}`);
    console.log(`   Name: ${business.name}`);
    console.log(`   Category: ${business.category}`);
    console.log(`   City: ${business.city}\n`);
    
    // 2. Check current user status
    console.log('👤 Checking current user status...');
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, email, business_id, role')
      .eq('id', USER_ID)
      .single();
    
    if (userError) {
      console.error('❌ User not found:', userError.message);
      process.exit(1);
    }
    
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.full_name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current business_id: ${user.business_id}`);
    console.log(`   Role: ${user.role}\n`);
    
    // 3. Check current ownership
    console.log('🏢 Checking current business ownership...');
    const { data: currentOwner, error: ownerError } = await supabase
      .from('profiles')
      .select('id, full_name, business_id')
      .eq('business_id', BUSINESS_ID)
      .single();
    
    if (currentOwner) {
      console.log(`⚠️  Business is currently owned by: ${currentOwner.full_name} (${currentOwner.id})`);
    } else {
      console.log('✅ Business is not currently owned by anyone');
    }
    
    // 4. Check existing business claims
    console.log('\n📋 Checking existing business claims...');
    const { data: claims, error: claimsError } = await supabase
      .from('business_claims')
      .select(`
        id,
        business_id,
        user_id,
        status,
        created_at,
        profiles:profiles!inner(full_name, email)
      `)
      .eq('business_id', BUSINESS_ID);
    
    if (claims && claims.length > 0) {
      console.log(`Found ${claims.length} claim(s):`);
      claims.forEach(claim => {
        console.log(`   - ${claim.profiles.full_name} (${claim.user_id}): ${claim.status} (${claim.created_at})`);
      });
    } else {
      console.log('No existing claims found');
    }
    
    // 5. Check for conflicting approved claims
    console.log('\n⚠️  Checking for conflicting approved claims...');
    const { data: conflictingClaims, error: conflictError } = await supabase
      .from('business_claims')
      .select(`
        id,
        business_id,
        user_id,
        status,
        profiles:profiles!inner(full_name, email)
      `)
      .eq('business_id', BUSINESS_ID)
      .eq('status', 'approved')
      .neq('user_id', USER_ID);
    
    if (conflictingClaims && conflictingClaims.length > 0) {
      console.log(`⚠️  Found ${conflictingClaims.length} conflicting approved claim(s):`);
      conflictingClaims.forEach(claim => {
        console.log(`   - ${claim.profiles.full_name} (${claim.user_id})`);
      });
      
      // Ask for confirmation to reject conflicting claims
      console.log('\n📝 These claims will be rejected to restore ownership.');
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        readline.question('Do you want to proceed with rejecting these claims? (y/N): ', resolve);
      });
      
      readline.close();
      
      if (answer.toLowerCase() !== 'y') {
        console.log('❌ Operation cancelled by user');
        process.exit(0);
      }
      
      // Reject conflicting claims
      console.log('\n🔄 Rejecting conflicting claims...');
      for (const claim of conflictingClaims) {
        const { error: rejectError } = await supabase
          .from('business_claims')
          .update({
            status: 'rejected',
            admin_notes: `Ownership restored to user ${USER_ID}`,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', claim.id);
        
        if (rejectError) {
          console.error(`❌ Failed to reject claim ${claim.id}:`, rejectError.message);
        } else {
          console.log(`✅ Rejected claim from ${claim.profiles.full_name}`);
        }
      }
    } else {
      console.log('✅ No conflicting approved claims found');
    }
    
    // 6. Restore ownership
    console.log('\n🔄 Restoring ownership...');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ business_id: BUSINESS_ID })
      .eq('id', USER_ID);
    
    if (updateError) {
      console.error('❌ Failed to restore ownership:', updateError.message);
      process.exit(1);
    }
    
    console.log('✅ Ownership restored successfully!');
    
    // 7. Verify the restoration
    console.log('\n✅ Final verification:');
    const { data: verification, error: verifyError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        business_id,
        role,
        businesses:id(business_id:id, name, category, city)
      `)
      .eq('id', USER_ID)
      .single();
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
    } else {
      console.log(`   User: ${verification.full_name} (${verification.id})`);
      console.log(`   Business: ${verification.businesses?.name || 'None'} (${verification.business_id})`);
      console.log(`   Role: ${verification.role}`);
      
      if (verification.business_id === BUSINESS_ID) {
        console.log('🎉 Ownership restoration completed successfully!');
      } else {
        console.error('❌ Verification failed - ownership not properly restored');
        process.exit(1);
      }
    }
    
    // 8. Summary
    console.log('\n📊 Summary:');
    console.log(`   Business ID: ${BUSINESS_ID}`);
    console.log(`   Business Name: ${business.name}`);
    console.log(`   New Owner: ${user.full_name} (${USER_ID})`);
    console.log(`   Previous Owner: ${currentOwner ? currentOwner.full_name : 'None'}`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  restoreOwnership();
}

module.exports = { restoreOwnership };