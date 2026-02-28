'use server';

import { moderateReview } from '@/ai/flows/moderate-reviews';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/types';
import { reviewSchema, reviewReportSchema, reviewAppealSchema } from '@/lib/types';

export type ReviewFormState = ActionState;
import { checkRateLimit, recordAttempt, RATE_LIMIT_CONFIG } from '@/lib/rate-limiter-enhanced';
import { createClient } from '@/lib/supabase/server';
import {
  handleValidationError,
  handleDatabaseError,
  handleAuthenticationError,
  createErrorResponse,
  createSuccessResponse,
  logError,
  ErrorCode
} from '@/lib/errors';
import { createServiceClient } from '@/lib/supabase/server';
import { notifyAdmins } from '@/lib/notifications';

const LEGACY_REVIEW_REPORT_REASON_MAP: Record<string, string> = {
  spam: 'spam_or_promotional',
  fake: 'fake_or_coordinated',
  offensive: 'harassment_or_hate',
  irrelevant: 'off_topic',
  other: 'other',
};

export async function submitReview(
  prevState: ReviewFormState,
  formData: FormData
): Promise<ReviewFormState> {
  // Check authentication FIRST before any validation
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse(
      ErrorCode.AUTHENTICATION_ERROR,
      'Vous devez être connecté pour publier un avis.'
    ) as ReviewFormState;
  }

  const entries = Object.fromEntries(formData.entries());

  const parsedData = {
    ...entries,
    rating: parseInt(String(entries.rating), 10),
    isAnonymous: entries.isAnonymous === 'true',
    employmentStatus: String(entries.employmentStatus || '').trim() || undefined,
    roleSlug: String(entries.roleSlug || '').trim() || undefined,
    departmentSlug: String(entries.departmentSlug || '').trim() || undefined,
    citySlug: String(entries.citySlug || '').trim() || undefined,
    tenureBand: String(entries.tenureBand || '').trim() || undefined,
    contractType: String(entries.contractType || '').trim() || undefined,
    workMode: String(entries.workMode || '').trim() || undefined,
    subRatingWorkLifeBalance: parseInt(String(entries.subRatingWorkLifeBalance), 10) || 0,
    subRatingManagement: parseInt(String(entries.subRatingManagement), 10) || 0,
    subRatingCareerGrowth: parseInt(String(entries.subRatingCareerGrowth), 10) || 0,
    subRatingCulture: parseInt(String(entries.subRatingCulture), 10) || 0,
  };

  const validatedFields = reviewSchema.safeParse(parsedData);

  if (!validatedFields.success) {
    return handleValidationError(
      'Veuillez corriger les erreurs dans le formulaire.',
      validatedFields.error.flatten().fieldErrors
    ) as ReviewFormState;
  }

  const { title, text, businessId, isAnonymous } = validatedFields.data;

  // Rate limiting (by businessId + user IP or just user if logged in)
  // For now, let's use a combination or just user ID if available, otherwise businessId (to prevent spamming a single business)
  const rateLimitKey = user ? `review-${user.id}` : `review-anon-${businessId}`;

  const { isLimited, retryAfterSeconds } = await checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIG.review);
  if (isLimited) {
    return createErrorResponse(
      ErrorCode.RATE_LIMIT_ERROR,
      `Trop de tentatives. Veuillez réessayer dans ${Math.ceil(retryAfterSeconds / 60)} minutes.`
    ) as ReviewFormState;
  }

  const reviewText = `Titre: ${title}\nAvis: ${text}`;

  try {
    // Only run AI moderation if API key is available
    let moderationResult: {
      isSpam: boolean;
      reason?: string;
    };

    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
      moderationResult = await moderateReview({ reviewText });
    } else {
      moderationResult = { isSpam: false, reason: undefined };
    }

    if (moderationResult.isSpam) {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        `Votre avis n'a pas pu être publié. Raison: ${moderationResult.reason || 'Contenu inapproprié détecté.'}`
      ) as ReviewFormState;
    }

    // Check if user is the owner of this business

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id, role')
        .eq('id', user.id)
        .single();

      if (profile?.business_id === businessId) {
        return createErrorResponse(
          ErrorCode.AUTHORIZATION_ERROR,
          'Les propriétaires ne peuvent pas laisser d\'avis sur leur propre établissement.'
        ) as ReviewFormState;
      }
    }

    const author_name = isAnonymous ? 'Anonyme' : (user?.user_metadata?.full_name || `Utilisateur ${Math.floor(Math.random() * 10000)}`);

    let reviewStatus: 'pending' | 'published' = 'pending';

    let reviewData: {
      business_id: string;
      user_id: string | null;
      author_name: string;
      is_anonymous: boolean;
      rating: number;
      title: string;
      content: string;
      sub_ratings: {
        work_life_balance: number | null;
        management: number | null;
        career_growth: number | null;
        culture: number | null;
      };
      employment_status?: 'current' | 'former' | 'candidate';
      role_slug?: string | null;
      department_slug?: string | null;
      city_slug?: string | null;
      tenure_band?: 'lt_6m' | '6_12m' | '1_2y' | '3_5y' | 'gt_5y';
      contract_type?: 'cdi' | 'cdd' | 'intern' | 'freelance' | 'other';
      work_mode?: 'onsite' | 'hybrid' | 'remote';
      status: 'pending' | 'published';
    } = {
      business_id: businessId,
      user_id: user ? user.id : null, // Always link to user if logged in, even if anonymous
      author_name: author_name,
      is_anonymous: isAnonymous || false,
      rating: validatedFields.data.rating,
      title: title,
      content: text,
      sub_ratings: {
        work_life_balance: validatedFields.data.subRatingWorkLifeBalance || null,
        management: validatedFields.data.subRatingManagement || null,
        career_growth: validatedFields.data.subRatingCareerGrowth || null,
        culture: validatedFields.data.subRatingCulture || null,
      },
      employment_status: validatedFields.data.employmentStatus,
      role_slug: validatedFields.data.roleSlug || null,
      department_slug: validatedFields.data.departmentSlug || null,
      city_slug: validatedFields.data.citySlug || null,
      tenure_band: validatedFields.data.tenureBand,
      contract_type: validatedFields.data.contractType,
      work_mode: validatedFields.data.workMode,
      status: reviewStatus,
    };

    // Check if user is admin or has auto_approve_media flag
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, auto_approve_media')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin' || profile?.auto_approve_media === true) {
        reviewStatus = 'published';
        reviewData = { ...reviewData, status: reviewStatus };
      }
    }

    const { error } = await supabase.from('reviews').insert(reviewData);

    if (error) {
      await recordAttempt(rateLimitKey, RATE_LIMIT_CONFIG.review);
      logError('submit_review_insert', error, { businessId, userId: user?.id });
      return handleDatabaseError(error) as ReviewFormState;
    }

    // Trigger notification for business owner
    // Fetch business user_id (owner)
    const { data: business } = await supabase
      .from('businesses')
      .select('user_id, name')
      .eq('id', businessId)
      .single();

    if (business && business.user_id) {
      const serviceClient = await createServiceClient();
      await serviceClient.from('notifications').insert({
        user_id: business.user_id,
        title: 'Nouvel avis reçu',
        message: `Vous avez reçu un nouvel avis pour ${business.name}.`,
        type: 'review',
        link: `/businesses/${businessId}`,
        is_read: false
      });
    }

    await recordAttempt(rateLimitKey, RATE_LIMIT_CONFIG.review);
    revalidatePath(`/businesses/${businessId}`);
    return createSuccessResponse(
      reviewStatus === 'published'
        ? 'Votre avis a été publié avec succès.'
        : 'Votre avis a été soumis avec succès et est en attente de modération.',
      { published: reviewStatus === 'published' }
    ) as ReviewFormState;

  } catch (error) {
    logError('submit_review_unexpected', error, { businessId });
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      'Une erreur est survenue lors de la soumission de votre avis. Veuillez réessayer.'
    ) as ReviewFormState;
  }
}

