'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin';
import { RATE_LIMIT_CONFIG, checkRateLimit, recordAttempt } from '@/lib/rate-limiter';
import { notifyAdmins } from '@/lib/notifications';

const CONTRACT_TYPES = ['cdi', 'cdd', 'stage', 'freelance', 'alternance', 'autre'] as const;
const WORK_MODES = ['onsite', 'hybrid', 'remote'] as const;
const SENIORITY_LEVELS = ['junior', 'confirme', 'senior', 'lead', 'manager', 'autre'] as const;
const REPORT_REASONS = ['scam', 'impersonation', 'spam', 'off_platform', 'payment_request', 'other'] as const;
const MAX_LINKEDIN_URL_LENGTH = 250;
const MAX_CV_URL_LENGTH = 350;

const BANNED_KEYWORD_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  { regex: /\b(?:pay|payment|payer|paiement|frais|fee|fees)\b/i, reason: 'Aucun paiement ne doit etre demande.' },
  { regex: /\b(?:whatsapp|telegram)\b/i, reason: 'Utilisez la messagerie interne, pas de canal externe obligatoire.' },
  { regex: /\b(?:btc|bitcoin|usdt|crypto)\b/i, reason: 'Les references de paiement crypto sont interdites.' },
  { regex: /\b(?:western\s*union|moneygram)\b/i, reason: 'Les demandes de transfert d argent sont interdites.' },
];

const DIRECT_CONTACT_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  { regex: /\+?\d[\d\s().-]{7,}\d/g, reason: 'Les numeros de telephone doivent rester prives.' },
  { regex: /@[A-Za-z0-9._%+-]+\.[A-Za-z]{2,}/g, reason: 'Ne publiez pas d email direct dans le contenu.' },
];

const DESCRIPTION_INTEGRITY_TOKENS = [
  'user_id',
  'candidate_id',
  'status (',
  'referral_requests',
  'referral_messages',
  'sender_id',
];

const createOfferSchema = z.object({
  businessId: z.string().trim().min(1).optional(),
  companyName: z.string().trim().min(2).max(120),
  jobTitle: z.string().trim().min(2).max(120),
  city: z.string().trim().max(80).optional(),
  contractType: z.enum(CONTRACT_TYPES).optional(),
  workMode: z.enum(WORK_MODES).optional(),
  seniority: z.enum(SENIORITY_LEVELS).optional(),
  description: z.string().trim().min(80).max(3000),
  requirements: z.string().trim().max(2000).optional(),
  slots: z.coerce.number().int().min(1).max(10).default(1),
  expiresAt: z.string().trim().optional(),
}).superRefine((value, ctx) => {
  if (!value.expiresAt) return;
  const date = new Date(value.expiresAt);
  if (Number.isNaN(date.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expiresAt'],
      message: 'Date d expiration invalide.',
    });
    return;
  }
  const min = Date.now() + 30 * 60 * 1000;
  if (date.getTime() < min) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expiresAt'],
      message: "L expiration doit etre dans le futur.",
    });
  }
});

const requestReferralSchema = z.object({
  offerId: z.string().uuid(),
  message: z.string().trim().min(40).max(1200),
  cvUrl: z.string().url().max(MAX_CV_URL_LENGTH).optional().or(z.literal('')),
  linkedinUrl: z.string().url().max(MAX_LINKEDIN_URL_LENGTH).optional().or(z.literal('')),
});

const updateOfferStatusSchema = z.object({
  offerId: z.string().uuid(),
  status: z.enum(['active', 'paused', 'closed']),
});

const updateRequestStatusSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(['in_review', 'referred', 'interview', 'hired', 'rejected', 'withdrawn']),
});

const adminUpdateOfferSchema = z.object({
  offerId: z.string().uuid(),
  status: z.enum(['active', 'paused', 'closed', 'rejected']),
});

const adminUpdateRequestSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(['pending', 'in_review', 'referred', 'interview', 'hired', 'rejected', 'withdrawn']),
});

