'use server';

import { createClient } from '../supabase/server';
import { revalidatePath } from 'next/cache';
import { Ad } from '../types';

// Create a new ad
export async function createAd(adData: Omit<Ad, 'id' | 'created_at' | 'updated_at' | 'spent_cents'>): Promise<{ success: boolean; error?: string; ad?: Ad }> {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Prepare the ad data
    const newAd = {
      ...adData,
      advertiser_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      spent_cents: 0,
    };

    // Insert the ad
    const { data, error } = await supabase
      .from('ads')
      .insert([newAd])
      .select()
      .single();

    if (error) {
      console.error('Error creating ad:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/advertising');
    return { success: true, ad: data as Ad };
  } catch (error) {
    console.error('Unexpected error creating ad:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Update an existing ad
export async function updateAd(adId: string, adData: Partial<Omit<Ad, 'id' | 'advertiser_id' | 'created_at'>>): Promise<{ success: boolean; error?: string; ad?: Ad }> {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Update the ad
    const updatedData = {
      ...adData,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('ads')
      .update(updatedData)
      .eq('id', adId)
      .eq('advertiser_id', user.id) // Ensure user owns the ad
      .select()
      .single();

    if (error) {
      console.error('Error updating ad:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/advertising');
    revalidatePath(`/dashboard/advertising/${adId}`);
    return { success: true, ad: data as Ad };
  } catch (error) {
    console.error('Unexpected error updating ad:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Delete an ad
export async function deleteAd(adId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Delete the ad
    const { error } = await supabase
      .from('ads')
      .delete()
      .eq('id', adId)
      .eq('advertiser_id', user.id); // Ensure user owns the ad

    if (error) {
      console.error('Error deleting ad:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/advertising');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting ad:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get ad by ID
export async function getAdById(adId: string): Promise<{ success: boolean; error?: string; ad?: Ad }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .eq('id', adId)
      .single();

    if (error) {
      console.error('Error fetching ad:', error);
      return { success: false, error: error.message };
    }

    return { success: true, ad: data as Ad };
  } catch (error) {
    console.error('Unexpected error fetching ad:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get ads for current user
export async function getUserAds(userId?: string): Promise<{ success: boolean; error?: string; ads?: Ad[] }> {
  const supabase = await createClient();

  try {
    // Get the current user if userId is not provided
    let actualUserId = userId;
    if (!actualUserId) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }
      actualUserId = user.id;
    }

    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .eq('advertiser_id', actualUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user ads:', error);
      return { success: false, error: error.message };
    }

    return { success: true, ads: data as Ad[] };
  } catch (error) {
    console.error('Unexpected error fetching user ads:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get active ads for display
export async function getActiveAds(options: {
  limit?: number;
  targetBusinessId?: string;
  targetingCriteria?: Record<string, any>;
} = {}): Promise<{ success: boolean; error?: string; ads?: Ad[] }> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('ads')
      .select('*')
      .eq('status', 'active');

    // Filter by date range
    const now = new Date().toISOString();
    query = query.lte('start_date', now).gte('end_date', now);

    // Apply additional filters if provided
    if (options.targetBusinessId) {
      query = query.or(`target_business_ids.cs.{${options.targetBusinessId}},target_business_ids.is.null`);
    }

    // Apply limit if provided
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching active ads:', error);
      return { success: false, error: error.message };
    }

    return { success: true, ads: data as Ad[] };
  } catch (error) {
    console.error('Unexpected error fetching active ads:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Toggle ad status
export async function toggleAdStatus(adId: string, status: 'active' | 'paused'): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Update the ad status
    const { error } = await supabase
      .from('ads')
      .update({ 
        status,
        updated_at: new Date().toISOString() 
      })
      .eq('id', adId)
      .eq('advertiser_id', user.id); // Ensure user owns the ad

    if (error) {
      console.error('Error updating ad status:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/advertising');
    revalidatePath(`/dashboard/advertising/${adId}`);
    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating ad status:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
