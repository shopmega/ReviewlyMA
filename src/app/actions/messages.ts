'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ActionState, type SubscriptionTier } from '@/lib/types';
import { isPaidTier } from '@/lib/tier-utils';

const BUSINESS_MESSAGE_BLOCKLIST: Array<{ regex: RegExp; reason: string }> = [
  { regex: /\b(?:delete|remove|supprimer)\s+(?:your|vos?|ton)\s+(?:review|avis)\b/i, reason: 'Les demandes de suppression d avis ne sont pas autorisees.' },
  { regex: /\b(?:lawsuit|legal action|tribunal|avocat|poursuite)\b/i, reason: 'Les formulations intimidantes ne sont pas autorisees.' },
  { regex: /\b(?:contact me on|whatsapp|telegram)\b/i, reason: 'Gardez les echanges sur la messagerie Reviewly.' },
  { regex: /\b(?:we know who you are|on sait qui vous etes|on va vous retrouver)\b/i, reason: 'Les menaces ou tentatives d intimidation sont interdites.' },
];

function validateBusinessOutgoingMessage(content: string): string | null {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Message vide.';
  if (normalized.length < 8) return 'Message trop court.';

  for (const rule of BUSINESS_MESSAGE_BLOCKLIST) {
    if (rule.regex.test(normalized)) {
      return rule.reason;
    }
  }

  return null;
}

export type Message = {
  id: string;
  business_id: string;
  sender_id: string | null;
  sender_name: string | null;
  sender_email: string | null;
  content: string;
  is_from_business: boolean;
  read_at: string | null;
  created_at: string;
};

async function resolveBusinessAccess(
  supabase: any,
  userId: string,
  businessId: string
): Promise<{ allowed: boolean; isAdmin: boolean; hasPremiumAccess: boolean }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, business_id, tier')
    .eq('id', userId)
    .single();

  if (!profile) {
    return { allowed: false, isAdmin: false, hasPremiumAccess: false };
  }

  const isAdmin = profile.role === 'admin';
  let allowed = isAdmin || profile.business_id === businessId;

  if (!allowed) {
    const [{ data: assignment }, { data: approvedClaim }] = await Promise.all([
      supabase
        .from('user_businesses')
        .select('business_id')
        .eq('user_id', userId)
        .eq('business_id', businessId)
        .maybeSingle(),
      supabase
        .from('business_claims')
        .select('id')
        .eq('user_id', userId)
        .eq('business_id', businessId)
        .or('claim_state.eq.verified,status.eq.approved')
        .maybeSingle(),
    ]);

    allowed = Boolean(assignment || approvedClaim);
  }

  if (!allowed) {
    return { allowed: false, isAdmin, hasPremiumAccess: false };
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('tier')
    .eq('id', businessId)
    .maybeSingle();

  const profileTier = (profile.tier ?? null) as SubscriptionTier | null;
  const businessTier = (business?.tier ?? null) as SubscriptionTier | null;
  const hasPremiumAccess = isPaidTier(profileTier) || isPaidTier(businessTier);

  return { allowed: true, isAdmin, hasPremiumAccess };
}

export async function getMessages(businessId: string): Promise<ActionState<Message[]>> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'error', message: 'Non authentifie.' };
  }

  const access = await resolveBusinessAccess(supabase, user.id, businessId);
  if (!access.allowed) {
    return { status: 'error', message: 'Acces non autorise.' };
  }
  if (!access.isAdmin && !access.hasPremiumAccess) {
    return { status: 'error', message: 'Messagerie reservee aux comptes Premium.' };
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      return { status: 'error', message: 'Erreur lors du chargement des messages.' };
    }

    return { status: 'success', message: '', data: data || [] };
  } catch {
    return { status: 'error', message: 'Une erreur est survenue.' };
  }
}

export async function sendMessage(payload: {
  business_id: string;
  content: string;
  is_from_business?: boolean;
  sender_name?: string;
  sender_email?: string;
}): Promise<ActionState> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (payload.is_from_business) {
    if (!user) return { status: 'error', message: 'Non authentifie.' };

    const access = await resolveBusinessAccess(supabase, user.id, payload.business_id);
    if (!access.allowed) {
      return { status: 'error', message: 'Acces non autorise.' };
    }
    if (!access.isAdmin && !access.hasPremiumAccess) {
      return { status: 'error', message: 'Messagerie reservee aux comptes Premium.' };
    }

    const businessMessageIssue = validateBusinessOutgoingMessage(payload.content);
    if (businessMessageIssue) {
      return { status: 'error', message: businessMessageIssue };
    }
  }

  try {
    const { error } = await supabase
      .from('messages')
      .insert([
        {
          business_id: payload.business_id,
          content: payload.content,
          sender_id: user?.id || null,
          sender_name: payload.sender_name || null,
          sender_email: payload.sender_email || null,
          is_from_business: payload.is_from_business || false,
        },
      ]);

    if (error) {
      return { status: 'error', message: "Erreur lors de l'envoi du message." };
    }

    return { status: 'success', message: 'Message envoye avec succes !' };
  } catch {
    return { status: 'error', message: 'Une erreur est survenue.' };
  }
}
