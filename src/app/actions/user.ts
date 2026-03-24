'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  createErrorResponse,
  createSuccessResponse,
  logError,
  ErrorCode
} from '@/lib/errors';
import { ActionState, userProfileUpdateSchema } from '@/lib/types';
import { getServerTranslator } from '@/lib/i18n/server';

export async function syncProProfile(): Promise<ActionState> {
  const supabase = await createClient();
  const { t } = await getServerTranslator();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { status: 'error', message: t('userActions.authRequired', 'Authentication required.') };
  }

  const supabaseService = await createServiceClient();

  try {
    const { data: claim, error: claimError } = await supabaseService
      .from('business_claims')
      .select('business_id')
      .eq('user_id', user.id)
      .or('claim_state.eq.verified,status.eq.approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (claimError || !claim) {
      return { status: 'error', message: t('userActions.syncProProfile.noApprovedClaim', 'No approved claim was found.') };
    }

    const { error: updateError } = await supabaseService
      .from('profiles')
      .update({
        business_id: claim.business_id,
        role: 'pro'
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Sync profile error:', updateError);
      return { status: 'error', message: t('userActions.syncProProfile.updateError', 'Unable to sync your profile.') };
    }

    return { status: 'success', message: t('userActions.syncProProfile.success', 'Profile synced successfully.') };
  } catch (error: any) {
    console.error('Sync action error:', error);
    return { status: 'error', message: error.message || t('userActions.genericError', 'An unexpected error occurred.') };
  }
}

export async function toggleBookmark(businessId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { t } = await getServerTranslator();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { status: 'error', message: t('userActions.toggleBookmark.authRequired', 'You must be logged in to save a business.') };
  }

  const { data: existing } = await supabase
    .from('saved_businesses')
    .select('id')
    .eq('user_id', user.id)
    .eq('business_id', businessId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('saved_businesses')
      .delete()
      .eq('id', existing.id);

    if (error) {
      return { status: 'error', message: t('userActions.toggleBookmark.removeError', 'Unable to remove this business from your favorites.') };
    }

    return { status: 'success', data: { isBookmarked: false }, message: t('userActions.toggleBookmark.removed', 'Business removed from favorites.') };
  }

  const { error } = await supabase
    .from('saved_businesses')
    .insert({ user_id: user.id, business_id: businessId });

  if (error) {
    return { status: 'error', message: t('userActions.toggleBookmark.saveError', 'Unable to save this business.') };
  }

  return { status: 'success', data: { isBookmarked: true }, message: t('userActions.toggleBookmark.saved', 'Business saved successfully.') };
}

export async function getIsBookmarked(businessId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  const { data } = await supabase
    .from('saved_businesses')
    .select('id')
    .eq('user_id', user.id)
    .eq('business_id', businessId)
    .single();

  return !!data;
}

export async function getSavedBusinesses() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const [{ data: savedData, error: savedError }, { data: favoritesData, error: favoritesError }] = await Promise.all([
    supabase
      .from('saved_businesses')
      .select('business_id, created_at')
      .eq('user_id', user.id),
    supabase
      .from('favorites')
      .select('business_id, created_at')
      .eq('user_id', user.id)
  ]);

  if (savedError || favoritesError) {
    console.error('Error fetching saved/favorites:', savedError || favoritesError);
    throw new Error('Failed to fetch saved businesses');
  }

  const combinedData = [...(savedData || []), ...(favoritesData || [])];
  if (combinedData.length === 0) {
    return [];
  }

  const businessMap = new Map<string, string>();
  combinedData.forEach((item) => {
    const existingDate = businessMap.get(item.business_id);
    if (!existingDate || new Date(item.created_at) > new Date(existingDate)) {
      businessMap.set(item.business_id, item.created_at);
    }
  });

  const businessIds = Array.from(businessMap.keys());

  const { data: businesses, error: businessesError } = await supabase
    .from('businesses')
    .select('*')
    .in('id', businessIds);

  if (businessesError) {
    console.error('Error fetching businesses:', businessesError);
    throw new Error('Failed to fetch business data');
  }

  return businesses.map((business) => {
    const logo = {
      imageUrl: business.logo_url || '/placeholders/logo-placeholder.svg',
      imageHint: business.logo_hint || 'logo placeholder',
    };

    const photos = business.photos || [];
    const reviews = business.reviews || [];
    const overallRating = typeof business.overall_rating === 'number' ? business.overall_rating : 0;

    return {
      ...business,
      logo,
      photos,
      reviews,
      overallRating,
      saved_at: businessMap.get(business.id)
    };
  });
}

export async function updateUserProfile(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { t } = await getServerTranslator();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { status: 'error', message: t('userActions.authRequired', 'Authentication required.') };
  }

  const emailPrefsRaw = formData.get('email_preferences');
  const rawFormData = {
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    email_preferences: emailPrefsRaw ? JSON.parse(String(emailPrefsRaw)) : undefined,
  };

  const validatedFields = userProfileUpdateSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    return {
      status: 'error',
      message: t('userActions.updateProfile.validationError', 'Validation failed.'),
      errors: validatedFields.error.flatten().fieldErrors as any,
    };
  }

  try {
    const updateData: any = {
      full_name: validatedFields.data.full_name,
      email: validatedFields.data.email,
    };

    if (validatedFields.data.email_preferences) {
      updateData.email_preferences = validatedFields.data.email_preferences;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (error) {
      console.error('Update profile error:', error);
      return { status: 'error', message: t('userActions.updateProfile.updateError', 'Unable to update your profile.') };
    }

    return { status: 'success', message: t('userActions.updateProfile.success', 'Profile updated successfully.') };
  } catch (error: any) {
    console.error('Update profile exception:', error);
    return { status: 'error', message: t('userActions.updateProfile.unexpectedError', 'An error occurred while updating your profile.') };
  }
}

export async function exportUserData(): Promise<ActionState> {
  const supabase = await createClient();
  const { t } = await getServerTranslator();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, t('userActions.authRequired', 'Authentication required.'));
  }

  try {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: reviews } = await supabase.from('reviews').select('*').eq('user_id', user.id);
    const { data: favorites } = await supabase.from('saved_businesses').select('*, businesses(name)').eq('user_id', user.id);

    const exportData = {
      profile,
      reviews,
      favorites,
      export_date: new Date().toISOString(),
    };

    return createSuccessResponse(t('userActions.export.success', 'Your data is ready.'), exportData);
  } catch (error) {
    logError('export_user_data_error', error);
    return createErrorResponse(ErrorCode.SERVER_ERROR, t('userActions.export.error', 'Unable to export your data.'));
  }
}

export async function requestAccountDeletion(): Promise<ActionState> {
  const supabase = await createClient();
  const { locale, t, tf } = await getServerTranslator();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, t('userActions.authRequired', 'Authentication required.'));
  }

  try {
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    const { error } = await supabase
      .from('profiles')
      .update({
        deletion_scheduled_at: deletionDate.toISOString()
      })
      .eq('id', user.id);

    if (error) {
      throw error;
    }

    return createSuccessResponse(tf(
      'userActions.requestDeletion.success',
      'Your deletion request has been recorded. Your account will be deleted on {date}. You can cancel this request at any time by signing in again.',
      { date: deletionDate.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US') }
    ));
  } catch (error) {
    logError('request_deletion_error', error);
    return createErrorResponse(ErrorCode.SERVER_ERROR, t('userActions.requestDeletion.error', 'Unable to request account deletion.'));
  }
}
