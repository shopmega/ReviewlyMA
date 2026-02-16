
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function auditDatabase() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('--- Database Audit Started ---');

    // 1. Check Missing Categories
    console.log('\nChecking for missing categories...');
    const { data: missingCats, error: missingCatsError } = await supabase
        .from('businesses')
        .select('id, name')
        .or('category.is.null,category.eq.""')
        .limit(10);

    if (missingCatsError) console.error('Error checking missing cats:', missingCatsError);
    else console.log(`Found ${missingCats?.length || 0} businesses with missing categories. ${missingCats?.length === 10 ? '(Showing first 10)' : ''}`);

    // 2. Check Invalid Categories (not in categories table)
    console.log('\nChecking for invalid categories...');
    const { data: categoriesTable } = await supabase.from('categories').select('name');
    const validCats = new Set(categoriesTable?.map(c => c.name) || []);

    const { data: allCatCounts } = await supabase.from('businesses').select('category');
    const usedCats = new Map();
    allCatCounts?.forEach(b => {
        if (b.category) {
            usedCats.set(b.category, (usedCats.get(b.category) || 0) + 1);
        }
    });

    const invalidCats = Array.from(usedCats.keys()).filter(cat => !validCats.has(cat));
    console.log(`Found ${invalidCats.length} categories used in businesses but not in categories table:`, invalidCats);

    // 3. Mapping Analysis (Category -> Subcategory)
    console.log('\nMapping Analysis (Category -> Subcategory)...');
    const mappings: Record<string, string[]> = {};
    const { data: allMappings } = await supabase
        .from('businesses')
        .select('category, subcategory')
        .not('category', 'is', null);

    allMappings?.forEach(m => {
        if (!mappings[m.category]) mappings[m.category] = [];
        if (m.subcategory && !mappings[m.category].includes(m.subcategory)) {
            mappings[m.category].push(m.subcategory);
        }
    });

    // Save mappings to file for review
    fs.writeFileSync('subcategory_mappings.json', JSON.stringify(mappings, null, 2));
    console.log('Saved subcategory mappings to subcategory_mappings.json');

    // 4. Duplicate Check (Name + City)
    console.log('\nChecking for potential duplicates (Name + City)...');
    // Using an RPC or direct selection might be slow if there are many businesses
    // For now, let's try a simple manual check on the first 1000 or so, 
    // or better, use a query that groups them.

    const { data: duplicates, error: dupError } = await supabase.rpc('check_duplicate_businesses');

    if (dupError) {
        // Fallback: simple query to find names that appear more than once
        console.log('RPC check_duplicate_businesses not found. Running manual check...');
        const { data: possibleDups } = await supabase
            .from('businesses')
            .select('name, city')
            .limit(2000);

        const counts = new Map();
        const dupList: string[] = [];
        possibleDups?.forEach(b => {
            const key = `${b.name}|${b.city}`.toLowerCase();
            counts.set(key, (counts.get(key) || 0) + 1);
            if (counts.get(key) === 2) dupList.push(key);
        });
        console.log(`Potential duplicates found in first 2000 records: ${dupList.length}`);
        if (dupList.length > 0) console.log('Examples:', dupList.slice(0, 5));
    } else {
        console.log(`Duplicates identified via RPC: ${duplicates?.length || 0}`);
    }

    console.log('\n--- Audit Complete ---');
}

auditDatabase();