const adminUpdateReportSchema = z.object({
  reportId: z.coerce.number().int().positive(),
  status: z.enum(['open', 'investigating', 'resolved', 'dismissed']),
  moderationNote: z.string().trim().max(2000).optional(),
});

const sendReferralMessageSchema = z.object({
  requestId: z.string().uuid(),
  message: z.string().trim().min(2).max(2000),
});

const reportOfferSchema = z.object({
  offerId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1500).optional(),
});

const blockUserSchema = z.object({
  offerId: z.string().uuid(),
  blockedUserId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

export type ReferralEligibility = {
  is_eligible: boolean;
  is_email_verified: boolean;
  has_published_review: boolean;
  has_published_salary: boolean;
  reason: string;
};

const DEFAULT_ACTION_STATE: ActionState = { status: 'idle', message: '' };
const REFERRAL_REQUEST_SLA_HOURS = 72;

const normalizeContent = (value: string | undefined | null): string => (value || '').replace(/\s+/g, ' ').trim();

function detectUnsafeReferralContent(value: string | undefined): string | null {
  const content = normalizeContent(value);
  if (!content) return null;

  for (const rule of BANNED_KEYWORD_PATTERNS) {
    if (rule.regex.test(content)) {
      return rule.reason;
    }
  }
  for (const rule of DIRECT_CONTACT_PATTERNS) {
    if (rule.regex.test(content)) {
      return rule.reason;
    }
  }
  return null;
}

function failsDescriptionIntegrity(value: string): boolean {
  const lower = value.toLowerCase();
  const hitCount = DESCRIPTION_INTEGRITY_TOKENS.reduce((acc, token) => acc + (lower.includes(token) ? 1 : 0), 0);
  return hitCount >= 3;
}

function normalizePublicUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    if (!['https:', 'http:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function validateRequestLinks(cvUrl: string | undefined, linkedinUrl: string | undefined): string | null {
  const normalizedCv = normalizePublicUrl(cvUrl || '');
  const normalizedLinkedin = normalizePublicUrl(linkedinUrl || '');

  if (cvUrl && !normalizedCv) return 'Lien CV invalide.';
  if (linkedinUrl && !normalizedLinkedin) return 'Lien LinkedIn invalide.';

  const cvHost = normalizedCv ? new URL(normalizedCv).hostname.toLowerCase() : '';
  const linkedinHost = normalizedLinkedin ? new URL(normalizedLinkedin).hostname.toLowerCase() : '';

  if (cvHost.includes('bit.ly') || cvHost.includes('tinyurl') || cvHost.includes('t.co')) {
    return 'Les URL raccourcies sont interdites pour le CV.';
  }
  if (linkedinUrl && !linkedinHost.includes('linkedin.com')) {
    return 'Le lien LinkedIn doit pointer vers linkedin.com.';
  }
  return null;
}

async function notifyUser(userId: string, title: string, message: string, link?: string): Promise<void> {
  try {
    const admin = await createAdminClient();
    await admin.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type: 'referral',
      link: link || null,
      is_read: false,
    });
  } catch {
    // no-op
  }
}

async function recomputeOfferMetrics(offerId: string): Promise<void> {
  const admin = await createAdminClient();
  const { data: offer } = await admin
    .from('job_referral_offers')
    .select('id, verification_status')
    .eq('id', offerId)
    .maybeSingle();
  if (!offer) return;

  const { data: requests } = await admin
    .from('job_referral_requests')
    .select('status, created_at, updated_at')
    .eq('offer_id', offerId);

  const items = requests || [];
  const total = items.length;
  const responded = items.filter((r) => r.status !== 'pending');
  const responseRate = total > 0 ? Number(((responded.length / total) * 100).toFixed(2)) : 0;
  const successfulReferrals = items.filter((r) => r.status === 'hired').length;

  const responseHours = responded
    .map((r) => {
      const createdAt = new Date(r.created_at).getTime();
      const updatedAt = new Date(r.updated_at).getTime();
      if (Number.isNaN(createdAt) || Number.isNaN(updatedAt) || updatedAt <= createdAt) return null;
      return (updatedAt - createdAt) / (1000 * 60 * 60);
    })
    .filter((v): v is number => v !== null);

  const responseHoursAvg = responseHours.length > 0
    ? Math.max(1, Math.round(responseHours.reduce((acc, v) => acc + v, 0) / responseHours.length))
    : null;

  const verificationBonus = offer.verification_status === 'verified' ? 20 : 0;
  const score = Math.max(
    0,
    Math.min(100, Math.round(35 + verificationBonus + responseRate * 0.35 + successfulReferrals * 3))
  );

  await admin
    .from('job_referral_offers')
    .update({
      response_rate: responseRate,
      response_hours_avg: responseHoursAvg,
      successful_referrals: successfulReferrals,
      trust_score: score,
    })
    .eq('id', offerId);
}

export async function getReferralEligibility(): Promise<ReferralEligibility | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data, error } = await supabase.rpc('can_user_publish_referral_offer', { p_user_id: user.id });
  if (error || !data || data.length === 0) return null;
  return data[0] as ReferralEligibility;
}

