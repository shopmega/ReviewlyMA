
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function mergeDuplicateCategories() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const mergeMap = [
        {
            name: 'Éducation & Formation',
            badId: '55eb89fe-8a61-46b9-b3d2-7e5ddfba935e',
            cleanId: '9ba7fb37-c621-4a96-8947-f053e9304d02'
        },
        {
            name: 'Énergie & Environnement',
            badId: '175b3972-8194-4d25-81f4-375a646c6128',
            cleanId: '4f6e2375-a7a4-4090-817d-a99d2189659c'
        },
        {
            name: 'Hôtels & Hébergement',
            badId: 'ca3130a8-d6cd-4a6c-b472-16dd62272fc0',
            cleanId: 'a179d2c5-49bd-40f2-aec1-17355635578b'
        },
        {
            name: 'Santé & Bien-être',
            badId: '5ded65c4-2e71-4b4c-bb76-9ffd6f6db8b1',
            cleanId: '904139ec-ce81-4426-944d-4abc6c853a20'
        },
        {
            name: 'Télécommunications',
            badId: 'a639acd9-c19e-470b-bf2d-625d8ab61285',
            cleanId: 'f9fd114a-566c-4a0f-8485-a3ea6f61e5fc'
        }
    ];

    console.log('--- Starting Category Merge & Icon Fix ---');

    for (const item of mergeMap) {
        console.log(`Processing: ${item.name}...`);

        // 1. Update subcategories to point to clean ID
        const { error: updateError } = await supabase
            .from('subcategories')
            .update({ category_id: item.cleanId })
            .eq('category_id', item.badId);

        if (updateError) {
            console.error(`Error updating subcategories for ${item.name}:`, updateError);
            continue;
        }
        console.log(`- Subcategories migrated to clean ID.`);

        // 2. Delete the bad category entry
        const { error: deleteError } = await supabase
            .from('categories')
            .delete()
            .eq('id', item.badId);

        if (deleteError) {
            console.error(`Error deleting bad category ${item.name}:`, deleteError);
            continue;
        }
        console.log(`- Bad category entry deleted.`);
    }

    // Also check if any category has a NULL icon and try to fix it based on location-discovery names
    // Actually, the report shows only these duplicates had missing icons.

    console.log('\n--- Finalizing... ---');
    // Ensure all categories have icons (using emojis from mapCategoryIcon logic if needed, 
    // but the clean ones already have emojis)

    console.log('Merge complete.');
}

mergeDuplicateCategories();
