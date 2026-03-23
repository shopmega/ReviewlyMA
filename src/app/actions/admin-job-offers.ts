'use server';

import { revalidatePath } from 'next/cache';
import { resolveBusinessMatchForCompany } from '@/lib/job-offers/business-resolution';
import type { AdminJobOfferMappingRow } from '@/lib/types';
import { logAuditAction } from '@/lib/audit-logger';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin';

type MappingQueueRow = AdminJobOfferMappingRow & {
  candidate_businesses: Array<{
    businessId: string;
    name: string;
    score: number;
    reason: string;
  }>;
};

function normalizeCandidatePayload(value: unknown): Array<{ businessId: string; score: number; reason: string }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      if (typeof candidate.businessId !== 'string') return null;
      return {
        businessId: candidate.businessId,
        score: typeof candidate.score === 'number' ? candidate.score : 0,
        reason: typeof candidate.reason === 'string' ? candidate.reason : 'unknown',
      };
    })
    .filter((item): item is { businessId: string; score: number; reason: string } => item !== null);
}

export async function getAdminJobOfferMappingQueue(limit = 50): Promise<{
  rows: MappingQueueRow[];
  summary: {
    total: number;
    unresolved: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
}> {
  await verifyAdminSession();
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('admin_job_offer_mapping_v1')
    .select('*')
    .order('submitted_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    throw new Error(`Failed to load admin job-offer mapping queue: ${error?.message || 'unknown error'}`);
  }

  const rows = data as unknown as AdminJobOfferMappingRow[];
  const allCandidateIds = Array.from(new Set(
    rows.flatMap((row) => normalizeCandidatePayload(row.company_match_candidates).map((candidate) => candidate.businessId))
  ));

  const businessRows = allCandidateIds.length > 0
    ? (await supabase
        .from('businesses')
        .select('id, name')
        .in('id', allCandidateIds)).data || []
    : [];
  const businessNameMap = new Map((businessRows as Array<{ id: string; name: string | null }>).map((row) => [row.id, row.name || row.id]));

  const enriched = rows.map((row) => {
    const candidates = normalizeCandidatePayload(row.company_match_candidates);
    return {
      ...row,
      company_match_candidates: candidates,
      candidate_businesses: candidates.map((candidate) => ({
        businessId: candidate.businessId,
        name: businessNameMap.get(candidate.businessId) || candidate.businessId,
        score: candidate.score,
        reason: candidate.reason,
      })),
    };
  });

  return {
    rows: enriched,
    summary: {
      total: enriched.length,
      unresolved: enriched.filter((row) => !row.business_id).length,
      mediumConfidence: enriched.filter((row) => row.company_match_confidence === 'medium').length,
      lowConfidence: enriched.filter((row) => row.company_match_confidence === 'low' || row.company_match_confidence === 'none').length,
    },
  };
}

export async function relinkJobOfferBusiness(formData: FormData) {
  const adminId = await verifyAdminSession();
  const supabase = await createAdminClient();

  const jobOfferId = String(formData.get('job_offer_id') || '');
  const businessIdRaw = String(formData.get('business_id') || '').trim();
  const businessId = businessIdRaw || null;

  if (!jobOfferId) {
    throw new Error('Job offer id is required.');
  }

  const { data: currentRow, error: currentError } = await supabase
    .from('job_offers')
    .select('id, business_id, company_name')
    .eq('id', jobOfferId)
    .maybeSingle();

  if (currentError || !currentRow) {
    throw new Error(`Unable to load job offer before relink: ${currentError?.message || 'not found'}`);
  }

  const { error: updateError } = await supabase
    .from('job_offers')
    .update({
      business_id: businessId,
      company_match_confidence: businessId ? 'high' : 'none',
      company_match_method: businessId ? 'manual' : 'none',
    })
    .eq('id', jobOfferId);

  if (updateError) {
    throw new Error(`Unable to relink job offer: ${updateError.message}`);
  }

  await supabase
    .from('job_offer_moderation_events')
    .insert({
      job_offer_id: jobOfferId,
      admin_user_id: adminId,
      event_type: businessId ? 'business_relinked' : 'business_unlinked',
      metadata: {
        previous_business_id: currentRow.business_id,
        next_business_id: businessId,
        company_name: currentRow.company_name,
      },
    });

  await logAuditAction({
    adminId,
    action: 'JOB_OFFER_RELINKED',
    targetType: 'job_offer',
    targetId: jobOfferId,
    details: {
      previous_business_id: currentRow.business_id,
      next_business_id: businessId,
    },
  });

  revalidatePath('/admin/job-offers');
  revalidatePath('/admin/analytics');
}

export async function backfillJobOfferCompanyMatches(formData: FormData) {
  const adminId = await verifyAdminSession();
  const supabase = await createAdminClient();
  const rawLimit = Number(formData.get('limit') || 50);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(250, Math.round(rawLimit))) : 50;

  const { data, error } = await supabase
    .from('job_offers')
    .select('id, company_name, city, source_url, company_match_confidence, company_match_method')
    .is('business_id', null)
    .in('company_match_confidence', ['none', 'low', 'medium'])
    .order('submitted_at', { ascending: true })
    .limit(limit);

  if (error || !data) {
    throw new Error(`Unable to load job offers for backfill: ${error?.message || 'unknown error'}`);
  }

  const moderationEvents: Array<{
    job_offer_id: string;
    admin_user_id: string;
    event_type: string;
    metadata: Record<string, unknown>;
  }> = [];

  let reviewed = 0;
  let updated = 0;
  let linked = 0;

  for (const row of data as Array<{
    id: string;
    company_name: string;
    city: string | null;
    source_url: string | null;
    company_match_confidence: 'high' | 'medium' | 'low' | 'none';
    company_match_method: 'slug' | 'id' | 'name' | 'website' | 'scored' | 'manual' | 'none';
  }>) {
    reviewed += 1;

    const match = await resolveBusinessMatchForCompany(supabase as any, row.company_name, {
      sourceUrl: row.source_url,
      city: row.city,
    });
    const nextBusinessId = match.confidence === 'high' ? match.businessId : null;
    const nextMethod = nextBusinessId ? match.method : 'none';
    const nextCandidates = match.candidates;

    const { error: updateError } = await supabase
      .from('job_offers')
      .update({
        business_id: nextBusinessId,
        company_match_confidence: match.confidence,
        company_match_method: nextMethod,
        company_match_candidates: nextCandidates,
      })
      .eq('id', row.id);

    if (updateError) {
      throw new Error(`Unable to update job offer match diagnostics: ${updateError.message}`);
    }

    updated += 1;
    if (nextBusinessId) linked += 1;

    moderationEvents.push({
      job_offer_id: row.id,
      admin_user_id: adminId,
      event_type: nextBusinessId ? 'business_match_backfilled' : 'business_match_refreshed',
      metadata: {
        company_name: row.company_name,
        previous_confidence: row.company_match_confidence,
        next_confidence: match.confidence,
        previous_method: row.company_match_method,
        next_method: nextMethod,
        linked_business_id: nextBusinessId,
      },
    });
  }

  if (moderationEvents.length > 0) {
    const { error: eventError } = await supabase
      .from('job_offer_moderation_events')
      .insert(moderationEvents);

    if (eventError) {
      throw new Error(`Unable to record backfill moderation events: ${eventError.message}`);
    }
  }

  await logAuditAction({
    adminId,
    action: 'JOB_OFFER_MATCH_BACKFILL',
    targetType: 'job_offer',
    targetId: 'bulk',
    details: {
      reviewed,
      updated,
      linked,
      limit,
    },
  });

  revalidatePath('/admin/job-offers');
  revalidatePath('/admin/analytics');

  return {
    reviewed,
    updated,
    linked,
  };
}
