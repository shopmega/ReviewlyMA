import { createAuthClient } from './supabase/admin';

/**
 * Interface for admin dashboard statistics
 */
export interface AdminStats {
    businessCount: number;
    reviewCount: number;
    userCount: number;
    premiumCount: number;
    unreadSupportCount: number;
}

/**
 * Fetches global statistics for the admin dashboard.
 * Requires an authenticated admin session (implied by usage in admin pages).
 */
export async function getAdminStats(): Promise<AdminStats> {
    const supabase = await createAuthClient();

    const [businessesResult, reviewsResult, profilesResult, premiumResult, supportResult] = await Promise.all([
        supabase.from('businesses').select('id', { count: 'exact', head: true }),
        supabase.from('reviews').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_premium', true),
        supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('is_read_by_admin', false),
    ]);

    if (businessesResult.error) console.error('Error fetching business count:', businessesResult.error);
    if (reviewsResult.error) console.error('Error fetching review count:', reviewsResult.error);
    if (profilesResult.error) console.error('Error fetching user count:', profilesResult.error);
    if (premiumResult.error) console.error('Error fetching premium count:', premiumResult.error);
    if (supportResult.error) console.error('Error fetching support count:', supportResult.error);

    return {
        businessCount: businessesResult.count || 0,
        reviewCount: reviewsResult.count || 0,
        userCount: profilesResult.count || 0,
        premiumCount: premiumResult.count || 0,
        unreadSupportCount: supportResult.count || 0,
    };
}
