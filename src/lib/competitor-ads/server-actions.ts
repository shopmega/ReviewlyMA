'use server';

import { createClient } from '../supabase/server';
import { revalidatePath } from 'next/cache';
import { CompetitorAd, CompetitorAdEventType } from '../types';

// Create a new competitor ad
export async function createCompetitorAd(adData: Omit<CompetitorAd, 'id' | 'created_at' | 'updated_at' | 'spent_cents'>): Promise<{ success: boolean; error?: string; ad?: CompetitorAd }> {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Verify that the user owns the advertiser business
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', adData.advertiser_business_id)
      .eq('owner_id', user.id)
      .single();

    if (businessError || !businessData) {
      return { success: false, error: 'You do not have permission to create ads for this business' };
    }

    // Prepare the ad data
    const newAd = {
      ...adData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      spent_cents: 0,
    };

    // Insert the ad
    const { data, error } = await supabase
      .from('competitor_ads')
      .insert([newAd])
      .select()
      .single();

    if (error) {
      console.error('Error creating competitor ad:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/competitor-ads');
    return { success: true, ad: data as CompetitorAd };
  } catch (error) {
    console.error('Unexpected error creating competitor ad:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Update an existing competitor ad
export async function updateCompetitorAd(adId: string, adData: Partial<Omit<CompetitorAd, 'id' | 'advertiser_business_id' | 'created_at'>>): Promise<{ success: boolean; error?: string; ad?: CompetitorAd }> {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Verify that the user owns the business associated with this ad
    const { data: adRecord, error: adError } = await supabase
      .from('competitor_ads')
      .select('advertiser_business_id')
      .eq('id', adId)
      .single();

    if (adError || !adRecord) {
      return { success: false, error: 'Competitor ad not found' };
    }

    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', adRecord.advertiser_business_id)
      .eq('owner_id', user.id)
      .single();

    if (businessError || !businessData) {
      return { success: false, error: 'You do not have permission to update this competitor ad' };
    }

    // Update the ad
    const updatedData = {
      ...adData,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('competitor_ads')
      .update(updatedData)
      .eq('id', adId)
      .select()
      .single();

    if (error) {
      console.error('Error updating competitor ad:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/competitor-ads');
    revalidatePath(`/dashboard/competitor-ads/${adId}`);
    return { success: true, ad: data as CompetitorAd };
  } catch (error) {
    console.error('Unexpected error updating competitor ad:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Delete a competitor ad
export async function deleteCompetitorAd(adId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Verify that the user owns the business associated with this ad
    const { data: adRecord, error: adError } = await supabase
      .from('competitor_ads')
      .select('advertiser_business_id')
      .eq('id', adId)
      .single();

    if (adError || !adRecord) {
      return { success: false, error: 'Competitor ad not found' };
    }

    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', adRecord.advertiser_business_id)
      .eq('owner_id', user.id)
      .single();

    if (businessError || !businessData) {
      return { success: false, error: 'You do not have permission to delete this competitor ad' };
    }

    // Delete the ad
    const { error } = await supabase
      .from('competitor_ads')
      .delete()
      .eq('id', adId);

    if (error) {
      console.error('Error deleting competitor ad:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/competitor-ads');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting competitor ad:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get competitor ad by ID
export async function getCompetitorAdById(adId: string): Promise<{ success: boolean; error?: string; ad?: CompetitorAd }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('competitor_ads')
      .select('*')
      .eq('id', adId)
      .single();

    if (error) {
      console.error('Error fetching competitor ad:', error);
      return { success: false, error: error.message };
    }

    return { success: true, ad: data as CompetitorAd };
  } catch (error) {
    console.error('Unexpected error fetching competitor ad:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get all competitor ads for a business
export async function getCompetitorAdsByBusiness(businessId: string): Promise<{ success: boolean; error?: string; ads?: CompetitorAd[] }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('competitor_ads')
      .select('*')
      .eq('advertiser_business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching competitor ads for business:', error);
      return { success: false, error: error.message };
    }

    return { success: true, ads: data as CompetitorAd[] };
  } catch (error) {
    console.error('Unexpected error fetching competitor ads for business:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Toggle the status of a competitor ad
export async function toggleCompetitorAdStatus(adId: string, newStatus: 'active' | 'paused'): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Verify that the user owns the business associated with this ad
    const { data: adRecord, error: adError } = await supabase
      .from('competitor_ads')
      .select('advertiser_business_id')
      .eq('id', adId)
      .single();

    if (adError || !adRecord) {
      return { success: false, error: 'Competitor ad not found' };
    }

    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', adRecord.advertiser_business_id)
      .eq('owner_id', user.id)
      .single();

    if (businessError || !businessData) {
      return { success: false, error: 'You do not have permission to update this competitor ad' };
    }

    // Update the ad status
    const { error } = await supabase
      .from('competitor_ads')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString() 
      })
      .eq('id', adId);

    if (error) {
      console.error('Error updating competitor ad status:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/competitor-ads');
    revalidatePath(`/dashboard/competitor-ads/${adId}`);
    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating competitor ad status:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get active competitor ads for a specific business page (to show competitor ads)
export async function getActiveCompetitorAdsForBusiness(targetBusinessId: string): Promise<{ success: boolean; error?: string; ads?: CompetitorAd[] }> {
  const supabase = await createClient();

  try {
    const now = new Date().toISOString();
    
    // Query for active competitor ads that target this specific business
    let query = supabase
      .from('competitor_ads')
      .select('*')
      .eq('status', 'active')
      .lte('start_date', now)
      .gte('end_date', now);

    // Filter by target competitors - either the targetBusinessId is in the target_competitor_ids array
    // or the target_competitor_ids is null/empty (meaning it targets all competitors)
    query = query.or(`target_competitor_ids.cs.{${targetBusinessId}}, target_competitor_ids.is.null`);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching active competitor ads for business:', error);
      return { success: false, error: error.message };
    }

    return { success: true, ads: data as CompetitorAd[] };
  } catch (error) {
    console.error('Unexpected error fetching active competitor ads for business:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

type TrackCompetitorAdEventPayload = {
  adId: string;
  targetBusinessId: string;
  eventType: CompetitorAdEventType;
  viewerSessionId?: string;
};

export async function trackCompetitorAdEvent(payload: TrackCompetitorAdEventPayload): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    if (!payload.adId || !payload.targetBusinessId) {
      return { success: false, error: 'Missing required tracking fields' };
    }

    if (payload.eventType !== 'impression' && payload.eventType !== 'click') {
      return { success: false, error: 'Invalid event type' };
    }

    const [{ data: settings }, { data: ad, error: adError }, { data: authData }] = await Promise.all([
      supabase
        .from('site_settings')
        .select('enable_competitor_ads, enable_competitor_ads_tracking')
        .eq('id', 'main')
        .maybeSingle(),
      supabase
        .from('competitor_ads')
        .select('id, advertiser_business_id, target_competitor_ids, status, start_date, end_date')
        .eq('id', payload.adId)
        .maybeSingle(),
      supabase.auth.getUser(),
    ]);

    if (settings?.enable_competitor_ads === false || settings?.enable_competitor_ads_tracking === false) {
      return { success: true };
    }

    if (adError || !ad) {
      return { success: false, error: 'Ad not found' };
    }

    const now = new Date();
    const started = ad.start_date ? new Date(ad.start_date) : null;
    const ended = ad.end_date ? new Date(ad.end_date) : null;
    const isActive =
      ad.status === 'active' &&
      (!started || started <= now) &&
      (!ended || ended >= now);

    if (!isActive) {
      return { success: false, error: 'Ad not active' };
    }

    if (
      Array.isArray(ad.target_competitor_ids) &&
      ad.target_competitor_ids.length > 0 &&
      !ad.target_competitor_ids.includes(payload.targetBusinessId)
    ) {
      return { success: false, error: 'Ad does not target this business' };
    }

    const userId = authData?.user?.id || null;

    const { error: insertError } = await supabase
      .from('competitor_ad_events')
      .insert({
        ad_id: ad.id,
        advertiser_business_id: ad.advertiser_business_id,
        target_business_id: payload.targetBusinessId,
        event_type: payload.eventType,
        viewer_session_id: payload.viewerSessionId || null,
        user_id: userId,
        metadata: {
          source: 'business_page',
        },
      });

    if (insertError) {
      console.error('Error tracking competitor ad event:', insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error tracking competitor ad event:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export type CompetitorAdMetrics = {
  adId: string;
  impressions: number;
  clicks: number;
  ctr: number;
};

export async function getUserCompetitorAdMetrics(): Promise<{ success: boolean; error?: string; metrics?: CompetitorAdMetrics[] }> {
  const supabase = await createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id);

    if (businessError || !businesses) {
      return { success: false, error: 'Could not fetch user businesses' };
    }

    const businessIds = businesses.map((b) => b.id);
    if (businessIds.length === 0) {
      return { success: true, metrics: [] };
    }

    const { data: ads, error: adsError } = await supabase
      .from('competitor_ads')
      .select('id')
      .in('advertiser_business_id', businessIds);

    if (adsError) {
      return { success: false, error: adsError.message };
    }

    const adIds = (ads || []).map((ad) => ad.id);
    if (adIds.length === 0) {
      return { success: true, metrics: [] };
    }

    const { data: events, error: eventsError } = await supabase
      .from('competitor_ad_events')
      .select('ad_id, event_type')
      .in('ad_id', adIds);

    if (eventsError) {
      return { success: false, error: eventsError.message };
    }

    const aggregates = new Map<string, { impressions: number; clicks: number }>();
    for (const adId of adIds) {
      aggregates.set(adId, { impressions: 0, clicks: 0 });
    }

    for (const event of events || []) {
      const agg = aggregates.get(event.ad_id);
      if (!agg) continue;
      if (event.event_type === 'impression') agg.impressions += 1;
      if (event.event_type === 'click') agg.clicks += 1;
    }

    const metrics: CompetitorAdMetrics[] = adIds.map((adId) => {
      const agg = aggregates.get(adId) || { impressions: 0, clicks: 0 };
      const ctr = agg.impressions > 0 ? Number(((agg.clicks / agg.impressions) * 100).toFixed(2)) : 0;
      return {
        adId,
        impressions: agg.impressions,
        clicks: agg.clicks,
        ctr,
      };
    });

    return { success: true, metrics };
  } catch (error) {
    console.error('Unexpected error fetching competitor ad metrics:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get all competitor ads for the current user's businesses
export async function getUserCompetitorAds(): Promise<{ success: boolean; error?: string; ads?: CompetitorAd[] }> {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get all businesses owned by the user
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id);

    if (businessError || !businesses) {
      return { success: false, error: 'Could not fetch user businesses' };
    }

    // Get competitor ads for all user's businesses
    const businessIds = businesses.map(b => b.id);
    if (businessIds.length === 0) {
      return { success: true, ads: [] };
    }

    const { data, error } = await supabase
      .from('competitor_ads')
      .select('*')
      .in('advertiser_business_id', businessIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user competitor ads:', error);
      return { success: false, error: error.message };
    }

    return { success: true, ads: data as CompetitorAd[] };
  } catch (error) {
    console.error('Unexpected error fetching user competitor ads:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
