'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin';

const CONTRACT_TYPES = ['cdi', 'cdd', 'stage', 'freelance', 'alternance', 'autre'] as const;
const WORK_MODES = ['onsite', 'hybrid', 'remote'] as const;
const SENIORITY_LEVELS = ['junior', 'confirme', 'senior', 'lead', 'manager', 'autre'] as const;

const createOfferSchema = z.object({
  businessId: z.string().trim().min(1).optional(),
  companyName: z.string().trim().min(2).max(120),
  jobTitle: z.string().trim().min(2).max(120),
  city: z.string().trim().max(80).optional(),
  contractType: z.enum(CONTRACT_TYPES).optional(),
  workMode: z.enum(WORK_MODES).optional(),
  seniority: z.enum(SENIORITY_LEVELS).optional(),
  description: z.string().trim().min(40).max(3000),
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
  message: z.string().min(10),
  cvUrl: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
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

const sendReferralMessageSchema = z.object({
  requestId: z.string().uuid(),
  message: z.string().trim().min(2).max(2000),
});

export type ReferralEligibility = {
  is_eligible: boolean;
  is_email_verified: boolean;
  has_published_review: boolean;
  has_published_salary: boolean;
  reason: string;
};

const DEFAULT_ACTION_STATE: ActionState = { status: 'idle', message: '' };

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
      status: 'active',
    })
    .select('id')
    .single();

  if (error || !data) {
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

  const { error } = await supabase.from('job_referral_requests').insert({
    offer_id: parsed.data.offerId,
    candidate_user_id: user.id,
    message: parsed.data.message,
    cv_url: parsed.data.cvUrl || null,
    linkedin_url: parsed.data.linkedinUrl || null,
    status: 'pending',
  });

  if (error) {
    if (error.code === '23505') {
      return { status: 'error', message: 'Vous avez deja postule a cette offre.' };
    }
    return { status: 'error', message: "Impossible d'envoyer votre demande pour le moment." };
  }

  revalidatePath('/parrainages');
  revalidatePath(`/parrainages/${parsed.data.offerId}`);
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

  const { data, error } = await supabase
    .from('job_referral_offers')
    .update({ status: parsed.data.status })
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
  return { status: 'success', message: 'Statut demande mis a jour par admin.' };
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

export async function sendReferralMessageForm(formData: FormData): Promise<void> {
  await sendReferralMessage(DEFAULT_ACTION_STATE, formData);
}
