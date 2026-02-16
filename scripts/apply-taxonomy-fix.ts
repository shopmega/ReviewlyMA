
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config({ path: '.env.local' });

async function applyTaxonomyFix() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('--- Applying Taxonomy Normalization ---');

    // 1. Read and execute the SQL migration
    const sqlPath = path.join(process.cwd(), 'supabase/migrations/20260216000001_normalize_taxonomy.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Supabase JS doesn't support multiple statements in one .rpc call easily 
    // without a custom function, but we can use the 'postgres' extension or just run it via rpc if we have one.
    // However, for simple updates, we can just run them as multiple promises.

    console.log('Executing normalization updates...');

    // We'll run the logic in chunks to be safe since it's a batch of updates
    const updates = [
        // Categories
        () => supabase.from('businesses').update({ category: 'Centres d’Appel & BPO' }).eq('category', "Centres d'Appel & BPO"),
        () => supabase.from('businesses').update({ category: 'Distribution & Commerce' }).eq('category', "Distribution"),
        () => supabase.from('businesses').update({ category: 'Services Professionnels' }).eq('category', "Services"),

        // Key Translations
        () => supabase.from('businesses').update({ subcategory: 'Banque' }).in('subcategory', ['Banking', 'Banque']),
        () => supabase.from('businesses').update({ subcategory: 'Assurance' }).eq('subcategory', 'Insurance'),
        () => supabase.from('businesses').update({ subcategory: 'Santé' }).eq('subcategory', 'Healthcare'),
        () => supabase.from('businesses').update({ subcategory: 'Éducation' }).eq('subcategory', 'Education'),
        () => supabase.from('businesses').update({ subcategory: 'Énergie' }).eq('subcategory', 'Energy'),
        () => supabase.from('businesses').update({ subcategory: 'Automobile' }).eq('subcategory', 'Automotive'),
        () => supabase.from('businesses').update({ subcategory: 'Immobilier' }).eq('subcategory', 'Real Estate'),
        () => supabase.from('businesses').update({ subcategory: 'Hôtellerie' }).eq('subcategory', 'Hospitality'),
        () => supabase.from('businesses').update({ subcategory: 'Mines & Extraction' }).in('subcategory', ['Mining', 'Mines', 'Extraction Minière']),
        () => supabase.from('businesses').update({ subcategory: 'Informatique & Logiciels' }).eq('subcategory', 'IT & Software'),
        () => supabase.from('businesses').update({ subcategory: 'Centre d\'Appels & BPO' }).in('subcategory', ['BPO / Call Center', 'Centre d\'appels', 'Centre d’appels', 'BPO & relation client', 'BPO & services']),
        () => supabase.from('businesses').update({ subcategory: 'Industrie Manufacturière' }).eq('subcategory', 'Manufacturing'),
        () => supabase.from('businesses').update({ subcategory: 'Comptabilité & Audit' }).eq('subcategory', 'Accounting & Audit'),
        () => supabase.from('businesses').update({ subcategory: 'Import & Export' }).eq('subcategory', 'Import/Export'),
        () => supabase.from('businesses').update({ subcategory: 'Commerce de détail' }).eq('subcategory', 'Retail'),
        () => supabase.from('businesses').update({ subcategory: 'Alimentation & Boissons' }).eq('subcategory', 'Food & Beverage'),
        () => supabase.from('businesses').update({ subcategory: 'Construction & BTP' }).in('subcategory', ['Construction', 'Construction BTP']),
        () => supabase.from('businesses').update({ subcategory: 'Marketing & Publicité' }).eq('subcategory', 'Marketing & Advertising'),
        () => supabase.from('businesses').update({ subcategory: 'Services de Nettoyage' }).eq('subcategory', 'Cleaning Services'),
        () => supabase.from('businesses').update({ subcategory: 'Ingénierie' }).eq('subcategory', 'Engineering'),
        () => supabase.from('businesses').update({ subcategory: 'Transport & Logistique' }).eq('subcategory', 'Logistics & Transport')
    ];

    for (const update of updates) {
        const { error } = await update();
        if (error) console.error('Error in step:', error.message);
    }

    console.log('Normalization updates complete.');
    console.log('\n--- Syncing Admin Tables (Subcategories) ---');
    // Note: In a real app, we'd call the server action. 
    // Here we'll just advise running the "Sync" button in Admin Categories page 
    // OR we could implement a logic here to delete and rebuild subcategories.

    console.log('Action Required: Please go to /admin/categories and click "Synchroniser" to update the admin management tables.');
}

applyTaxonomyFix();