export async function createReferralOffer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth.user;
  if (authError || !user) {
    return { status: 'error', message: 'Vous devez etre connecte pour publier une offre de parrainage.' };
  }

  const raw = {
    businessId: String(formData.get('businessId') || '').trim() || undefined,
    companyName: String(formData.get('companyName') || '').trim(),
    jobTitle: String(formData.get('jobTitle') || '').trim(),
    city: String(formData.get('city') || '').trim() || undefined,
    contractType: String(formData.get('contractType') || '').trim() || undefined,
    workMode: String(formData.get('workMode') || '').trim() || undefined,
    seniority: String(formData.get('seniority') || '').trim() || undefined,
    description: String(formData.get('description') || '').trim(),
    requirements: String(formData.get('requirements') || '').trim() || undefined,
    slots: formData.get('slots') || '1',
    expiresAt: String(formData.get('expiresAt') || '').trim() || undefined,
  };

  const parsed = createOfferSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Veuillez verifier les champs du formulaire.',
      errors: parsed.error.flatten().fieldErrors as ActionState['errors'],
    };
  }

  const limitKey = `referrals:create-offer:${user.id}`;
  const limitCheck = checkRateLimit(limitKey, RATE_LIMIT_CONFIG.review);
  if (limitCheck.isLimited) {
    return {
      status: 'error',
      message: `Trop de publications en peu de temps. Reessayez dans ${Math.ceil(limitCheck.retryAfterSeconds / 60)} minute(s).`,
    };
  }

  const riskFields = [raw.companyName, raw.jobTitle, raw.description, raw.requirements];
  for (const field of riskFields) {
    const issue = detectUnsafeReferralContent(field);
    if (issue) {
      recordAttempt(limitKey, RATE_LIMIT_CONFIG.review);
      return { status: 'error', message: issue };
    }
  }

  if (failsDescriptionIntegrity(raw.description)) {
    recordAttempt(limitKey, RATE_LIMIT_CONFIG.review);
    return {
      status: 'error',
      message: "La description ressemble a du contenu technique brut. Merci d'ajouter une description humaine du poste.",
    };
  }

  const eligibility = await getReferralEligibility();
  if (!eligibility?.is_eligible) {
    return {
      status: 'error',
      message: "Vous devez verifier votre email et publier au moins un avis ou un salaire avant de publier une offre.",
    };
  }

  const payload = parsed.data;
  let resolvedCompanyName = payload.companyName;
  let resolvedCity = payload.city || null;
  let resolvedBusinessId = payload.businessId || null;

  if (payload.businessId) {
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, city, status')
      .eq('id', payload.businessId)
      .single();

    if (businessError || !business || business.status === 'deleted') {
      return {
        status: 'error',
        message: 'Entreprise invalide. Selectionnez une entreprise existante.',
        errors: { businessId: ['Entreprise invalide.'] },
      };
    }

    resolvedBusinessId = business.id;
    resolvedCompanyName = business.name;
    resolvedCity = business.city || resolvedCity;
  }

  const { data, error } = await supabase
    .from('job_referral_offers')
    .insert({
      user_id: user.id,
      business_id: resolvedBusinessId,
      company_name: resolvedCompanyName,
      job_title: payload.jobTitle,
      city: resolvedCity,
      contract_type: payload.contractType || null,
      work_mode: payload.workMode || null,
      seniority: payload.seniority || null,
      description: payload.description,
      requirements: payload.requirements || null,
      slots: payload.slots,
      expires_at: payload.expiresAt || null,
      identity_level: resolvedBusinessId ? 'verified_employee' : 'anonymous',
      verification_status: resolvedBusinessId ? 'verified' : 'unverified',
      trust_score: resolvedBusinessId ? 70 : 40,
      status: 'active',
    })
    .select('id')
    .single();

  if (error || !data) {
    recordAttempt(limitKey, RATE_LIMIT_CONFIG.review);
    return { status: 'error', message: "Impossible de publier l'offre pour le moment." };
  }

  revalidatePath('/parrainages');
  revalidatePath('/parrainages/new');
  return { status: 'success', message: 'Offre publiee avec succes.', data: { id: data.id } };
}

