'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

// We use the server client for tracking to ensure we can insert even if RLS is strict for anon users
// (Though we set RLS for anon insert, using service role or server client is robust)
// Actually, for public tracking, simple client might be enough if RLS allows it.
// But let's use a server action.

type AnalyticsEvent = 'page_view' | 'phone_click' | 'website_click' | 'contact_form' | 'whatsapp_click' | 'affiliate_click';

export async function trackBusinessEvent(businessId: string, eventType: AnalyticsEvent) {
    if (!businessId) return;

    const cookieStore = await cookies();

    // Use a client that can bypass RLS if needed, or just standard anonymous client
    // Since we set "Public can insert analytics events", standard client is fine.
    // However, inside a server action, better to use createServerClient

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { }
                },
            },
        }
    );

    try {
        const { error } = await supabase.from('business_analytics').insert({
            business_id: businessId,
            event_type: eventType
        });

        if (error) {
            // Silently fail - analytics tracking should not break user experience
        }
    } catch (err) {
        // Silently fail - analytics tracking should not break user experience
    }
}

export async function getConsolidatedAnalytics(businessIds: string[]) {
    if (!businessIds || businessIds.length === 0) return null;

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { }
                },
            },
        }
    );

    try {
        // Fetch reviews count and rating for all businesses
        const { data: reviews, error: reviewsError } = await supabase
            .from('reviews')
            .select('rating, business_id')
            .in('business_id', businessIds);

        // Fetch analytics events for all businesses
        const { data: analytics, error: analyticsError } = await supabase
            .from('business_analytics')
            .select('event_type, business_id')
            .in('business_id', businessIds);

        if (reviewsError || analyticsError) {
            logger.error('Error fetching consolidated analytics', reviewsError || analyticsError);
            return null;
        }

        const totalReviews = reviews?.length || 0;
        const totalRating = reviews?.reduce((acc, r) => acc + r.rating, 0) || 0;
        const avgRating = totalReviews > 0 ? totalRating / totalReviews : 0;

        const totalViews = analytics?.filter(e => e.event_type === 'page_view').length || 0;
        const totalLeads = analytics?.filter(e => ['phone_click', 'website_click', 'contact_form'].includes(e.event_type)).length || 0;

        return {
            totalBusinesses: businessIds.length,
            totalReviews,
            avgRating,
            totalViews,
            totalLeads,
        };
    } catch (error) {
        console.error('Error in getConsolidatedAnalytics:', error);
        return null;
    }
}

