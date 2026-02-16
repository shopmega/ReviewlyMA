
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function checkDeadCategoryUsage() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const badCategoryIds = [
        '55eb89fe-8a61-46b9-b3d2-7e5ddfba935e', // Éducation & Formation (broken slug)
        '175b3972-8194-4d25-81f4-375a646c6128', // Énergie & Environnement (broken slug)
        'ca3130a8-d6cd-4a6c-b472-16dd62272fc0', // Hôtels & Hébergement (broken slug)
        '5ded65c4-2e71-4b4c-bb76-9ffd6f6db8b1', // Santé & Bien-être (broken slug)
        'a639acd9-c19e-470b-bf2d-625d8ab61285'  // Télécommunications (broken slug)
    ];

    let report = '--- Subcategory Usage Report for Bad Categories ---\n';
    for (const id of badCategoryIds) {
        const { count, error } = await supabase
            .from('subcategories')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', id);

        report += `Category ID ${id}: ${count || 0} subcategories linked.\n`;
    }

    fs.writeFileSync('dead_cat_usage_report.txt', report);
    console.log('Report saved to dead_cat_usage_report.txt');
}

checkDeadCategoryUsage();
