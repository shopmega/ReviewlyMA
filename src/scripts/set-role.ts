
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

async function setRole() {
    const args = process.argv.slice(2);
    const email = args[0];
    const role = args[1];
    const businessId = args[2];

    if (!email || !role) {
        console.error('Usage: npx tsx src/scripts/set-role.ts <email> <role> [business_id]');
        process.exit(1);
    }

    console.log(`🔍 Finding user ${email}...`);

    // 1. Get User ID from Auth (Admin API not available in client, but we can query profiles if email is there? No, email is in auth.users)
    // Actually, profiles usually has ID matching auth.users. 
    // We can't query auth.users directly easily without admin api.
    // BUT, we can assume the user is in 'profiles' if they logged in? 
    // Wait, profiles usually has email? Let's check schema.
    // If not, we might fail.

    // Let's try to list users via admin api
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('Error listing users:', listError);
        process.exit(1);
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error(`User ${email} not found.`);
        process.exit(1);
    }

    console.log(`✅ Found user: ${user.id}`);

    const updateData: any = { role: role };
    if (businessId) {
        updateData.business_id = businessId;
    }

    const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

    if (error) {
        console.error('Error updating profile:', error);
    } else {
        console.log(`✅ Updated profile for ${email}: role=${role} ${businessId ? `business_id=${businessId}` : ''}`);

        // If role is pro, ensure business exists (optional check)
    }
}

setRole().catch(console.error);
