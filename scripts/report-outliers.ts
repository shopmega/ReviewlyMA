
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function reportOutliers() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const validCategories = [
        "Banque & Finance",
        "Centres d’Appel & BPO",
        "Distribution & Commerce",
        "Éducation & Formation",
        "Énergie & Environnement",
        "Hôtels & Hébergement",
        "Immobilier & Construction",
        "Industrie & Chimie",
        "Santé & Bien-être",
        "Services Professionnels",
        "Technologie & IT",
        "Télécommunications",
        "Transport & Logistique"
    ];

    let report = '--- Outlier Report ---\n';

    // 1. Find businesses with categories not in the list
    const { data: outliers, error } = await supabase
        .from('businesses')
        .select('id, name, category, subcategory')
        .not('category', 'in', `(${validCategories.map(c => `"${c}"`).join(',')})`);

    if (error) {
        console.error('Error fetching outliers:', error);
        return;
    }

    report += `Found ${outliers?.length || 0} businesses with invalid categories.\n`;

    const countByCat = new Map();
    outliers?.forEach(b => {
        countByCat.set(b.category, (countByCat.get(b.category) || 0) + 1);
    });

    report += 'Breakdown by category:\n';
    countByCat.forEach((count, cat) => { report += `- "${cat}": ${count} businesses\n`; });

    // 2. Report on duplicate mappings (mining vs mines, etc.)
    report += '\n--- Subcategory Inconsistency Report ---\n';
    const { data: allWithSubs } = await supabase
        .from('businesses')
        .select('category, subcategory')
        .not('subcategory', 'is', null);

    const subFreq = new Map();
    allWithSubs?.forEach(b => {
        const key = `${b.category} | ${b.subcategory}`;
        subFreq.set(key, (subFreq.get(key) || 0) + 1);
    });

    report += 'All Category|Subcategory mappings:\n';
    const sorted = Array.from(subFreq.entries()).sort((a, b) => {
        // Sort by category then count
        if (a[0].split('|')[0] < b[0].split('|')[0]) return -1;
        if (a[0].split('|')[0] > b[0].split('|')[0]) return 1;
        return b[1] - a[1];
    });
    sorted.forEach(([key, count]) => { report += `- ${key}: ${count}\n`; });

    report += '\n--- Duplicate Entries Report ---\n';
    const { data: allB } = await supabase.from('businesses').select('name, city');
    const seen = new Map();
    const dups: { name: string | null, city: string | null }[] = [];
    allB?.forEach(b => {
        const key = `${b.name?.trim().toLowerCase()}|${b.city?.trim().toLowerCase()}`;
        if (seen.has(key)) {
            dups.push({ name: b.name, city: b.city });
        }
        seen.set(key, true);
    });
    report += `Total potential duplicates (Name+City): ${dups.length}\n`;
    dups.forEach(d => report += `- ${d.name} (${d.city})\n`);

    fs.writeFileSync('audit_report.txt', report);
    console.log('Saved report to audit_report.txt');
}

reportOutliers();
