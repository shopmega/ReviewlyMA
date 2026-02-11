'use server';

import { createClient } from '@/lib/supabase/server';
import { ActionState } from '@/lib/types';
import { revalidatePath } from 'next/cache';

/**
 * Submit an offline premium payment reference for verification
 */
export async function submitPremiumPayment(formData: {
    payment_reference: string;
    payment_method: string;
    business_id?: string;
    amount_usd?: number;
}): Promise<ActionState> {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return { status: 'error', message: 'Vous devez être connecté pour effectuer cette action.' };
    }

    if (!formData.payment_reference) {
        return { status: 'error', message: 'La référence de paiement est requise.' };
    }

    try {
        // 1. Check if user already has a pending payment
        const { data: existingPayment } = await supabase
            .from('premium_payments')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .single();

        if (existingPayment) {
            return { 
                status: 'error', 
                message: 'Vous avez déjà une demande de paiement en cours de vérification.' 
            };
        }

        // 2. Insert the new payment record
        const { error: insertError } = await supabase
            .from('premium_payments')
            .insert([{
                user_id: user.id,
                business_id: formData.business_id || null,
                payment_reference: formData.payment_reference,
                payment_method: formData.payment_method || 'offline',
                amount_usd: formData.amount_usd || 0,
                currency: 'MAD', // Defaulting to MAD for Morocco as per project context
                status: 'pending'
            }]);

        if (insertError) {
            console.error('Error submitting payment:', insertError);
            return { status: 'error', message: 'Une erreur est survenue lors de la soumission.' };
        }

        revalidatePath('/dashboard');
        
        return { 
            status: 'success', 
            message: 'Votre référence de paiement a été soumise avec succès. Un administrateur la vérifiera sous peu.' 
        };
    } catch (error) {
        return { status: 'error', message: 'Une erreur inattendue est survenue.' };
    }
}

/**
 * Fetch current user's payments
 */
export async function getUserPayments(): Promise<ActionState> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { status: 'error', message: 'Non connecté' };

    const { data, error } = await supabase
        .from('premium_payments')
        .select(`
            *,
            businesses:business_id(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) return { status: 'error', message: error.message };

    return { status: 'success', message: 'Paiements récupérés avec succès', data };
}
