
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';

async function checkCollections() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: collections, error } = await supabase
        .from('seasonal_collections')
        .select('*');

    if (error) {
        console.error('Error:', error);
        return;
    }

    fs.writeFileSync('collections_output.json', JSON.stringify(collections, null, 2));
    console.log(`Saved ${collections.length} collections to collections_output.json`);
}

checkCollections();
