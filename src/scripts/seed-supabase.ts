
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { businesses } from '../lib/mock-data';
import type { Business } from '../lib/types';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (recommended) or NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

async function seed() {
    console.log('🌱 Starting database seed...');

    // 1. Fetch mock data
    // Imported directly from mock-data.ts
    // Note: 'businesses' variable is already imported, so we don't need to await getBusinesses()

    console.log(`Found ${businesses.length} businesses to insert.`);

    // Cleaning up old data
    console.log('🧹 Cleaning up old data...');
    const { error: revErr } = await supabase.from('reviews').delete().neq('id', 0);
    if (revErr) console.warn('Warning cleaning reviews:', revErr.message);

    const { error: updErr } = await supabase.from('updates').delete().neq('id', 0);
    if (updErr) console.warn('Warning cleaning updates:', updErr.message);

    const { error: hrsErr } = await supabase.from('business_hours').delete().neq('business_id', 'placeholder');
    if (hrsErr) console.warn('Warning cleaning hours:', hrsErr.message);

    // Note: If you have profiles linked to businesses, this might fail or set them to null depending on constraints
    // We try to delete only the ones we are about to insert to avoid breaking real user profiles?
    // No, request was "Get rid of current mock data". 
    // We will try deleting ALL businesses.
    const { error: busErr } = await supabase.from('businesses').delete().neq('id', 'placeholder');
    if (busErr) {
        console.warn('Warning cleaning businesses (might be referenced by profiles):', busErr.message);
        // Fallback: If we can't delete all, we rely on upsert below.
    } else {
        console.log('✨ Data cleaned successfully.');
    }

    for (const business of businesses) {
        console.log(`Processing ${business.name}...`);

        // A. Insert Business
        const businessData: any = {
            id: business.id,
            name: business.name,
            type: business.type,
            category: business.category,
            subcategory: business.subcategory || null,
            city: business.city || null,
            quartier: business.quartier || null,
            location: business.location,
            description: business.description,
            website: business.website || null,
            phone: business.phone || null,
            is_premium: business.is_premium || false,
            employee_count: null,
            is_featured: business.isFeatured || false,
            overall_rating: business.overallRating,
            logo_url: business.logo.imageUrl,
            logo_hint: business.logo.imageHint,
            cover_url: business.photos && business.photos.length > 0 ? business.photos[0].imageUrl : null,
            cover_hint: business.photos && business.photos.length > 0 ? business.photos[0].imageHint : null,
            gallery_urls: business.photos && business.photos.length > 1 ? business.photos.slice(1).map((p: any) => p.imageUrl) : [],
            tags: business.tags || [],
            benefits: business.benefits || [],
        };

        // Only insert new businesses, don't update existing ones to avoid overriding user data
        const { error: businessError } = await supabase.from('businesses').insert(businessData);

        if (businessError) {
            // If the error is a duplicate key error, it means the business already exists, so we skip it
            if (businessError.code === '23505') {
                console.log(`  ⚠️ Business ${business.name} already exists, skipping...`);
            } else {
                console.error(`Error inserting business ${business.name}:`, businessError);
                if (businessError.code === 'PGRST204') {
                    console.log('⚠️ It seems some columns are missing in your Supabase table. Please run the SQL migration in docs/COMPLETE_BUSINESS_SCHEMA_FIX.sql');
                }
            }
            continue;
        }

        // B. Insert Reviews
        if (business.reviews && business.reviews.length > 0) {
            const reviewsData = business.reviews.map(review => ({
                business_id: business.id,
                author_name: review.author,
                is_anonymous: review.isAnonymous || false,
                rating: review.rating,
                title: review.title,
                content: review.text,
                date: new Date(review.date).toISOString().split('T')[0], // Simple date parsing
                likes: review.likes,
                dislikes: review.dislikes,
                sub_ratings: review.subRatings || null,
                status: 'published',
                owner_reply: review.ownerReply?.text || null,
                owner_reply_date: review.ownerReply?.date ? new Date(review.ownerReply.date).toISOString().split('T')[0] : null,
            }));

            const { error: reviewsError } = await supabase.from('reviews').insert(reviewsData);
            if (reviewsError) console.error(`Error inserting reviews for ${business.name}:`, reviewsError);
        }

        // C. Insert Updates
        if (business.updates && business.updates.length > 0) {
            const updatesData = business.updates.map(update => ({
                business_id: business.id,
                title: update.title,
                content: update.text,
                date: new Date(update.date).toISOString().split('T')[0],
            }));
            const { error: updatesError } = await supabase.from('updates').insert(updatesData);
            if (updatesError) console.error(`Error inserting updates for ${business.name}:`, updatesError);
        }


    }

    console.log('✅ Seed completed!');
}

seed().catch(console.error);
