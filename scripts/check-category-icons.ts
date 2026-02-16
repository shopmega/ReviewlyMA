
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function checkCategoryIcons() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: categories, error } = await supabase
        .from('categories')
        .select('name, icon, slug')
        .order('name');

    if (error) {
        console.error('Error fetching categories:', error);
        return;
    }

    let report = '--- Database Categories Audit ---\n';
    categories?.forEach(cat => {
        const iconDisplay = cat.icon ? `[${cat.icon}]` : '>>> MISSING <<<';
        report += `${cat.name.padEnd(30)} | Icon: ${iconDisplay}\n`;
    });

    const missing = categories?.filter(cat => !cat.icon || cat.icon.trim() === '');
    if (missing && missing.length > 0) {
        report += '\n--- Categories with MISSING Icons ---\n';
        missing.forEach(cat => report += `- ${cat.name}\n`);
    } else {
        report += '\nNo categories are missing icons.\n';
    }

    fs.writeFileSync('category_icons_report.txt', report);
    console.log('Report saved to category_icons_report.txt');
}

checkCategoryIcons();