export async function requestReferral(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth.user;
  if (authError || !user) {
    return { status: 'error', message: 'Vous devez etre connecte pour demander un parrainage.' };
  }

  const parsed = requestReferralSchema.safeParse({
    offerId: String(formData.get('offerId') || ''),
    message: String(formData.get('message') || '').trim(),
    cvUrl: String(formData.get('cvUrl') || '').trim(),
    linkedinUrl: String(formData.get('linkedinUrl') || '').trim(),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Veuillez verifier votre demande.',
      errors: parsed.error.flatten().fieldErrors as ActionState['errors'],
    };
  }

  const limitKey = `referrals:request:${user.id}`;
  const limitCheck = checkRateLimit(limitKey, RATE_LIMIT_CONFIG.report);
  if (limitCheck.isLimited) {
    return {
      status: 'error',
      message: `Vous avez envoye trop de demandes. Reessayez dans ${Math.ceil(limitCheck.retryAfterSeconds / 60)} minute(s).`,
    };
  }

  const contentIssue = detectUnsafeReferralContent(parsed.data.message);
  if (contentIssue) {
    recordAttempt(limitKey, RATE_LIMIT_CONFIG.report);
    return { status: 'error', message: contentIssue };
  }

  const linksIssue = validateRequestLinks(parsed.data.cvUrl || undefined, parsed.data.linkedinUrl || undefined);
  if (linksIssue) {
    recordAttempt(limitKey, RATE_LIMIT_CONFIG.report);
    return { status: 'error', message: linksIssue };
  }

  const { data: offer, error: offerError } = await supabase
    .from('job_referral_offers')
    .select('id, user_id, status')
    .eq('id', parsed.data.offerId)
    .single();

  if (offerError || !offer || offer.status !== 'active') {
    return { status: 'error', message: "Cette offre n'est plus disponible." };
  }

  if (offer.user_id === user.id) {
    return { status: 'error', message: 'Vous ne pouvez pas demander votre propre offre.' };
  }

  const { data: blockedByOwner } = await supabase
    .from('job_referral_user_blocks')
    .select('id')
    .eq('blocker_user_id', offer.user_id)
    .eq('blocked_user_id', user.id)
    .maybeSingle();

  if (blockedByOwner) {
    return { status: 'error', message: "Vous ne pouvez plus contacter cet auteur d'offre." };
  }

  const { data: blockedOwner } = await supabase
    .from('job_referral_user_blocks')
    .select('id')
    .eq('blocker_user_id', user.id)
    .eq('blocked_user_id', offer.user_id)
    .maybeSingle();

  if (blockedOwner) {
    return { status: 'error', message: "Debloquez d'abord cet utilisateur pour envoyer une demande." };
  }

  const { error } = await supabase.from('job_referral_requests').insert({
    offer_id: parsed.data.offerId,
    candidate_user_id: user.id,
    message: parsed.data.message,
    cv_url: parsed.data.cvUrl || null,
    linkedin_url: parsed.data.linkedinUrl || null,
    response_due_at: new Date(Date.now() + REFERRAL_REQUEST_SLA_HOURS * 60 * 60 * 1000).toISOString(),
    status: 'pending',
  });

  if (error) {
    recordAttempt(limitKey, RATE_LIMIT_CONFIG.report);
    if (error.code === '23505') {
      return { status: 'error', message: 'Vous avez deja postule a cette offre.' };
    }
    return { status: 'error', message: "Impossible d'envoyer votre demande pour le moment." };
  }

  revalidatePath('/parrainages');
  revalidatePath(`/parrainages/${parsed.data.offerId}`);
  await recomputeOfferMetrics(parsed.data.offerId);
  await notifyUser(offer.user_id, 'Nouvelle demande de parrainage', 'Un candidat a envoye une demande sur votre offre.', `/parrainages/${parsed.data.offerId}`);
  return { status: 'success', message: 'Votre demande de parrainage a ete envoyee.' };
}

