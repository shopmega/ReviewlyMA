
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';

async function checkCategories() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error:', error);
        return;
    }

    fs.writeFileSync('categories_output.json', JSON.stringify(categories, null, 2));
    console.log(`Saved ${categories.length} categories to categories_output.json`);
}

checkCategories();
