'use server';

import { createClient } from '../supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PinnedContent } from '../types';

// Create new pinned content
export async function createPinnedContent(contentData: Omit<PinnedContent, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string; content?: PinnedContent }> {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Verify that the user owns the business
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', contentData.business_id)
      .eq('owner_id', user.id)
      .single();

    if (businessError || !businessData) {
      return { success: false, error: 'You do not have permission to add pinned content to this business' };
    }

    // Prepare the content data
    const newContent = {
      ...contentData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert the pinned content
    const { data, error } = await supabase
      .from('pinned_content')
      .insert([newContent])
      .select()
      .single();

    if (error) {
      console.error('Error creating pinned content:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/businesses/${contentData.business_id}`);
    revalidatePath('/dashboard/pinned-content');
    return { success: true, content: data as PinnedContent };
  } catch (error) {
    console.error('Unexpected error creating pinned content:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Update existing pinned content
export async function updatePinnedContent(contentId: string, contentData: Partial<Omit<PinnedContent, 'id' | 'business_id' | 'created_at'>>): Promise<{ success: boolean; error?: string; content?: PinnedContent }> {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Verify that the user owns the business associated with this pinned content
    const { data: contentRecord, error: contentError } = await supabase
      .from('pinned_content')
      .select('business_id')
      .eq('id', contentId)
      .single();

    if (contentError || !contentRecord) {
      return { success: false, error: 'Pinned content not found' };
    }

    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', contentRecord.business_id)
      .eq('owner_id', user.id)
      .single();

    if (businessError || !businessData) {
      return { success: false, error: 'You do not have permission to update this pinned content' };
    }

    // Update the pinned content
    const updatedData = {
      ...contentData,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('pinned_content')
      .update(updatedData)
      .eq('id', contentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating pinned content:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/businesses/${contentRecord.business_id}`);
    revalidatePath('/dashboard/pinned-content');
    return { success: true, content: data as PinnedContent };
  } catch (error) {
    console.error('Unexpected error updating pinned content:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Delete pinned content
export async function deletePinnedContent(contentId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Verify that the user owns the business associated with this pinned content
    const { data: contentRecord, error: contentError } = await supabase
      .from('pinned_content')
      .select('business_id')
      .eq('id', contentId)
      .single();

    if (contentError || !contentRecord) {
      return { success: false, error: 'Pinned content not found' };
    }

    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', contentRecord.business_id)
      .eq('owner_id', user.id)
      .single();

    if (businessError || !businessData) {
      return { success: false, error: 'You do not have permission to delete this pinned content' };
    }

    // Delete the pinned content
    const { error } = await supabase
      .from('pinned_content')
      .delete()
      .eq('id', contentId);

    if (error) {
      console.error('Error deleting pinned content:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/businesses/${contentRecord.business_id}`);
    revalidatePath('/dashboard/pinned-content');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting pinned content:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get pinned content by ID
export async function getPinnedContentById(contentId: string): Promise<{ success: boolean; error?: string; content?: PinnedContent }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('pinned_content')
      .select('*')
      .eq('id', contentId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching pinned content:', error);
      return { success: false, error: error.message };
    }

    return { success: true, content: data as PinnedContent };
  } catch (error) {
    console.error('Unexpected error fetching pinned content:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get all pinned content for a business
export async function getPinnedContentByBusiness(businessId: string): Promise<{ success: boolean; error?: string; contents?: PinnedContent[] }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('pinned_content')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pinned content for business:', error);
      return { success: false, error: error.message };
    }

    return { success: true, contents: data as PinnedContent[] };
  } catch (error) {
    console.error('Unexpected error fetching pinned content for business:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Toggle the active status of pinned content
export async function togglePinnedContentStatus(contentId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Verify that the user owns the business associated with this pinned content
    const { data: contentRecord, error: contentError } = await supabase
      .from('pinned_content')
      .select('business_id')
      .eq('id', contentId)
      .single();

    if (contentError || !contentRecord) {
      return { success: false, error: 'Pinned content not found' };
    }

    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', contentRecord.business_id)
      .eq('owner_id', user.id)
      .single();

    if (businessError || !businessData) {
      return { success: false, error: 'You do not have permission to update this pinned content' };
    }

    // Toggle the active status
    const { data: currentContent, error: fetchError } = await supabase
      .from('pinned_content')
      .select('is_active')
      .eq('id', contentId)
      .single();

    if (fetchError) {
      return { success: false, error: 'Failed to fetch current status' };
    }

    const newStatus = !currentContent.is_active;

    const { error } = await supabase
      .from('pinned_content')
      .update({ 
        is_active: newStatus,
        updated_at: new Date().toISOString() 
      })
      .eq('id', contentId);

    if (error) {
      console.error('Error toggling pinned content status:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/businesses/${contentRecord.business_id}`);
    revalidatePath('/dashboard/pinned-content');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error toggling pinned content status:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get all pinned content for the current user's businesses
export async function getUserPinnedContent(): Promise<{ success: boolean; error?: string; contents?: PinnedContent[] }> {
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

    // Get pinned content for all user's businesses
    const businessIds = businesses.map(b => b.id);
    if (businessIds.length === 0) {
      return { success: true, contents: [] };
    }

    const { data, error } = await supabase
      .from('pinned_content')
      .select('*')
      .in('business_id', businessIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user pinned content:', error);
      return { success: false, error: error.message };
    }

    return { success: true, contents: data as PinnedContent[] };
  } catch (error) {
    console.error('Unexpected error fetching user pinned content:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}