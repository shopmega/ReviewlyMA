
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function setupProUser() {
    console.log('🔧 Setting up Pro user test data...\n');

    // Find first admin/pro user
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('role', 'admin')
        .limit(1)
        .single();

    if (profileError || !profile) {
        console.log('❌ No admin user found. Please create one first.');
        return;
    }

    console.log(`Found admin user: ${profile.email}`);

    // Find a business to assign
    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, name')
        .limit(1)
        .single();

    if (businessError || !business) {
        console.log('❌ No business found to assign.');
        return;
    }

    console.log(`Found business: ${business.name} (${business.id})`);

    // Update the profile with the business_id
    const { error: updateError } = await supabase
        .from('profiles')
        .update({
            business_id: business.id,
            role: 'pro',
            tier: 'gold',
            is_premium: true
        })
        .eq('id', profile.id);

    if (updateError) {
        console.log('❌ Error updating profile:', updateError.message);
        return;
    }

    console.log(`\n✅ Successfully linked ${profile.email} to "${business.name}"`);
    console.log(`\nThe user now has role "pro" and can access:`);
    console.log(`  - /dashboard       (Pro Dashboard)`);
    console.log(`  - /dashboard/reviews (Manage Reviews)`);
    console.log(`  - /dashboard/analytics (Analytics)`);
    console.log(`  - /dashboard/edit-profile (Edit Business)`);
}

setupProUser().catch(console.error);
