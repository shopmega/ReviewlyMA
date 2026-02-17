import { NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type SubmitPaymentBody = {
  payment_reference?: string;
  amount_usd?: number;
  currency?: string;
  payment_method?: string;
  target_tier?: 'growth' | 'gold';
  notes?: string;
};

export async function POST(request: Request) {
  try {
    const authClient = await createAuthClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, message: 'Session expirée. Veuillez vous reconnecter.' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as SubmitPaymentBody;
    const paymentReference = (body.payment_reference || '').trim();

    if (!paymentReference) {
      return NextResponse.json(
        { ok: false, message: 'Référence de paiement invalide.' },
        { status: 400 }
      );
    }

    const adminClient = await createAdminClient();

    const { data: existingPending } = await adminClient
      .from('premium_payments')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .limit(1);

    if (existingPending && existingPending.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Vous avez déjà une demande de paiement en attente de vérification.',
        },
        { status: 409 }
      );
    }

    const { data: profileData } = await adminClient
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .maybeSingle();

    const { error: insertError } = await adminClient.from('premium_payments').insert({
      user_id: user.id,
      business_id: profileData?.business_id ?? null,
      payment_reference: paymentReference,
      amount_usd: typeof body.amount_usd === 'number' ? body.amount_usd : null,
      currency: body.currency || 'MAD',
      status: 'pending',
      payment_method: body.payment_method || 'offline_transfer',
      target_tier: body.target_tier || 'gold',
      notes: body.notes || null,
    });

    if (insertError) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Soumission échouée.',
          error: {
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
            message: insertError.message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Erreur serveur inattendue.' },
      { status: 500 }
    );
  }
}