/**
 * Report a review for moderation
 */
export async function reportReview(
  data: any
): Promise<ActionState> {
  const normalizedData = {
    ...data,
    reason: LEGACY_REVIEW_REPORT_REASON_MAP[String(data?.reason)] || data?.reason,
  };

  const validatedFields = reviewReportSchema.safeParse(normalizedData);

  if (!validatedFields.success) {
    return handleValidationError(
      'Données de signalement invalides.',
      validatedFields.error.flatten().fieldErrors as any
    ) as ActionState;
  }

  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Rate limiting
    const rateLimitKey = user ? `report-${user.id}` : 'report-anon';
    const { isLimited, retryAfterSeconds } = await checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIG.report);
    if (isLimited) {
      return createErrorResponse(
        ErrorCode.RATE_LIMIT_ERROR,
        `Trop de tentatives de signalement. Veuillez réessayer dans ${Math.ceil(retryAfterSeconds / 60)} minutes.`
      ) as ActionState;
    }

    // Check if the user is authenticated (RLS requires reporter_id = auth.uid())
    if (!user) {
      return createErrorResponse(
        ErrorCode.AUTHENTICATION_ERROR,
        'Vous devez être connecté pour signaler un avis.'
      ) as ActionState;
    }

    const reportData = {
      ...validatedFields.data,
      reporter_id: user.id,
      status: 'pending',
    };

    const { error } = await supabase
      .from('review_reports')
      .insert([reportData]);

    if (error) {
      await recordAttempt(rateLimitKey, RATE_LIMIT_CONFIG.report);
      logError('review_report_insert_error', error, { reviewId: validatedFields.data.review_id });
      return handleDatabaseError(error) as ActionState;
    }

    await notifyAdmins({
      title: 'Nouveau signalement d avis',
      message: 'Un avis utilisateur vient d etre signale et attend moderation.',
      type: 'admin_review_report_pending',
      link: '/admin/avis-signalements',
    });

    await recordAttempt(rateLimitKey, RATE_LIMIT_CONFIG.report);
    return createSuccessResponse('Signalement envoyé avec succès. Merci de votre contribution.') as ActionState;
  } catch (error) {
    logError('reportReview_unexpected', error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      'Une erreur est survenue lors de l\'envoi du signalement.'
    ) as ActionState;
  }
}