export async function updateMyReferralOfferStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return { status: 'error', message: 'Vous devez etre connecte.' };
  }

  const parsed = updateOfferStatusSchema.safeParse({
    offerId: String(formData.get('offerId') || ''),
    status: String(formData.get('status') || ''),
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Donnees invalides.' };
  }

  const isClosing = parsed.data.status === 'closed';
  const { data, error } = await supabase
    .from('job_referral_offers')
    .update({ status: parsed.data.status, closed_by_owner_at: isClosing ? new Date().toISOString() : null })
    .eq('id', parsed.data.offerId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    return { status: 'error', message: "Impossible de mettre a jour le statut de l'offre." };
  }
  if (!data) {
    return { status: 'error', message: 'Offre introuvable ou acces refuse.' };
  }

  revalidatePath('/parrainages');
  revalidatePath('/parrainages/mes-offres');
  revalidatePath(`/parrainages/${parsed.data.offerId}`);
  return { status: 'success', message: 'Statut de l offre mis a jour.' };
}

export async function retractReferralOffer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return { status: 'error', message: 'Vous devez etre connecte.' };
  }

  const offerId = String(formData.get('offerId') || '');
  if (!offerId) {
    return { status: 'error', message: 'Offre invalide.' };
  }

  const { error } = await supabase
    .from('job_referral_offers')
    .update({
      status: 'closed',
      closed_by_owner_at: new Date().toISOString(),
      moderation_reason: 'retracted_by_owner',
    })
    .eq('id', offerId)
    .eq('user_id', user.id);

  if (error) {
    return { status: 'error', message: "Impossible de retirer l'offre pour le moment." };
  }

  revalidatePath('/parrainages');
  revalidatePath('/parrainages/mes-offres');
  revalidatePath(`/parrainages/${offerId}`);
  return { status: 'success', message: "L'offre a ete retiree." };
}

