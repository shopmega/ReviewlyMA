
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function checkCategoryUsage() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: categories } = await supabase.from('categories').select('name');

    let report = '--- Business Counts per Category ---\n';
    for (const cat of categories || []) {
        const { count } = await supabase
            .from('businesses')
            .select('*', { count: 'exact', head: true })
            .eq('category', cat.name);

        report += `${cat.name.padEnd(30)}: ${count || 0} businesses\n`;
    }

    fs.writeFileSync('category_business_counts.txt', report);
    console.log('Report saved to category_business_counts.txt');
}

checkCategoryUsage();
