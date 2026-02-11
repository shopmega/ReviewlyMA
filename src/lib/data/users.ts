
import { getPublicClient } from './client';

export async function getUserProfile(userId: string) {
    const supabase = getPublicClient();
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
    return data;
}

export async function getUserReviews(userId: string) {
    const supabase = getPublicClient();
    const { data, error } = await supabase
        .from('reviews')
        .select(`
      *,
      business:businesses (
        id,
        name,
        slug,
        logo_url,
        category,
        city
      )
    `)
        .eq('user_id', userId)
        .eq('is_anonymous', false) // Exclude anonymous reviews from public profile
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user reviews:', JSON.stringify(error, null, 2));
        return [];
    }
    return data;
}

export async function getUserClaims(userId: string) {
    const supabase = getPublicClient();
    const { data, error } = await supabase
        .from('business_claims')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching user claims:', error);
        return [];
    }
    return data;
}