export async function reportReferralOffer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return { status: 'error', message: 'Vous devez etre connecte pour signaler une offre.' };
  }

  const parsed = reportOfferSchema.safeParse({
    offerId: String(formData.get('offerId') || ''),
    reason: String(formData.get('reason') || ''),
    details: String(formData.get('details') || '').trim() || undefined,
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Signalement invalide.' };
  }

  const limitKey = `referrals:report:${user.id}`;
  const limitCheck = checkRateLimit(limitKey, RATE_LIMIT_CONFIG.report);
  if (limitCheck.isLimited) {
    return { status: 'error', message: "Vous avez atteint la limite de signalements. Reessayez plus tard." };
  }

  const { error } = await supabase
    .from('job_referral_offer_reports')
    .insert({
      offer_id: parsed.data.offerId,
      reporter_user_id: user.id,
      reason: parsed.data.reason,
      details: parsed.data.details || null,
    });

  if (error) {
    recordAttempt(limitKey, RATE_LIMIT_CONFIG.report);
    if (error.code === '23505') {
      return { status: 'error', message: 'Vous avez deja signale cette offre.' };
    }
    return { status: 'error', message: 'Impossible de soumettre le signalement.' };
  }

  revalidatePath('/parrainages');
  revalidatePath(`/parrainages/${parsed.data.offerId}`);
  await notifyAdmins({
    title: 'Nouveau signalement parrainage',
    message: `Offre ${parsed.data.offerId.slice(0, 8)} signalee pour: ${parsed.data.reason}`,
    type: 'referral_report',
    link: '/admin/parrainages',
  });
  return { status: 'success', message: 'Signalement envoye. Merci pour votre vigilance.' };
}

export async function blockReferralUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return { status: 'error', message: 'Vous devez etre connecte.' };
  }

  const parsed = blockUserSchema.safeParse({
    offerId: String(formData.get('offerId') || ''),
    blockedUserId: String(formData.get('blockedUserId') || ''),
    reason: String(formData.get('reason') || '').trim() || undefined,
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Blocage invalide.' };
  }

  const { data: offer, error: offerError } = await supabase
    .from('job_referral_offers')
    .select('id, user_id')
    .eq('id', parsed.data.offerId)
    .maybeSingle();

  if (offerError || !offer) {
    return { status: 'error', message: 'Offre introuvable.' };
  }

  // Candidate can block offer owner. Offer owner can block candidate by passing candidate id.
  const canBlockOwner = parsed.data.blockedUserId === offer.user_id && user.id !== offer.user_id;
  const canBlockCandidate = user.id === offer.user_id && parsed.data.blockedUserId !== user.id;

  if (!canBlockOwner && !canBlockCandidate) {
    return { status: 'error', message: 'Action non autorisee.' };
  }

  const { error } = await supabase
    .from('job_referral_user_blocks')
    .upsert(
      {
        blocker_user_id: user.id,
        blocked_user_id: parsed.data.blockedUserId,
        reason: parsed.data.reason || null,
      },
      { onConflict: 'blocker_user_id,blocked_user_id' }
    );

  if (error) {
    return { status: 'error', message: 'Impossible de bloquer cet utilisateur.' };
  }

  revalidatePath('/parrainages/mes-demandes');
  revalidatePath('/parrainages/mes-offres');
  revalidatePath(`/parrainages/${parsed.data.offerId}`);
  return { status: 'success', message: 'Utilisateur bloque.' };
}

