
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Env vars missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

async function clearDb() {
    console.log('🧹 Clearing all business data from Supabase...');

    // 1. Delete Reviews (FK to businesses)
    const { error: revErr } = await supabase.from('reviews').delete().neq('id', 0);
    if (revErr) console.warn('Warning cleaning reviews:', revErr.message);
    else console.log('✅ Reviews cleared.');

    // 2. Delete Updates (FK to businesses)
    const { error: updErr } = await supabase.from('updates').delete().neq('id', 0);
    if (updErr) console.warn('Warning cleaning updates:', updErr.message);
    else console.log('✅ Updates cleared.');

    // 3. Delete Business Hours (FK to businesses)
    const { error: hrsErr } = await supabase.from('business_hours').delete().neq('business_id', 'placeholder');
    if (hrsErr) console.warn('Warning cleaning hours:', hrsErr.message);
    else console.log('✅ Business Hours cleared.');

    // 4. Delete Claims? (FK to businesses) - Optional but good for complete clean
    const { error: claimsErr } = await supabase.from('business_claims').delete().neq('id', 'placeholder');
    if (claimsErr) console.warn('Warning cleaning claims:', claimsErr.message);
    else console.log('✅ Claims cleared.');

    // 5. Delete Businesses
    const { error: busErr } = await supabase.from('businesses').delete().neq('id', 'placeholder');
    if (busErr) {
        console.error('❌ Error cleaning businesses:', busErr.message);
    } else {
        console.log('✅ Businesses cleared.');
    }

    console.log('✨ Database is now empty.');
}

clearDb().catch(console.error);
