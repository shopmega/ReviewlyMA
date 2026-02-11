
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkBusinesses() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: businesses, error } = await supabase
        .from('businesses')
        .select('category')
        .eq('category', 'Charte de confiance');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Businesses with "Charte de confiance" category: ${businesses.length}`);
}

checkBusinesses();