export async function updateReferralRequestStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return { status: 'error', message: 'Vous devez etre connecte.' };
  }

  const parsed = updateRequestStatusSchema.safeParse({
    requestId: String(formData.get('requestId') || ''),
    status: String(formData.get('status') || ''),
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Donnees invalides.' };
  }

  const { data: request, error: requestError } = await supabase
    .from('job_referral_requests')
    .select('id, offer_id, candidate_user_id')
    .eq('id', parsed.data.requestId)
    .single();

  if (requestError || !request) {
    return { status: 'error', message: 'Demande introuvable.' };
  }

  const { data: offer } = await supabase
    .from('job_referral_offers')
    .select('id, user_id')
    .eq('id', request.offer_id)
    .single();

  const isOwner = offer?.user_id === user.id;
  const isCandidate = request.candidate_user_id === user.id;

  if (!isOwner && !isCandidate) {
    return { status: 'error', message: 'Non autorise.' };
  }

  if (isCandidate && parsed.data.status !== 'withdrawn') {
    return { status: 'error', message: 'Un candidat ne peut que retirer sa demande.' };
  }

  if (isOwner && parsed.data.status === 'withdrawn') {
    return { status: 'error', message: 'Le retrait doit etre fait par le candidat.' };
  }

  const { error } = await supabase
    .from('job_referral_requests')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.requestId);

  if (error) {
    return { status: 'error', message: 'Impossible de mettre a jour la demande.' };
  }

  revalidatePath('/parrainages/mes-offres');
  revalidatePath('/parrainages/mes-demandes');
  revalidatePath(`/parrainages/${request.offer_id}`);
  await recomputeOfferMetrics(request.offer_id);
  if (isOwner) {
    await notifyUser(request.candidate_user_id, 'Mise a jour de votre demande', `Le statut de votre demande est maintenant: ${parsed.data.status}.`, '/parrainages/mes-demandes');
  }
  if (isCandidate && parsed.data.status === 'withdrawn' && offer?.user_id) {
    await notifyUser(offer.user_id, 'Demande retiree', 'Un candidat a retire sa demande de parrainage.', `/parrainages/${request.offer_id}`);
  }
  return { status: 'success', message: 'Statut de la demande mis a jour.' };
}

export async function adminUpdateReferralOfferStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await verifyAdminSession();
  } catch (_error) {
    return { status: 'error', message: 'Acces admin requis.' };
  }

  const parsed = adminUpdateOfferSchema.safeParse({
    offerId: String(formData.get('offerId') || ''),
    status: String(formData.get('status') || ''),
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Donnees invalides.' };
  }

  const admin = await createAdminClient();
  const { error } = await admin
    .from('job_referral_offers')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.offerId);

  if (error) {
    return { status: 'error', message: 'Mise a jour admin impossible.' };
  }

  revalidatePath('/admin/parrainages');
  revalidatePath('/parrainages');
  revalidatePath(`/parrainages/${parsed.data.offerId}`);
  return { status: 'success', message: 'Statut offre mis a jour par admin.' };
}

export async function adminUpdateReferralRequestStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await verifyAdminSession();
  } catch (_error) {
    return { status: 'error', message: 'Acces admin requis.' };
  }

  const parsed = adminUpdateRequestSchema.safeParse({
    requestId: String(formData.get('requestId') || ''),
    status: String(formData.get('status') || ''),
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Donnees invalides.' };
  }

  const admin = await createAdminClient();
  const { data: request, error: requestError } = await admin
    .from('job_referral_requests')
    .select('id, offer_id')
    .eq('id', parsed.data.requestId)
    .maybeSingle();

  if (requestError || !request) {
    return { status: 'error', message: 'Demande introuvable.' };
  }

  const { error } = await admin
    .from('job_referral_requests')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.requestId);

  if (error) {
    return { status: 'error', message: 'Mise a jour admin impossible.' };
  }

  revalidatePath('/admin/parrainages');
  revalidatePath('/parrainages/mes-offres');
  revalidatePath('/parrainages/mes-demandes');
  revalidatePath(`/parrainages/${request.offer_id}`);
  await recomputeOfferMetrics(request.offer_id);
  return { status: 'success', message: 'Statut demande mis a jour par admin.' };
}

