import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

async function setupAdminUser(email: string) {
    console.log(`🔧 Setting up admin user: ${email}\n`);

    try {
        // Find the user by email
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            console.error('❌ Error listing users:', listError.message);
            return;
        }

        const user = users.find(u => u.email === email);
        if (!user) {
            console.error(`❌ User with email ${email} not found`);
            console.log('\nAvailable users:');
            users.forEach(u => console.log(`  - ${u.email}`));
            return;
        }

        console.log(`✅ Found user: ${user.email}`);

        // Update profile to set role as admin
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', user.id);

        if (updateError) {
            console.error('❌ Error updating profile:', updateError.message);
            return;
        }

        console.log(`✅ Successfully set ${email} as admin`);
        console.log('\nYou can now access:');
        console.log('  - /admin       (Admin Dashboard)');
        console.log('  - /admin/utilisateurs (Manage Users)');
        console.log('  - /admin/revendications (Approve Claims)');
        console.log('  - /admin/etablissements (Manage Businesses)');
        console.log('  - /admin/parametres (Settings)');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Get email from command line argument or ask for it
const email = process.argv[2];
if (!email) {
    console.error('❌ Usage: ts-node setup-admin-user.ts <email>');
    console.error('Example: ts-node setup-admin-user.ts admin@example.com');
    process.exit(1);
}

setupAdminUser(email).catch(console.error);
