
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkCategoriesSchema() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const { data: row, error } = await supabase.from('categories').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
        return;
    }
    if (row && row.length > 0) {
        console.log('Columns:', Object.keys(row[0]));
    } else {
        console.log('No data in categories table');
    }
}

checkCategoriesSchema();
