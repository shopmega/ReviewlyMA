import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { businesses } from '../lib/mock-data';
import type { Business } from '../lib/types';
import { MAIN_CATEGORIES, SUBCATEGORIES } from '../lib/location-discovery';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapBusinessForInsert(business: Business) {
  return {
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
    is_featured: business.isFeatured || false,
    overall_rating: 0,
    average_rating: 0,
    review_count: 0,
    logo_url: business.logo?.imageUrl || null,
    logo_hint: business.logo?.imageHint || null,
    cover_url: business.photos?.[0]?.imageUrl || null,
    cover_hint: business.photos?.[0]?.imageHint || null,
    gallery_urls: business.photos && business.photos.length > 1 ? business.photos.slice(1).map((p: any) => p.imageUrl) : [],
    tags: business.tags || [],
    benefits: business.benefits || [],
  };
}

function mapCategoryIcon(name: string): string {
  const emojiByName: Record<string, string> = {
    'Banque & Finance': '🏦',
    "Centres d'Appel & BPO": '🎧',
    'Centres d’Appel & BPO': '🎧',
    'Distribution & Commerce': '🛍️',
    'Industrie & Chimie': '🏭',
    'Technologie & IT': '💻',
    'Transport & Logistique': '🚚',
    'Services Professionnels': '💼',
    'Santé & Bien-être': '🏥',
    'Hôtels & Hébergement': '🏨',
    'Immobilier & Construction': '🏗️',
    'Énergie & Environnement': '⚡',
    'Éducation & Formation': '🎓',
    'Télécommunications': '📡',
  };
  return emojiByName[name] || '🏢';
}

