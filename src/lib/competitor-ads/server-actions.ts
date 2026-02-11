'use server';

import { createClient } from '../supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { CompetitorAd } from '../types';

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