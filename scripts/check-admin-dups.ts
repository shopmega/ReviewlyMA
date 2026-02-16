
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkAdminDuplicates() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('--- Checking Categories Table for Duplicates ---');
    const { data: categories } = await supabase.from('categories').select('name, slug');

    const nameMap = new Map();
    const slugMap = new Map();

    categories?.forEach(c => {
        nameMap.set(c.name, (nameMap.get(c.name) || 0) + 1);
        slugMap.set(c.slug, (slugMap.get(c.slug) || 0) + 1);
    });

    console.log('Duplicate Names in Categories Table:');
    nameMap.forEach((count, name) => {
        if (count > 1) console.log(`- "${name}": ${count} times`);
    });

    console.log('Duplicate Slugs in Categories Table:');
    slugMap.forEach((count, slug) => {
        if (count > 1) console.log(`- "${slug}": ${count} times`);
    });

    console.log('\n--- Checking for Subcategory Duplicates across Categories ---');
    // Find subcategories that appear in multiple categories or have minor variations
    const { data: bData } = await supabase.from('businesses').select('category, subcategory').not('subcategory', 'is', null);

    const subToCat = new Map();
    const variations = new Map(); // normalized -> actuals

    bData?.forEach(b => {
        const norm = b.subcategory.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['’]/g, "'");

        if (!variations.has(norm)) variations.set(norm, new Set());
        variations.get(norm).add(b.subcategory);

        const key = b.subcategory;
        if (!subToCat.has(key)) subToCat.set(key, new Set());
        subToCat.get(key).add(b.category);
    });

    console.log('\nSubcategories found with minor character/case variations:');
    variations.forEach((actuals, norm) => {
        if (actuals.size > 1) {
            console.log(`- Variations for "${norm}":`, Array.from(actuals));
        }
    });

    console.log('\nSubcategories appearing in multiple categories (ambiguous):');
    subToCat.forEach((cats, sub) => {
        if (cats.size > 1) {
            console.log(`- "${sub}" appears in:`, Array.from(cats));
        }
    });
}

checkAdminDuplicates();
