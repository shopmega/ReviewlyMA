'use server';

import { revalidatePath } from 'next/cache';
import { checkRateLimit, RATE_LIMIT_CONFIG, recordAttempt } from '@/lib/rate-limiter-enhanced';
import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/lib/types';
import { jobOfferIngestionSchema } from '@/lib/types';
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCode,
  handleDatabaseError,
  handleValidationError,
  logError,
} from '@/lib/errors';
import { normalizeJobOfferInput } from '@/lib/job-offers/normalization';
import { getJobOfferBenchmarks } from '@/lib/job-offers/benchmarks';
import { computeJobOfferAnalysis } from '@/lib/job-offers/scoring';
import { extractJobOfferInput } from '@/lib/job-offers/extraction';

export type JobOfferActionState = ActionState;

export async function submitJobOfferAnalysis(
  _prevState: JobOfferActionState,
  formData: FormData
): Promise<JobOfferActionState> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResponse(
        ErrorCode.AUTHENTICATION_ERROR,
        'Vous devez etre connecte pour analyser et enregistrer une offre.'
      ) as JobOfferActionState;
    }

    const rateLimitKey = `job-offer-analysis-${user.id}`;
    const limitStatus = await checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIG.review);
    if (limitStatus.isLimited) {
      return createErrorResponse(
        ErrorCode.RATE_LIMIT_ERROR,
        `Trop de tentatives. Reessayez dans ${Math.ceil(limitStatus.retryAfterSeconds / 60)} minutes.`
      ) as JobOfferActionState;
    }
    await recordAttempt(rateLimitKey, RATE_LIMIT_CONFIG.review);

    const parsed = jobOfferIngestionSchema.safeParse({
      sourceType: formData.get('sourceType'),
      sourceUrl: formData.get('sourceUrl'),
      sourceText: formData.get('sourceText'),
    });

    if (!parsed.success) {
      return handleValidationError(
        'Veuillez corriger les erreurs de l extraction.',
        parsed.error.flatten().fieldErrors
      ) as JobOfferActionState;
    }

    const effectiveSourceType = parsed.data.sourceUrl ? 'url' : 'paste';
    let extracted;
    try {
      extracted = await extractJobOfferInput({
        sourceType: effectiveSourceType,
        sourceUrl: parsed.data.sourceUrl || '',
        sourceText: parsed.data.sourceText || '',
      });
    } catch (error) {
      logError('job_offer_extract_input', error, { sourceType: effectiveSourceType });
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        effectiveSourceType === 'url'
          ? 'Impossible de lire ce lien pour le moment. Collez le texte de l annonce directement.'
          : 'Impossible de lire correctement cette offre. Essayez avec un texte plus complet.'
      ) as JobOfferActionState;
    }

    if (!extracted.companyName || !extracted.jobTitle) {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Impossible d extraire assez d informations depuis cette offre. Essayez un texte plus complet.'
      ) as JobOfferActionState;
    }

    const normalizedInput = normalizeJobOfferInput({
      sourceType: effectiveSourceType,
      sourceUrl: parsed.data.sourceUrl || '',
      documentName: '',
      companyName: extracted.companyName,
      jobTitle: extracted.jobTitle,
      city: extracted.city || '',
      salaryMin: extracted.salaryMin ?? undefined,
      salaryMax: extracted.salaryMax ?? undefined,
      payPeriod: extracted.payPeriod,
      contractType: extracted.contractType ?? undefined,
      workModel: extracted.workModel ?? undefined,
      seniorityLevel: extracted.seniorityLevel ?? undefined,
      yearsExperienceRequired: extracted.yearsExperienceRequired ?? undefined,
      benefits: extracted.benefits,
      sourceText: extracted.rawContent,
    });
    const benchmarks = await getJobOfferBenchmarks(normalizedInput);
    const computedAnalysis = computeJobOfferAnalysis(normalizedInput, benchmarks);

    const offerRow = {
      user_id: user.id,
      business_id: benchmarks.businessId,
      company_name: normalizedInput.companyName,
      job_title: normalizedInput.jobTitle,
      job_title_normalized: normalizedInput.jobTitleNormalized,
      city: normalizedInput.city,
      city_slug: normalizedInput.citySlug,
      salary_min: normalizedInput.salaryMin,
      salary_max: normalizedInput.salaryMax,
      salary_currency: 'MAD',
      pay_period: normalizedInput.payPeriod,
      contract_type: normalizedInput.contractType,
      work_model: normalizedInput.workModel,
      seniority_level: normalizedInput.seniorityLevel,
      years_experience_required: normalizedInput.yearsExperienceRequired,
      benefits: normalizedInput.benefits,
      source_text: normalizedInput.sourceText,
      source_type: normalizedInput.sourceType,
      source_url: normalizedInput.sourceUrl,
      document_name: normalizedInput.documentName,
      status: 'pending',
      visibility: 'private',
    };

    const { data: offerData, error: offerError } = await supabase
      .from('job_offers')
      .insert(offerRow)
      .select('id')
      .single();

    if (offerError || !offerData) {
      logError('submit_job_offer_offer_insert', offerError, { userId: user.id });
      return handleDatabaseError(offerError) as JobOfferActionState;
    }

    const analysisRow = {
      job_offer_id: offerData.id,
      ...computedAnalysis,
    };

    const { data: analysisData, error: analysisError } = await supabase
      .from('job_offer_analyses')
      .insert(analysisRow)
      .select('id')
      .single();

    if (analysisError || !analysisData) {
      logError('submit_job_offer_analysis_insert', analysisError, { userId: user.id, jobOfferId: offerData.id });
      return handleDatabaseError(analysisError) as JobOfferActionState;
    }

    revalidatePath('/job-offers');
    revalidatePath('/job-offers/history');
    revalidatePath(`/job-offers/${analysisData.id}`);

    return createSuccessResponse(
      'Analyse enregistree avec succes.',
      {
        analysisId: analysisData.id,
        offerId: offerData.id,
        extractedOffer: extracted,
        analysis: computedAnalysis,
      }
    ) as JobOfferActionState;
  } catch (error) {
    logError('submit_job_offer_analysis_unexpected', error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      'Erreur inattendue lors de l analyse de l offre.'
    ) as JobOfferActionState;
  }
}
