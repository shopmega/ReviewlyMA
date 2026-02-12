
import type { Business, SeasonalCollection, DayHours } from '@/lib/types';
import { getStoragePublicUrl, parsePostgresArray } from './utils';

// Day name mapping for database to display
export const DAY_NAMES: Record<number, DayHours['day']> = {
    0: 'Dimanche',
    1: 'Lundi',
    2: 'Mardi',
    3: 'Mercredi',
    4: 'Jeudi',
    5: 'Vendredi',
    6: 'Samedi',
    7: 'Dimanche' // Handle 7 as Sunday too just in case
};

export const mapBusinessFromDB = (dbItem: any): Business => {
    const logoUrl = getStoragePublicUrl(dbItem.logo_url, 'business-images');
    const coverUrl = getStoragePublicUrl(dbItem.cover_url, 'business-images');
    const publishedReviews = (dbItem.reviews || []).filter((r: any) => !r.status || r.status === 'published');

    const galleryUrls = parsePostgresArray(dbItem.gallery_urls);

    return {
        id: dbItem.id,
        name: dbItem.name,
        logo: {
            id: 'db-logo',
            imageUrl: logoUrl || '/placeholders/logo-placeholder.svg',
            imageHint: dbItem.logo_hint || 'logo',
            description: 'Company Logo'
        },
        photos: galleryUrls.map((url: string, index: number) => {
            const processedUrl = getStoragePublicUrl(url, 'business-images') || url;
            return {
                id: `gallery-${index}`,
                imageUrl: processedUrl,
                imageHint: `gallery image ${index + 1}`,
                description: `Gallery Image ${index + 1}`
            };
        }),
        phone: dbItem.phone,
        website: dbItem.website,
        category: dbItem.category,
        subcategory: dbItem.subcategory,
        city: dbItem.city,
        quartier: dbItem.quartier,
        location: dbItem.location || dbItem.address,
        address: dbItem.address,
        description: dbItem.description,
        overallRating: Number(dbItem.overall_rating) || (publishedReviews.length > 0
            ? publishedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / publishedReviews.length
            : 0),
        type: 'company' as const,

        companySize: dbItem.employee_count,
        isFeatured: dbItem.is_featured,
        is_premium: dbItem.is_premium,
        tier: dbItem.tier || 'none',
        cover_url: coverUrl || undefined,
        owner_id: dbItem.owner_id || dbItem.user_id || undefined,
        is_claimed: !!(dbItem.owner_id || dbItem.user_id),
        tags: dbItem.tags || [],
        amenities: dbItem.amenities || dbItem.benefits || [],
        benefits: dbItem.benefits || dbItem.amenities || [],
        hours: dbItem.business_hours?.map((h: any) => ({
            day: DAY_NAMES[h.day_of_week] || 'Lundi',
            open: h.open_time ? h.open_time.slice(0, 5) : '09:00',
            close: h.close_time ? h.close_time.slice(0, 5) : '18:00',
            isOpen: !h.is_closed,
        })).sort((a: any, b: any) => {
            // Sort by day order: Lundi=1, ..., Dimanche=7 
            const dayOrder = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
            return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        }) || [],
        reviews: publishedReviews.map((r: any) => ({
            id: r.id,
            rating: r.rating,
            title: r.title,
            text: r.content,
            author: r.author_name,
            userId: r.user_id, // Map userId
            isAnonymous: r.is_anonymous || false,
            date: r.date,
            likes: r.likes,
            dislikes: r.dislikes,
            subRatings: r.sub_ratings,
            ownerReply: r.owner_reply ? { text: r.owner_reply, date: r.owner_reply_date } : undefined
        })) || [],
        updates: dbItem.updates?.map((u: any) => ({
            id: u.id,
            title: u.title,
            text: u.content,
            date: u.date
        })) || [],
        whatsapp_number: dbItem.whatsapp_number,
        affiliate_link: dbItem.affiliate_link,
        affiliate_cta: dbItem.affiliate_cta,
        admin_affiliate_link: dbItem.admin_affiliate_link,
        admin_affiliate_cta: dbItem.admin_affiliate_cta,
        created_at: dbItem.created_at

    };
};

export const mapCollectionFromDB = (dbItem: any): SeasonalCollection => {
    return {
        title: dbItem.title,
        subtitle: dbItem.subtitle,
        imageUrl: getStoragePublicUrl(dbItem.image_url, 'carousel-images') || dbItem.image_url,
        imageHint: dbItem.image_hint || '',
        link: dbItem.link_config // Assumed to match CollectionLink structure
    };
};