async function seedCatalog() {
  console.log('Starting catalog seed...');
  console.log(`Source businesses: ${businesses.length}`);

  const categoryNames = Array.from(new Set([
    ...businesses.map((b) => b.category?.trim()).filter((name): name is string => Boolean(name)),
    ...MAIN_CATEGORIES.map((c) => c.name),
  ]));

  const categoriesPayload = Array.from(
    categoryNames.reduce((acc, name, index) => {
      const slug = slugify(name);
      if (!acc.has(slug)) {
        acc.set(slug, {
          name,
          slug,
          icon: mapCategoryIcon(name),
          position: index,
          is_active: true,
        });
      }
      return acc;
    }, new Map<string, { name: string; slug: string; icon: string; position: number; is_active: boolean }>())
      .values()
  );

  const { data: upsertedCategories, error: categoriesError } = await supabase
    .from('categories')
    .upsert(categoriesPayload, { onConflict: 'slug' })
    .select('id,name,slug');

  if (categoriesError) {
    throw new Error(`Failed categories upsert: ${categoriesError.message}`);
  }

  const categoryByName = new Map((upsertedCategories || []).map((c) => [c.name, c.id]));
  const subcategoryKeySet = new Set<string>();
  const subcategoriesPayload: Array<{ category_id: string; name: string; slug: string; position: number; is_active: boolean }> = [];

  const pushSubcategory = (categoryName: string, subcategoryName: string, position = 0) => {
    const categoryId = categoryByName.get(categoryName);
    if (!categoryId || !subcategoryName) return;

    const name = subcategoryName.trim();
    const key = `${categoryId}::${name}`;
    if (subcategoryKeySet.has(key)) return;
    subcategoryKeySet.add(key);

    subcategoriesPayload.push({
      category_id: categoryId,
      name,
      slug: slugify(name),
      position: 0,
      is_active: true,
    });
  };

  businesses.forEach((b) => {
    if (!b.subcategory) return;
    pushSubcategory(b.category, b.subcategory, 0);
  });

  Object.entries(SUBCATEGORIES).forEach(([categoryName, names]) => {
    names.forEach((subName, index) => pushSubcategory(categoryName, subName, index));
  });

  if (subcategoriesPayload.length > 0) {
    const { error: subcategoriesError } = await supabase
      .from('subcategories')
      .upsert(subcategoriesPayload, { onConflict: 'category_id,slug' });

    if (subcategoriesError) {
      throw new Error(`Failed subcategories upsert: ${subcategoriesError.message}`);
    }
  }

  const { data: existingBusinesses, error: existingBusinessesError } = await supabase
    .from('businesses')
    .select('id');

  if (existingBusinessesError) {
    throw new Error(`Failed fetching existing businesses: ${existingBusinessesError.message}`);
  }

  const existingIds = new Set((existingBusinesses || []).map((b) => b.id));
  const existingMockIds = new Set(
    businesses
      .map((b) => b.id)
      .filter((id) => existingIds.has(id))
  );
  const companiesToInsert = businesses
    .filter((b) => !existingIds.has(b.id))
    .map(mapBusinessForInsert);

  if (companiesToInsert.length > 0) {
    const { error: insertBusinessesError } = await supabase
      .from('businesses')
      .insert(companiesToInsert);

    if (insertBusinessesError) {
      throw new Error(`Failed inserting businesses: ${insertBusinessesError.message}`);
    }
  }

  const seedBusinessIds = businesses.map((b) => b.id);

  const { error: reviewDeleteError } = await supabase
    .from('reviews')
    .delete()
    .in('business_id', seedBusinessIds)
    .is('user_id', null);
  if (reviewDeleteError) {
    throw new Error(`Failed deleting old seeded reviews: ${reviewDeleteError.message}`);
  }

  const reviewsPayload = businesses.flatMap((b) =>
    (b.reviews || []).map((review) => ({
      business_id: b.id,
      user_id: null,
      author_name: review.author || 'Anonyme',
      is_anonymous: review.isAnonymous || false,
      rating: review.rating,
      title: review.title || null,
      content: review.text || null,
      date: review.date ? new Date(review.date).toISOString().split('T')[0] : null,
      likes: review.likes || 0,
      dislikes: review.dislikes || 0,
      sub_ratings: review.subRatings || null,
      status: 'published',
      owner_reply: review.ownerReply?.text || null,
      owner_reply_date: review.ownerReply?.date ? new Date(review.ownerReply.date).toISOString().split('T')[0] : null,
    }))
  );

  if (reviewsPayload.length > 0) {
    const { error: reviewsInsertError } = await supabase
      .from('reviews')
      .insert(reviewsPayload);

    if (reviewsInsertError) {
      throw new Error(`Failed inserting seeded reviews: ${reviewsInsertError.message}`);
    }
  }

  const { data: reviewStatsRows, error: reviewStatsError } = await supabase
    .from('reviews')
    .select('business_id,rating')
    .in('business_id', seedBusinessIds)
    .eq('status', 'published');
  if (reviewStatsError) {
    throw new Error(`Failed reading seeded review stats: ${reviewStatsError.message}`);
  }

  const reviewStats = new Map<string, { sum: number; count: number }>();
  (reviewStatsRows || []).forEach((row: { business_id: string; rating: number }) => {
    const current = reviewStats.get(row.business_id) || { sum: 0, count: 0 };
    current.sum += row.rating || 0;
    current.count += 1;
    reviewStats.set(row.business_id, current);
  });

  const businessUpdates = seedBusinessIds.map((id) => {
    const s = reviewStats.get(id);
    const count = s?.count || 0;
    const avg = count > 0 ? Number((s!.sum / count).toFixed(2)) : 0;
    return {
      id,
      review_count: count,
      overall_rating: avg,
      average_rating: avg,
    };
  });

  for (const row of businessUpdates) {
    const { error: businessStatsUpdateError } = await supabase
      .from('businesses')
      .update({
        review_count: row.review_count,
        overall_rating: row.overall_rating,
        average_rating: row.average_rating,
      })
      .eq('id', row.id);

    if (businessStatsUpdateError) {
      throw new Error(`Failed updating business rating stats: ${businessStatsUpdateError.message}`);
    }
  }

  const villes = Array.from(
    new Set(
      businesses
        .map((b) => b.city?.trim())
        .filter((city): city is string => Boolean(city))
    )
  ).sort((a, b) => a.localeCompare(b));

  console.log('Seed complete.');
  console.log(`Categories upserted: ${categoriesPayload.length}`);
  console.log(`Subcategories upserted: ${subcategoriesPayload.length}`);
  console.log(`Companies inserted: ${companiesToInsert.length}`);
  console.log(`Companies already present (kept): ${existingMockIds.size}`);
  console.log(`Reviews inserted: ${reviewsPayload.length}`);
  console.log(`Businesses rating stats updated: ${businessUpdates.length}`);
  console.log(`Villes in seed dataset (${villes.length}): ${villes.join(', ')}`);
}

seedCatalog().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
