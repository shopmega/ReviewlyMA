import { createClient } from '@/lib/supabase/server';
import DashboardClient, { DashboardStats, RecentReview } from './DashboardClient';
import { redirect } from 'next/navigation';

export default async function DashboardPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const urlBusinessId = searchParams.id as string | undefined;

  const supabase = await createClient();

  // 1. Get User
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 2. Get Profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profileData) {
    console.error("Profile fetch error:", JSON.stringify(profileError, null, 2));
    return <DashboardClient stats={null} profile={null} error="Impossible de charger le profil." />;
  }

  // 3. Get ALL associated businesses for the user
  // Source A: Profile direct link
  // Source B: Approved claims
  // Source C: user_businesses assignments

  const [claimsResult, assignmentsResult] = await Promise.all([
    supabase.from('business_claims').select('business_id').eq('user_id', user.id).eq('status', 'approved'),
    supabase.from('user_businesses').select('business_id').eq('user_id', user.id)
  ]);

  const allBusinessIds = new Set<string>();
  if (profileData.business_id) allBusinessIds.add(profileData.business_id);

  claimsResult.data?.forEach(c => allBusinessIds.add(c.business_id));
  assignmentsResult.data?.forEach(a => allBusinessIds.add(a.business_id));

  // Determine active business ID
  let activeBusinessId = urlBusinessId;

  if (!activeBusinessId || !allBusinessIds.has(activeBusinessId)) {
    // Default to profile business or first from set
    activeBusinessId = profileData.business_id || Array.from(allBusinessIds)[0];
  }

  // Fetch business names for the switcher (optional but better UX)
  const { data: userBusinessesList } = await supabase
    .from('businesses')
    .select('id, name')
    .in('id', Array.from(allBusinessIds));

  if (!activeBusinessId) {
    return <DashboardClient stats={null} profile={profileData} error="Aucune entreprise associée trouvée." />;
  }

  // 4. Fetch Dashboard Data (Parallel) for the active business
  try {
    const [
      businessResult,
      recentReviewsResult,
      totalReviewsResult,
      analyticsResult,
      followersResult,
      ticketsResult
    ] = await Promise.all([
      // 1. Business Details
      supabase.from('businesses')
        .select('id, name, overall_rating')
        .eq('id', activeBusinessId)
        .maybeSingle(),

      // 2. Recent Reviews
      supabase.from('reviews')
        .select('id, title, content, rating, author_name, is_anonymous, user_id, date')
        .eq('business_id', activeBusinessId)
        .order('date', { ascending: false })
        .limit(5),

      // 3. Total Reviews Count
      supabase.from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', activeBusinessId),

      // 4. Analytics
      supabase.from('business_analytics')
        .select('event_type')
        .eq('business_id', activeBusinessId),

      // 5. Followers count
      supabase.from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', activeBusinessId),

      // 6. Unread Support Tickets
      supabase.from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read_by_user', false)
    ]);

    // Check for critical business data failure
    if (businessResult.error) {
      console.error(`[Dashboard] Business fetch error for ID ${activeBusinessId}:`, JSON.stringify(businessResult.error, null, 2));
      return <DashboardClient stats={null} profile={profileData} error="Erreur lors de la récupération des données d'entreprise." />;
    }

    if (!businessResult.data) {
      console.warn(`[Dashboard] Business ID ${activeBusinessId} found in profile but not in businesses table.`);
      return <DashboardClient stats={null} profile={profileData} error="Données d'entreprise introuvables (ID invalide ou supprimé)." />;
    }

    const business = businessResult.data;
    const recentReviews = (recentReviewsResult.data as unknown as RecentReview[]) || [];

    // Process Analytics
    const views = analyticsResult.data?.filter(a => a.event_type === 'page_view').length || 0;
    const leads = analyticsResult.data?.filter(a => ['phone_click', 'website_click', 'contact_form'].includes(a.event_type)).length || 0;

    const stats: DashboardStats = {
      business: {
        id: business.id,
        name: business.name,
        overall_rating: business.overall_rating,
        slug: business.id // Falling back to ID as slug
      },
      totalReviews: totalReviewsResult.count || 0,
      averageRating: business.overall_rating || 0,
      recentReviews: recentReviews.slice(0, 3), // Show top 3
      views,
      leads,
      followers: followersResult.count || 0,
      unreadTickets: ticketsResult.count || 0,
    };

    return <DashboardClient
      stats={stats}
      profile={profileData}
      otherBusinesses={userBusinessesList || []}
    />;

  } catch (error) {
    console.error("[Dashboard] Unexpected fatal error:", error);
    return <DashboardClient stats={null} profile={profileData} error="Erreur technique lors du chargement." />;
  }
}
