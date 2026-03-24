'use server';

import { revalidatePath } from 'next/cache';
import { checkRateLimit, RATE_LIMIT_CONFIG, recordAttempt } from '@/lib/rate-limiter-enhanced';
import { createClient } from '@/lib/supabase/server';
import type { ActionState, JobOfferRecord } from '@/lib/types';
import { jobOfferIngestionSchema } from '@/lib/types';
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCode,
  logError,
} from '@/lib/errors';
import {
  getJobOfferEmployerContext,
  getSimilarJobOfferAnalyses,
} from '@/lib/data/job-offers';
import { createJobOfferDecisionWorkspace } from '@/lib/job-offers/workspace';
import { normalizeJobOfferInput } from '@/lib/job-offers/normalization';
import { getJobOfferBenchmarks } from '@/lib/job-offers/benchmarks';
import { computeJobOfferAnalysis } from '@/lib/job-offers/scoring';
import { extractJobOfferInput } from '@/lib/job-offers/extraction';
import { getServerTranslator } from '@/lib/i18n/server';

export type JobOfferActionState = ActionState;

function summarizeText(value: string | undefined, max = 220) {
  if (!value) return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export async function submitJobOfferAnalysis(
  _prevState: JobOfferActionState,
  formData: FormData
): Promise<JobOfferActionState> {
  const { t, tf } = await getServerTranslator();
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResponse(
        ErrorCode.AUTHENTICATION_ERROR,
        t('jobOfferActions.authRequired', 'You must be logged in to analyze and save a job offer.')
      ) as JobOfferActionState;
    }

    const rateLimitKey = `job-offer-analysis-${user.id}`;
    const limitStatus = await checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIG.review);
    if (limitStatus.isLimited) {
      return createErrorResponse(
        ErrorCode.RATE_LIMIT_ERROR,
        tf('jobOfferActions.rateLimited', 'Too many attempts. Try again in {minutes} minutes.', {
          minutes: Math.ceil(limitStatus.retryAfterSeconds / 60),
        })
      ) as JobOfferActionState;
    }
    await recordAttempt(rateLimitKey, RATE_LIMIT_CONFIG.review);

    const rawSourceType = getFormString(formData, 'sourceType');
    const rawSourceUrl = getFormString(formData, 'sourceUrl');
    const rawSourceText = getFormString(formData, 'sourceText');

    const parsed = jobOfferIngestionSchema.safeParse({
      sourceType: rawSourceType || undefined,
      sourceUrl: rawSourceUrl,
      sourceText: rawSourceText,
    });

    if (!parsed.success) {
      logError('job_offer_ingestion_validation', parsed.error, {
        sourceType: rawSourceType || null,
        sourceUrl: rawSourceUrl || null,
        sourceTextLength: rawSourceText.length,
      });
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        t('jobOfferActions.validationFailed', 'Please correct the extraction errors.'),
        {
          fieldErrors: parsed.error.flatten().fieldErrors,
          debug: {
            stage: 'validate_ingestion',
            sourceType: rawSourceType || null,
            sourceUrl: rawSourceUrl || null,
            sourceTextLength: rawSourceText.length,
            fieldErrors: parsed.error.flatten().fieldErrors,
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

    let extraction;
    try {
      extraction = await extractJobOfferInput({
        sourceType: effectiveSourceType,
        sourceUrl: parsed.data.sourceUrl || '',
        sourceText: parsed.data.sourceText || '',
      });
    } catch (error) {
      logError('job_offer_extract_input', error, { sourceType: effectiveSourceType });
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        effectiveSourceType === 'url'
          ? t('jobOfferActions.extractUrlFailed', 'Unable to read this link right now. Paste the job text directly instead.')
          : t('jobOfferActions.extractTextFailed', 'Unable to read this offer correctly. Try again with more complete text.'),
        {
          debug: {
            stage: 'extract_input',
            ...debugBase,
            extractionError: error instanceof Error ? error.message : String(error),
          },
        }
      ) as JobOfferActionState;
    }

    const { extracted, diagnostics } = extraction;

    if (!diagnostics.minimumFieldsMet) {
      logError('job_offer_extract_incomplete', null, {
        ...debugBase,
        diagnostics,
      });
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        t('jobOfferActions.notEnoughInfo', 'Unable to extract enough information from this offer. Try again with more complete text.'),
        {
          debug: {
            stage: 'extract_incomplete',
            ...debugBase,
            extracted,
            diagnostics,
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
      sourceText: extracted.cleanedContent,
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
      extractionDiagnostics: diagnostics,
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
      company_match_confidence: benchmarks.companyMatch.confidence,
      company_match_method: benchmarks.companyMatch.method,
      company_match_candidates: benchmarks.companyMatch.candidates,
      status: 'pending' as const,
      visibility: 'private' as const,
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
        t('jobOfferActions.offerSaveError', 'A database error occurred while saving the offer.'),
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
        t('jobOfferActions.analysisSaveError', 'A database error occurred while saving the analysis.'),
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

    const [employerContext, similarOffers] = await Promise.all([
      getJobOfferEmployerContext({
        business_id: benchmarks.businessId,
        company_match_confidence: benchmarks.companyMatch.confidence,
        company_name: normalizedInput.companyName,
      }),
      getSimilarJobOfferAnalyses({
        currentOfferId: offerData.id,
        jobTitleNormalized: normalizedInput.jobTitleNormalized,
        jobTitle: normalizedInput.jobTitle,
        citySlug: normalizedInput.citySlug,
        seniorityLevel: normalizedInput.seniorityLevel,
        workModel: normalizedInput.workModel,
        contractType: normalizedInput.contractType,
        limit: 4,
      }),
    ]);

    const savedOffer: JobOfferRecord = {
      id: offerData.id,
      ...offerRow,
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const workspace = createJobOfferDecisionWorkspace({
      analysis: computedAnalysis,
      offer: savedOffer,
      extractedOffer: {
        companyName: extracted.companyName,
        jobTitle: extracted.jobTitle,
        city: extracted.city,
        salaryMin: extracted.salaryMin,
        salaryMax: extracted.salaryMax,
        payPeriod: extracted.payPeriod,
        contractType: extracted.contractType,
        workModel: extracted.workModel,
        seniorityLevel: extracted.seniorityLevel,
        yearsExperienceRequired: extracted.yearsExperienceRequired,
        benefits: extracted.benefits,
        sourceSummary: extracted.sourceSummary,
      },
      extractionDiagnostics: diagnostics,
      employerContext,
      similarOffers,
    });

    revalidatePath('/job-offers');
    revalidatePath('/job-offers/history');
    revalidatePath(`/job-offers/${analysisData.id}`);

    return createSuccessResponse(
      t('jobOfferActions.success', 'Analysis saved successfully.'),
      {
        analysisId: analysisData.id,
        offerId: offerData.id,
        extractedOffer: extracted,
        extractionDiagnostics: diagnostics,
        analysis: computedAnalysis,
        employerContext,
        similarOffers,
        workspace,
      }
    ) as JobOfferActionState;
  } catch (error) {
    logError('submit_job_offer_analysis_unexpected', error);
    return createErrorResponse(
      ErrorCode.SERVER_ERROR,
      t('jobOfferActions.unexpectedError', 'An unexpected error occurred while analyzing the offer.'),
      {
        debug: {
          stage: 'unexpected',
          error: error instanceof Error ? error.message : String(error),
        },
      }
    ) as JobOfferActionState;
  }
}
