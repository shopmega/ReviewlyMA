'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { ActionState } from '@/lib/types';
import { revalidatePath } from 'next/cache';

/**
 * Submit an offline premium payment reference for verification.
 */
export async function submitPremiumPayment(formData: {
  payment_reference: string;
  payment_method: string;
  business_id?: string;
  amount_usd?: number;
  target_tier?: 'growth' | 'gold';
  notes?: string;
}): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      status: 'error',
      message: 'Vous devez etre connecte pour effectuer cette action.',
    };
  }

  if (!formData.payment_reference) {
    return { status: 'error', message: 'La reference de paiement est requise.' };
  }

  try {
    const adminClient = await createAdminClient();

    // 1. Prevent duplicate pending payment requests per user.
    const { data: existingPayment } = await adminClient
      .from('premium_payments')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .limit(1);

    if (existingPayment && existingPayment.length > 0) {
      return {
        status: 'error',
        message: 'Vous avez deja une demande de paiement en cours de verification.',
      };
    }

    // 2. Insert payment using service role to avoid client-session RLS drift.
    const { error: insertError } = await adminClient
      .from('premium_payments')
      .insert([
        {
          user_id: user.id,
          business_id: formData.business_id || null,
          payment_reference: formData.payment_reference,
          payment_method: formData.payment_method || 'offline',
          amount_usd: formData.amount_usd || 0,
          currency: 'MAD',
          status: 'pending',
          target_tier: formData.target_tier || 'gold',
          notes: formData.notes || null,
        },
      ]);

    if (insertError) {
      console.error('Error submitting payment:', insertError);
      return {
        status: 'error',
        message:
          insertError.message || 'Une erreur est survenue lors de la soumission.',
      };
    }

    revalidatePath('/dashboard');

    return {
      status: 'success',
      message:
        'Votre reference de paiement a ete soumise avec succes. Un administrateur la verifiera sous peu.',
    };
  } catch {
    return { status: 'error', message: 'Une erreur inattendue est survenue.' };
  }
}

/**
 * Fetch current user's payments.
 */
export async function getUserPayments(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: 'error', message: 'Non connecte' };

  const { data, error } = await supabase
    .from('premium_payments')
    .select(
      `
      *,
      businesses:business_id(name)
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return { status: 'error', message: error.message };

  return { status: 'success', message: 'Paiements recuperes avec succes', data };
}