/**
 * Submit an appeal for a moderated review.
 */
export async function submitReviewAppeal(data: any): Promise<ActionState> {
  const validatedFields = reviewAppealSchema.safeParse(data);

  if (!validatedFields.success) {
    return handleValidationError(
      'Données d appel invalides.',
      validatedFields.error.flatten().fieldErrors as any
    ) as ActionState;
  }

  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return createErrorResponse(
        ErrorCode.AUTHENTICATION_ERROR,
        'Vous devez être connecté pour faire appel.'
      ) as ActionState;
    }

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, user_id, business_id')
      .eq('id', validatedFields.data.review_id)
      .single();

    if (reviewError || !review) {
      return createErrorResponse(ErrorCode.NOT_FOUND, 'Avis introuvable.') as ActionState;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    const isAuthor = review.user_id === user.id;
    const isCompanyOwner = profile?.role === 'pro' && profile?.business_id === review.business_id;

    if (!isAuthor && !isCompanyOwner) {
      return createErrorResponse(
        ErrorCode.AUTHORIZATION_ERROR,
        'Vous ne pouvez pas faire appel pour cet avis.'
      ) as ActionState;
    }

    const { error } = await supabase
      .from('review_appeals')
      .insert({
        review_id: validatedFields.data.review_id,
        appellant_user_id: user.id,
        appeal_type: isAuthor ? 'author' : 'company_owner',
        message: validatedFields.data.message,
        status: 'open',
      });

    if (error) {
      logError('submit_review_appeal_insert_error', error, { reviewId: validatedFields.data.review_id });
      return handleDatabaseError(error) as ActionState;
    }

    await notifyAdmins({
      title: 'Nouvel appel sur un avis',
      message: 'Un appel de moderation a été soumis et attend traitement.',
      type: 'admin_review_appeal_open',
      link: '/admin/avis-appels',
    });

    return createSuccessResponse('Votre appel a été soumis.') as ActionState;
  } catch (error) {
    logError('submitReviewAppeal_unexpected', error, data);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      'Une erreur est survenue lors de l envoi de l appel.'
    ) as ActionState;
  }
}

/**
 * Update an existing review
 */
