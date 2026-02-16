
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function checkTelecomSubcategories() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let report = '';
    const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('name', 'Télécommunications')
        .single();

    if (cat) {
        const { data: subs } = await supabase
            .from('subcategories')
            .select('name')
            .eq('category_id', cat.id);

        report += '--- Subcategories of Télécommunications ---\n';
        subs?.forEach(s => report += `- ${s.name}\n`);

        const { data: businesses } = await supabase
            .from('businesses')
            .select('name, subcategory')
            .eq('category', 'Télécommunications');

        report += '\n--- Businesses in Télécommunications ---\n';
        businesses?.forEach(b => report += `- ${b.name} (${b.subcategory})\n`);
    }

    fs.writeFileSync('telecom_report.txt', report);
    console.log('Report saved to telecom_report.txt');
}

checkTelecomSubcategories();