export async function getAdminAnalytics() {
    try {
        await verifyAdminSession();
    } catch (error) {
        logger.warn('Admin analytics access denied', { error });
        return null;
    }

    const supabase = await createAdminClient();

    try {
        // Parallel fetching for overview stats
        const [
            { count: totalUsers },
            { count: totalBusinesses },
            { count: totalReviews },
            { data: reviewsData },
            { count: totalMessages }
        ] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('businesses').select('*', { count: 'exact', head: true }),
            supabase.from('reviews').select('*', { count: 'exact', head: true }),
            supabase.from('reviews').select('rating').limit(1000),
            supabase.from('messages').select('*', { count: 'exact', head: true })
        ]);

        const avgRating = reviewsData && reviewsData.length > 0
            ? (reviewsData.reduce((acc, r) => acc + r.rating, 0) / reviewsData.length).toFixed(1)
            : 0;

        // For charts, we need time-series data. 
        // optimize: fetch only created_at for last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const { data: userGrowthData } = await supabase
            .from('profiles')
            .select('created_at')
            .gte('created_at', sixMonthsAgo.toISOString());

        const { data: businessGrowthData } = await supabase
            .from('businesses')
            .select('created_at')
            .gte('created_at', sixMonthsAgo.toISOString());

        // Helper to aggregate by month
        const aggregateByMonth = (data: any[]) => {
            const months: Record<string, number> = {};
            // Initialize last 6 months
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const key = d.toLocaleString('fr-FR', { month: 'short' });
                months[key] = 0;
            }

            data?.forEach(item => {
                const date = new Date(item.created_at);
                const key = date.toLocaleString('fr-FR', { month: 'short' });
                if (months[key] !== undefined) {
                    months[key]++;
                }
            });
            // Convert to array in order
            return Object.keys(months).map(name => ({
                month: name, // Chart expects 'month' 
                users: months[name], // Chart expects 'users' for user chart
                businesses: months[name] // Chart expects 'businesses' for business chart
            }));
        };

        const userGrowth = userGrowthData ? aggregateByMonth(userGrowthData).map(d => ({ month: d.month, users: d.users })) : [];
        const businessGrowth = businessGrowthData ? aggregateByMonth(businessGrowthData).map(d => ({ month: d.month, businesses: d.businesses })) : [];

        // Category and City distribution (real data)
        const { data: catData } = await supabase.from('businesses').select('category');
        const { data: cityData } = await supabase.from('businesses').select('city');

        const categoryDist = catData?.reduce((acc: any, b: any) => {
            const cat = b.category || 'Autre';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {});

        const cityDist = cityData?.reduce((acc: any, b: any) => {
            const city = b.city || 'Autre';
            acc[city] = (acc[city] || 0) + 1;
            return acc;
        }, {});

        // Revenue (estimate based on premium payments)
        const { data: payments } = await supabase
            .from('premium_payments')
            .select('amount_usd')
            .eq('status', 'verified');

        const totalRevenue = payments?.reduce((acc, p) => acc + (p.amount_usd || 0), 0) || 0;

        // Search metrics (Top queries and cities)
        const { data: topQueries } = await supabase
            .from('search_analytics')
            .select('query, results_count')
            .order('created_at', { ascending: false })
            .limit(100);

        const { data: searchTimeline } = await supabase
            .from('search_analytics')
            .select('created_at')
            .gte('created_at', sixMonthsAgo.toISOString());

        // Process top queries
        const queryCounts = topQueries?.reduce((acc: any, s: any) => {
            acc[s.query] = (acc[s.query] || 0) + 1;
            return acc;
        }, {});

        const sortedQueries = Object.entries(queryCounts || {})
            .map(([name, value]) => ({ name, value }))
            .sort((a: any, b: any) => b.value - a.value)
            .slice(0, 5);

        const searchGrowth = searchTimeline ? aggregateByMonth(searchTimeline).map(d => ({ month: d.month, searches: d.users })) : [];

        const [
            { count: totalJobOffers },
            { count: approvedJobOffers },
            { count: mappedApprovedJobOffers },
            { data: jobOfferAnalyses },
            { data: businessSignals },
            { data: mappingQueueRows },
            { data: moderationEvents },
        ] = await Promise.all([
            supabase.from('job_offers').select('*', { count: 'exact', head: true }),
            supabase.from('job_offers').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
            supabase.from('job_offers').select('*', { count: 'exact', head: true }).eq('status', 'approved').not('business_id', 'is', null),
            supabase.from('job_offer_analyses').select('confidence_level'),
            supabase.from('job_offer_business_insights').select('*'),
            supabase.from('admin_job_offer_mapping_v1').select('job_offer_id, company_name, business_id, company_match_confidence'),
            supabase.from('job_offer_moderation_events').select('event_type, created_at').gte('created_at', sixMonthsAgo.toISOString()),
        ]);

        const lowConfidenceOfferCount = jobOfferAnalyses?.filter((row: any) => row.confidence_level === 'low').length || 0;
        const totalAnalyses = jobOfferAnalyses?.length || 0;
        const avgSalaryDisclosure = businessSignals && businessSignals.length > 0
            ? businessSignals.reduce((acc: number, row: any) => acc + Number(row.salary_disclosure_rate || 0), 0) / businessSignals.length
            : 0;
        const avgOfferTransparency = businessSignals && businessSignals.length > 0
            ? businessSignals.reduce((acc: number, row: any) => acc + Number(row.avg_transparency_score || 0), 0) / businessSignals.length
            : 0;
        const mappingQueue = (mappingQueueRows || []) as Array<{
            job_offer_id: string;
            company_name: string;
            business_id: string | null;
            company_match_confidence: 'high' | 'medium' | 'low' | 'none';
        }>;
        const moderationTimeline = (moderationEvents || []) as Array<{
            event_type: string;
            created_at: string;
        }>;

        const topSignalBusinesses = ((businessSignals || []) as Array<any>)
            .sort((a, b) => Number(b.approved_offer_count || 0) - Number(a.approved_offer_count || 0))
            .slice(0, 5);
        const topSignalBusinessIds = topSignalBusinesses.map((row) => row.business_id).filter(Boolean);
        const topBusinessRows = topSignalBusinessIds.length > 0
            ? (await supabase
                .from('businesses')
                .select('id, name')
                .in('id', topSignalBusinessIds)).data
            : [];
        const businessNameMap = new Map((topBusinessRows || []).map((row: any) => [row.id, row.name]));
        const unresolvedCompanyCounts = mappingQueue
            .filter((row) => !row.business_id)
            .reduce((acc: Record<string, number>, row) => {
                const key = row.company_name?.trim() || 'Unknown company';
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});
        const topUnresolvedCompanies = Object.entries(unresolvedCompanyCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((left, right) => right.count - left.count)
            .slice(0, 5);
        const manualRelinks = moderationTimeline.filter((event) => event.event_type === 'business_relinked').length;
        const automatedBackfills = moderationTimeline.filter((event) => event.event_type === 'business_match_backfilled').length;
        const unlinks = moderationTimeline.filter((event) => event.event_type === 'business_unlinked').length;

        return {
            overview: {
                totalUsers: totalUsers || 0,
                activeUsers: Math.floor((totalUsers || 0) * 0.4), // Estimate
                totalBusinesses: totalBusinesses || 0,
                totalReviews: totalReviews || 0,
                avgRating: Number(avgRating),
                totalRevenue,
                totalMessages: totalMessages || 0,
                totalSearches: searchTimeline?.length || 0
            },
            userMetrics: {
                userGrowth
            },
            businessMetrics: {
                businessGrowth,
                categoryDistribution: Object.entries(categoryDist || {}).map(([name, value]) => ({ name, value })),
                cityDistribution: Object.entries(cityDist || {}).map(([name, value]) => ({ name, value }))
            },
            searchMetrics: {
                searchGrowth,
                topQueries: sortedQueries
            },
            jobOfferMetrics: {
                totalJobOffers: totalJobOffers || 0,
                approvedJobOffers: approvedJobOffers || 0,
                mappedApprovedJobOffers: mappedApprovedJobOffers || 0,
                companiesWithSignals: businessSignals?.length || 0,
                avgSalaryDisclosure: Number(avgSalaryDisclosure.toFixed(2)),
                avgOfferTransparency: Number(avgOfferTransparency.toFixed(2)),
                lowConfidenceRate: totalAnalyses > 0 ? Number(((lowConfidenceOfferCount / totalAnalyses) * 100).toFixed(2)) : 0,
                mappingQueueSize: mappingQueue.length,
                unresolvedMappings: mappingQueue.filter((row) => !row.business_id).length,
                mediumConfidenceMappings: mappingQueue.filter((row) => row.company_match_confidence === 'medium').length,
                lowConfidenceMappings: mappingQueue.filter((row) => row.company_match_confidence === 'low' || row.company_match_confidence === 'none').length,
                manualRelinks,
                automatedBackfills,
                unlinks,
                topUnresolvedCompanies,
                topEmployers: topSignalBusinesses.map((row) => ({
                    businessId: row.business_id,
                    name: businessNameMap.get(row.business_id) || row.business_id,
                    approvedOfferCount: Number(row.approved_offer_count || 0),
                    salaryDisclosureRate: Number(row.salary_disclosure_rate || 0),
                    avgTransparencyScore: Number(row.avg_transparency_score || 0),
                })),
            }
        };

    } catch (error) {
        console.error('Error fetching admin analytics:', error);
        return null;
    }
}
