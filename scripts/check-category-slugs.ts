
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function checkCategorySlugs() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: categories, error } = await supabase
        .from('categories')
        .select('id, name, icon, slug')
        .order('name');

    if (error) {
        console.error('Error fetching categories:', error);
        return;
    }

    let report = '--- Database Categories Detailed Audit ---\n';
    categories?.forEach(cat => {
        const iconDisplay = cat.icon ? `[${cat.icon}]` : '>>> MISSING <<<';
        report += `${cat.name.padEnd(30)} | Slug: ${cat.slug.padEnd(25)} | Icon: ${iconDisplay} | ID: ${cat.id}\n`;
    });

    fs.writeFileSync('category_slugs_report.txt', report);
    console.log('Report saved to category_slugs_report.txt');
}

checkCategorySlugs();
