'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type SalaryAlertScope = 'company' | 'role_city' | 'sector_city';

export type SalaryAlertTarget = {
  businessId?: string;
  roleSlug?: string;
  sectorSlug?: string;
  citySlug?: string;
};
const MAX_ALERT_SUBSCRIPTIONS_PER_USER = 50;

function normalizeTarget(scope: SalaryAlertScope, target: SalaryAlertTarget) {
  if (scope === 'company') {
    return {
      scope,
      business_id: target.businessId || null,
      role_slug: null,
      sector_slug: null,
      city_slug: null,
    };
  }

  if (scope === 'role_city') {
    return {
      scope,
      business_id: null,
      role_slug: target.roleSlug || null,
      sector_slug: null,
      city_slug: target.citySlug || null,
    };
  }

  return {
    scope,
    business_id: null,
    role_slug: null,
    sector_slug: target.sectorSlug || null,
    city_slug: target.citySlug || null,
  };
}

function hasValidTarget(scope: SalaryAlertScope, target: SalaryAlertTarget): boolean {
  if (scope === 'company') return !!target.businessId;
  if (scope === 'role_city') return !!target.roleSlug && !!target.citySlug;
  return !!target.sectorSlug && !!target.citySlug;
}

export async function getSalaryAlertSubscriptionStatus(
  scope: SalaryAlertScope,
  target: SalaryAlertTarget
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !hasValidTarget(scope, target)) return false;
  const normalized = normalizeTarget(scope, target);

  let query = supabase
    .from('salary_alert_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('scope', normalized.scope);

  if (scope === 'company') {
    query = query.eq('business_id', normalized.business_id);
  } else if (scope === 'role_city') {
    query = query.eq('role_slug', normalized.role_slug).eq('city_slug', normalized.city_slug);
  } else {
    query = query.eq('sector_slug', normalized.sector_slug).eq('city_slug', normalized.city_slug);
  }

  const { data } = await query.maybeSingle();
  return !!data;
}

export async function toggleSalaryAlertSubscription(
  scope: SalaryAlertScope,
  target: SalaryAlertTarget,
  pathToRevalidate: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'error', message: 'Vous devez etre connecte.' };
  }

  if (!hasValidTarget(scope, target)) {
    return { status: 'error', message: 'Cible d alerte invalide.' };
  }

  const normalized = normalizeTarget(scope, target);

  let existingQuery = supabase
    .from('salary_alert_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('scope', normalized.scope);

  if (scope === 'company') {
    existingQuery = existingQuery.eq('business_id', normalized.business_id);
  } else if (scope === 'role_city') {
    existingQuery = existingQuery.eq('role_slug', normalized.role_slug).eq('city_slug', normalized.city_slug);
  } else {
    existingQuery = existingQuery.eq('sector_slug', normalized.sector_slug).eq('city_slug', normalized.city_slug);
  }

  const { data: existing, error: existingError } = await existingQuery.maybeSingle();
  if (existingError) {
    return { status: 'error', message: 'Erreur lors de la verification de l alerte.' };
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from('salary_alert_subscriptions')
      .delete()
      .eq('id', existing.id)
      .eq('user_id', user.id);

    if (deleteError) {
      return { status: 'error', message: 'Impossible de desactiver l alerte.' };
    }
    revalidatePath(pathToRevalidate);
    return { status: 'removed', message: 'Alerte desactivee.' };
  }

  const { count, error: countError } = await supabase
    .from('salary_alert_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (countError) {
    return { status: 'error', message: 'Impossible de verifier la limite des alertes.' };
  }

  if ((count || 0) >= MAX_ALERT_SUBSCRIPTIONS_PER_USER) {
    return {
      status: 'error',
      message: `Limite atteinte: ${MAX_ALERT_SUBSCRIPTIONS_PER_USER} alertes maximum.`,
    };
  }

  const { error: insertError } = await supabase.from('salary_alert_subscriptions').insert({
    user_id: user.id,
    ...normalized,
  });

  if (insertError) {
    return { status: 'error', message: 'Impossible d activer l alerte.' };
  }

  revalidatePath(pathToRevalidate);
  return { status: 'added', message: 'Alerte activee.' };
}
