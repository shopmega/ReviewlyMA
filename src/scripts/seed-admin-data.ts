
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

async function seedAdminData() {
    console.log('🌱 Seeding admin/moderation data...');

    // 1. Seed Seasonal Collections
    console.log('\n📚 Adding seasonal collections...');
    const collections = [
        {
            title: 'Idées pour le Ftour',
            subtitle: 'Les meilleurs endroits pour rompre le jeûne',
            image_url: '/placeholders/business-placeholder.svg',
            image_hint: 'Ramadan meal',
            link_config: { type: 'filter', tag: 'ramadan-ftour' },
            active: true
        },
        {
            title: 'Terrasses à Casablanca',
            subtitle: 'Profitez du beau temps en extérieur',
            image_url: '/placeholders/business-placeholder.svg',
            image_hint: 'rooftop cafe terrace',
            link_config: { type: 'filter', tag: 'terrasse', city: 'Casablanca' },
            active: true
        },
        {
            title: 'Nouveautés à Rabat',
            subtitle: 'Les derniers commerces ouverts dans la capitale',
            image_url: '/placeholders/business-placeholder.svg',
            image_hint: 'new store opening',
            link_config: { type: 'filter', tag: 'nouveau', city: 'Rabat' },
            active: true
        }
    ];

    for (const collection of collections) {
        const { error } = await supabase.from('seasonal_collections').insert(collection);
        if (error) {
            if (error.code === '23505') {
                console.log(`  ⏭️  Collection "${collection.title}" already exists, skipping.`);
            } else {
                console.error(`  ❌ Error inserting collection "${collection.title}":`, error.message);
            }
        } else {
            console.log(`  ✅ Added collection: ${collection.title}`);
        }
    }

    // 2. Seed a sample business claim (for testing)
    console.log('\n📝 Adding sample business claim...');

    // Get a sample business
    const { data: businesses } = await supabase.from('businesses').select('id').limit(1);
    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);

    if (businesses && businesses.length > 0 && profiles && profiles.length > 0) {
        const sampleClaim = {
            business_id: businesses[0].id,
            user_id: profiles[0].id,
            full_name: 'Mohammed Alami',
            job_title: 'Directeur Général',
            email: 'contact@example.ma',
            phone: '+212 661 123 456',
            message: 'Je suis le propriétaire de cet établissement et je souhaite gérer sa page.',
            status: 'pending'
        };

        const { error: claimError } = await supabase.from('business_claims').insert(sampleClaim);
        if (claimError) {
            console.log(`  ⚠️  Could not insert claim: ${claimError.message}`);
        } else {
            console.log('  ✅ Added sample business claim');
        }
    } else {
        console.log('  ⏭️  No businesses or profiles found, skipping claims seed.');
    }

    // 3. Seed a sample review report (for testing)
    console.log('\n🚩 Adding sample review reports...');

    const { data: reviews } = await supabase.from('reviews').select('id, business_id').limit(2);

    if (reviews && reviews.length > 0) {
        const sampleReports = [
            {
                review_id: reviews[0].id,
                business_id: reviews[0].business_id,
                reason: 'fake',
                details: 'Cet avis semble être un faux avis laissé par un concurrent.',
                status: 'pending'
            }
        ];

        if (reviews.length > 1) {
            sampleReports.push({
                review_id: reviews[1].id,
                business_id: reviews[1].business_id,
                reason: 'spam',
                details: 'Contenu promotionnel non sollicité.',
                status: 'pending'
            });
        }

        for (const report of sampleReports) {
            const { error } = await supabase.from('review_reports').insert(report);
            if (error) {
                console.log(`  ⚠️  Could not insert report: ${error.message}`);
            } else {
                console.log(`  ✅ Added review report (${report.reason})`);
            }
        }
    } else {
        console.log('  ⏭️  No reviews found, skipping review reports seed.');
    }

    // 4. Initialize site settings if not exists
    console.log('\n⚙️  Initializing site settings...');
    const { error: settingsError } = await supabase.from('site_settings').upsert({
        id: 'main',
        site_name: 'Platform',
        site_description: 'Trouvez des avis sur les établissements, les services et les produits.',
        contact_email: 'contact@example.com',
        default_language: 'fr',
        maintenance_mode: false,
        allow_new_registrations: true,
        require_email_verification: true
    }, { onConflict: 'id' });

    if (settingsError) {
        console.log(`  ⚠️  Could not upsert settings: ${settingsError.message}`);
    } else {
        console.log('  ✅ Site settings initialized');
    }

    console.log('\n✅ Admin data seed completed!');
}

seedAdminData().catch(console.error);