export async function adminUpdateReferralReportStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await verifyAdminSession();
  } catch (_error) {
    return { status: 'error', message: 'Acces admin requis.' };
  }

  const parsed = adminUpdateReportSchema.safeParse({
    reportId: formData.get('reportId'),
    status: String(formData.get('status') || ''),
    moderationNote: String(formData.get('moderationNote') || '').trim() || undefined,
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Donnees invalides.' };
  }

  const admin = await createAdminClient();
  const { data: report, error: reportError } = await admin
    .from('job_referral_offer_reports')
    .select('id, offer_id, reporter_user_id')
    .eq('id', parsed.data.reportId)
    .maybeSingle();

  if (reportError || !report) {
    return { status: 'error', message: 'Signalement introuvable.' };
  }

  const { data: authUser } = await admin.auth.getUser();
  const reviewerId = authUser.user?.id || null;

  const { error } = await admin
    .from('job_referral_offer_reports')
    .update({
      status: parsed.data.status,
      moderation_note: parsed.data.moderationNote || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq('id', parsed.data.reportId);

  if (error) {
    return { status: 'error', message: 'Impossible de mettre a jour le signalement.' };
  }

  if (['resolved', 'dismissed'].includes(parsed.data.status)) {
    await notifyUser(
      report.reporter_user_id,
      'Mise a jour de votre signalement',
      `Votre signalement #${report.id} est maintenant: ${parsed.data.status}.`,
      `/parrainages/${report.offer_id}`
    );
  }

  revalidatePath('/admin/parrainages');
  return { status: 'success', message: 'Signalement mis a jour.' };
}

export async function sendReferralMessage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return { status: 'error', message: 'Vous devez etre connecte.' };
  }

  const parsed = sendReferralMessageSchema.safeParse({
    requestId: String(formData.get('requestId') || ''),
    message: String(formData.get('message') || '').trim(),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Message invalide.',
      errors: parsed.error.flatten().fieldErrors as ActionState['errors'],
    };
  }

  const { data: request, error: requestError } = await supabase
    .from('job_referral_requests')
    .select('id, offer_id, candidate_user_id')
    .eq('id', parsed.data.requestId)
    .maybeSingle();

  if (requestError || !request) {
    return { status: 'error', message: 'Demande introuvable.' };
  }

  const { data: offer } = await supabase
    .from('job_referral_offers')
    .select('id, user_id')
    .eq('id', request.offer_id)
    .maybeSingle();

  const isCandidate = request.candidate_user_id === user.id;
  const isOwner = offer?.user_id === user.id;
  if (!isCandidate && !isOwner) {
    return { status: 'error', message: 'Non autorise.' };
  }

  const { error } = await supabase.from('job_referral_messages').insert({
    request_id: request.id,
    sender_user_id: user.id,
    message: parsed.data.message,
  });

  if (error) {
    return { status: 'error', message: "Impossible d'envoyer le message." };
  }

  revalidatePath('/parrainages/mes-offres');
  revalidatePath('/parrainages/mes-demandes');
  return { status: 'success', message: 'Message envoye.' };
}

export async function updateMyReferralOfferStatusForm(formData: FormData): Promise<void> {
  await updateMyReferralOfferStatus(DEFAULT_ACTION_STATE, formData);
}

export async function updateReferralRequestStatusForm(formData: FormData): Promise<void> {
  await updateReferralRequestStatus(DEFAULT_ACTION_STATE, formData);
}

export async function adminUpdateReferralOfferStatusForm(formData: FormData): Promise<void> {
  await adminUpdateReferralOfferStatus(DEFAULT_ACTION_STATE, formData);
}

export async function adminUpdateReferralRequestStatusForm(formData: FormData): Promise<void> {
  await adminUpdateReferralRequestStatus(DEFAULT_ACTION_STATE, formData);
}

export async function adminUpdateReferralReportStatusForm(formData: FormData): Promise<void> {
  await adminUpdateReferralReportStatus(DEFAULT_ACTION_STATE, formData);
}

export async function sendReferralMessageForm(formData: FormData): Promise<void> {
  await sendReferralMessage(DEFAULT_ACTION_STATE, formData);
}

export async function reportReferralOfferForm(formData: FormData): Promise<void> {
  await reportReferralOffer(DEFAULT_ACTION_STATE, formData);
}

export async function blockReferralUserForm(formData: FormData): Promise<void> {
  await blockReferralUser(DEFAULT_ACTION_STATE, formData);
}

export async function retractReferralOfferForm(formData: FormData): Promise<void> {
  await retractReferralOffer(DEFAULT_ACTION_STATE, formData);
}
