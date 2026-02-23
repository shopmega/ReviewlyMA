'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

const createOfferSchema = z.object({
  businessId: z.string().optional(),
  companyName: z.string().min(2),
  jobTitle: z.string().min(2),
  city: z.string().optional(),
  contractType: z.string().optional(),
  workMode: z.string().optional(),
  seniority: z.string().optional(),
  description: z.string().min(20),
  requirements: z.string().optional(),
  slots: z.coerce.number().int().min(1).max(20).default(1),
  expiresAt: z.string().optional(),
});

const requestReferralSchema = z.object({
  offerId: z.string().uuid(),
  message: z.string().min(10),
  cvUrl: z.string().url().optional().or(z.literal('')),
});

export type ReferralEligibility = {
  is_eligible: boolean;
  is_email_verified: boolean;
  has_published_review: boolean;
  has_published_salary: boolean;
  reason: string;
};

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
    return { status: 'error', message: 'Veuillez verifier les champs du formulaire.' };
  }

  const eligibility = await getReferralEligibility();
  if (!eligibility?.is_eligible) {
    return {
      status: 'error',
      message: "Vous devez verifier votre email et publier au moins un avis ou un salaire avant de publier une offre.",
    };
  }

  const payload = parsed.data;
  const { data, error } = await supabase
    .from('job_referral_offers')
    .insert({
      user_id: user.id,
      business_id: payload.businessId || null,
      company_name: payload.companyName,
      job_title: payload.jobTitle,
      city: payload.city || null,
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
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Veuillez verifier votre demande.' };
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
