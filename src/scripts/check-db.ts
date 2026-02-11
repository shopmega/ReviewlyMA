
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Env vars missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking database...');

    const { data: businesses, error: busError } = await supabase
        .from('businesses')
        .select('id, name, city, category')
        .limit(10);

    if (busError) {
        console.error('Error fetching businesses:', busError);
    } else {
        console.log(`Found ${businesses.length} businesses:`);
        businesses.forEach(b => console.log(` - ${b.name} (${b.city}, ${b.category})`));
    }

    const { count, error: countError } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });

    console.log(`Total businesses count: ${count}`);
}

check();