export async function updateReview(
  reviewId: number,
  formData: FormData
): Promise<ReviewFormState> {
  const entries = Object.fromEntries(formData.entries());

  const parsedData = {
    ...entries,
    rating: parseInt(String(entries.rating), 10),
    subRatingService: parseInt(String(entries.subRatingService), 10) || 0,
    subRatingQuality: parseInt(String(entries.subRatingQuality), 10) || 0,
    subRatingValue: parseInt(String(entries.subRatingValue), 10) || 0,
    subRatingAmbiance: parseInt(String(entries.subRatingAmbiance), 10) || 0,
  };

  const validatedFields = reviewSchema.safeParse(parsedData);

  if (!validatedFields.success) {
    return handleValidationError(
      'Veuillez corriger les erreurs dans le formulaire.',
      validatedFields.error.flatten().fieldErrors
    ) as ReviewFormState;
  }

  const { title, text } = validatedFields.data;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return handleAuthenticationError(
        'Vous devez être connecté pour modifier un avis.'
      ) as ReviewFormState;
    }

    // Rate limiting for updates
    const rateLimitKey = `update-${user.id}`;
    const { isLimited, retryAfterSeconds } = await checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIG.review);
    if (isLimited) {
      return createErrorResponse(
        ErrorCode.RATE_LIMIT_ERROR,
        `Trop de tentatives. Veuillez réessayer dans ${Math.ceil(retryAfterSeconds / 60)} minutes.`
      ) as ReviewFormState;
    }

    // First, verify the user owns this review
    const { data: review, error: fetchError } = await supabase
      .from('reviews')
      .select('user_id, business_id, is_anonymous')
      .eq('id', reviewId)
      .single();

    if (fetchError || !review) {
      return createErrorResponse(
        ErrorCode.NOT_FOUND,
        'Avis introuvable.'
      ) as ReviewFormState;
    }

    // Check if user owns this review (or is admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    const isOwner = review.user_id === user.id;

    if (!isAdmin && !isOwner) {
      return createErrorResponse(
        ErrorCode.AUTHORIZATION_ERROR,
        'Vous ne pouvez modifier que vos propres avis.'
      ) as ReviewFormState;
    }

    // Run AI moderation on updated content
    const reviewText = `Titre: ${title}\nAvis: ${text}`;
    let moderationResult: {
      isSpam: boolean;
      reason?: string;
    };

    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
      moderationResult = await moderateReview({ reviewText });
    } else {
      moderationResult = { isSpam: false, reason: undefined };
    }

    if (moderationResult.isSpam) {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        `Votre avis n'a pas pu être mis à jour. Raison: ${moderationResult.reason || 'Contenu inapproprié détecté.'}`
      ) as ReviewFormState;
    }

    // Update the review
    const updateData = {
      title,
      content: text,
      rating: validatedFields.data.rating,
      sub_ratings: {
        work_life_balance: validatedFields.data.subRatingWorkLifeBalance || null,
        management: validatedFields.data.subRatingManagement || null,
        career_growth: validatedFields.data.subRatingCareerGrowth || null,
        culture: validatedFields.data.subRatingCulture || null,
      },
      status: 'pending', // Reset to pending for moderation
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', reviewId);

    if (updateError) {
      logError('update_review_error', updateError, { reviewId, userId: user.id });
      return handleDatabaseError(updateError) as ReviewFormState;
    }

    await recordAttempt(rateLimitKey, RATE_LIMIT_CONFIG.review);
    revalidatePath(`/businesses/${review.business_id}`);
    return createSuccessResponse(
      'Votre avis a été mis à jour avec succès et est en attente de modération.'
    ) as ReviewFormState;

  } catch (error) {
    logError('updateReview_unexpected', error, { reviewId });
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      'Une erreur est survenue lors de la mise à jour de votre avis. Veuillez réessayer.'
    ) as ReviewFormState;
  }
}

/**
 * Delete a review (soft delete)
 */
export async function deleteReview(
  reviewId: number
): Promise<ReviewFormState> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return handleAuthenticationError(
        'Vous devez être connecté pour supprimer un avis.'
      ) as ReviewFormState;
    }

    // Rate limiting for deletions
    const rateLimitKey = `delete-${user.id}`;
    const { isLimited, retryAfterSeconds } = await checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIG.review);
    if (isLimited) {
      return createErrorResponse(
        ErrorCode.RATE_LIMIT_ERROR,
        `Trop de tentatives. Veuillez réessayer dans ${Math.ceil(retryAfterSeconds / 60)} minutes.`
      ) as ReviewFormState;
    }

    // First, verify the user owns this review
    const { data: review, error: fetchError } = await supabase
      .from('reviews')
      .select('user_id, business_id')
      .eq('id', reviewId)
      .single();

    if (fetchError || !review) {
      return createErrorResponse(
        ErrorCode.NOT_FOUND,
        'Avis introuvable.'
      ) as ReviewFormState;
    }

    // Check if user owns this review (or is admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    const isOwner = review.user_id === user.id;

    if (!isAdmin && !isOwner) {
      return createErrorResponse(
        ErrorCode.AUTHORIZATION_ERROR,
        'Vous ne pouvez supprimer que vos propres avis.'
      ) as ReviewFormState;
    }

    // Soft delete by setting status to 'deleted'
    const { error: deleteError } = await supabase
      .from('reviews')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('id', reviewId);

    if (deleteError) {
      logError('delete_review_error', deleteError, { reviewId, userId: user.id });
      return handleDatabaseError(deleteError) as ReviewFormState;
    }

    await recordAttempt(rateLimitKey, RATE_LIMIT_CONFIG.review);
    revalidatePath(`/businesses/${review.business_id}`);
    return createSuccessResponse(
      'Votre avis a été supprimé avec succès.'
    ) as ReviewFormState;

  } catch (error) {
    logError('deleteReview_unexpected', error, { reviewId });
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      'Une erreur est survenue lors de la suppression de votre avis. Veuillez réessayer.'
    ) as ReviewFormState;
  }
}
