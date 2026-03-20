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
  logError,
} from '@/lib/errors';
import { normalizeJobOfferInput } from '@/lib/job-offers/normalization';
import { getJobOfferBenchmarks } from '@/lib/job-offers/benchmarks';
import { computeJobOfferAnalysis } from '@/lib/job-offers/scoring';
import { extractJobOfferInput } from '@/lib/job-offers/extraction';

export type JobOfferActionState = ActionState;

function summarizeText(value: string | undefined, max = 220) {
  if (!value) return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

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
      logError('job_offer_ingestion_validation', parsed.error, {
        sourceType: formData.get('sourceType'),
        sourceUrl: formData.get('sourceUrl'),
        sourceTextLength: String(formData.get('sourceText') || '').length,
      });
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Veuillez corriger les erreurs de l extraction.',
        {
          fieldErrors: parsed.error.flatten().fieldErrors,
          debug: {
            stage: 'validate_ingestion',
            sourceType: formData.get('sourceType'),
            sourceUrl: formData.get('sourceUrl'),
            sourceTextLength: String(formData.get('sourceText') || '').length,
          },
        }
      ) as JobOfferActionState;
    }

    const effectiveSourceType = parsed.data.sourceUrl ? 'url' : 'paste';
    const debugBase = {
      requestedSourceType: parsed.data.sourceType || null,
      effectiveSourceType,
      sourceUrl: parsed.data.sourceUrl || null,
      sourceTextLength: parsed.data.sourceText?.length || 0,
      sourceTextPreview: summarizeText(parsed.data.sourceText),
    };

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
          : 'Impossible de lire correctement cette offre. Essayez avec un texte plus complet.',
        {
          debug: {
            stage: 'extract_input',
            ...debugBase,
            extractionError: error instanceof Error ? error.message : String(error),
          },
        }
      ) as JobOfferActionState;
    }

    if (!extracted.companyName || !extracted.jobTitle) {
      logError('job_offer_extract_incomplete', null, {
        ...debugBase,
        extractedCompanyName: extracted.companyName,
        extractedJobTitle: extracted.jobTitle,
        extractedCity: extracted.city,
        extractedSalaryMin: extracted.salaryMin,
        extractedSalaryMax: extracted.salaryMax,
      });
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Impossible d extraire assez d informations depuis cette offre. Essayez un texte plus complet.',
        {
          debug: {
            stage: 'extract_incomplete',
            ...debugBase,
            extracted,
          },
        }
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

    console.info('[job_offer_analysis_debug]', {
      ...debugBase,
      extracted: {
        companyName: extracted.companyName,
        jobTitle: extracted.jobTitle,
        city: extracted.city,
        salaryMin: extracted.salaryMin,
        salaryMax: extracted.salaryMax,
        payPeriod: extracted.payPeriod,
      },
      normalized: {
        companyName: normalizedInput.companyName,
        jobTitle: normalizedInput.jobTitle,
        city: normalizedInput.city,
        citySlug: normalizedInput.citySlug,
      },
      benchmarks: {
        businessId: benchmarks.businessId,
        primarySource: benchmarks.primarySource,
        primaryMedianMonthly: benchmarks.primaryMedianMonthly,
        sampleCount: benchmarks.sampleCount,
      },
      scores: {
        overall: computedAnalysis.overall_offer_score,
        compensation: computedAnalysis.compensation_score,
        marketAlignment: computedAnalysis.market_alignment_score,
        transparency: computedAnalysis.transparency_score,
        quality: computedAnalysis.quality_score,
      },
    });

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
      logError('submit_job_offer_offer_insert', offerError, { userId: user.id, ...debugBase });
      return createErrorResponse(
        ErrorCode.DATABASE_ERROR,
        'Erreur base de donnees lors de l enregistrement de l offre.',
        {
          debug: {
            stage: 'insert_offer',
            ...debugBase,
            offerError: offerError?.message || 'Unknown insert error',
          },
        }
      ) as JobOfferActionState;
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
      logError('submit_job_offer_analysis_insert', analysisError, { userId: user.id, jobOfferId: offerData.id, ...debugBase });
      return createErrorResponse(
        ErrorCode.DATABASE_ERROR,
        'Erreur base de donnees lors de l enregistrement de l analyse.',
        {
          debug: {
            stage: 'insert_analysis',
            ...debugBase,
            analysisError: analysisError?.message || 'Unknown analysis insert error',
            jobOfferId: offerData.id,
          },
        }
      ) as JobOfferActionState;
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
      'Erreur inattendue lors de l analyse de l offre.',
      {
        debug: {
          stage: 'unexpected',
          error: error instanceof Error ? error.message : String(error),
        },
      }
    ) as JobOfferActionState;
  }
}
