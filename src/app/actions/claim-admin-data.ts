'use server';

import { createAdminClient, verifyAdminPermission } from '@/lib/supabase/admin';
import { getDefaultSettings } from '@/lib/data/settings';

export type AdminClaimsFilter = 'pending' | 'all';

export type AdminClaimListItem = {
  id: string;
  user_id?: string;
  business_id: string;
  full_name: string;
  job_title: string | null;
  claimer_type?: string | null;
  claimer_title?: string | null;
  email: string;
  personal_phone?: string;
  phone?: string;
  proof_methods?: string[];
  proof_status?: Record<string, string>;
  message_to_admin?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  claim_state?: 'verification_pending' | 'verified' | 'verification_failed' | 'suspended' | 'revoked' | 'claim_requested' | 'unclaimed' | null;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  rejection_reason?: string | null;
  businesses?: { name: string; logo_url?: string };
  proof_data?: Record<string, any>;
};

export async function getAdminClaimsPageData(filterStatus: AdminClaimsFilter): Promise<{
  claims: AdminClaimListItem[];
  verificationMethods: string[];
}> {
  await verifyAdminPermission('moderation.claim.review');
  const supabase = await createAdminClient();
  const defaultVerificationMethods = getDefaultSettings().verification_methods || ['email', 'phone', 'document', 'video'];

  let claimsQuery = supabase
    .from('business_claims')
    .select('*, businesses(name, logo_url), proof_methods, proof_status, proof_data');

  if (filterStatus === 'pending') {
    claimsQuery = claimsQuery.or('claim_state.eq.verification_pending,status.eq.pending');
  }

  const [claimsResult, settingsResult] = await Promise.all([
    claimsQuery.order('created_at', { ascending: false }),
    supabase
      .from('site_settings')
      .select('verification_methods')
      .eq('id', 'main')
      .maybeSingle(),
  ]);

  if (claimsResult.error) {
    throw new Error(`Erreur chargement revendications: ${claimsResult.error.message}`);
  }

  const verificationMethods = Array.isArray(settingsResult.data?.verification_methods) && settingsResult.data.verification_methods.length > 0
    ? settingsResult.data.verification_methods
    : defaultVerificationMethods;

  return {
    claims: (claimsResult.data || []) as AdminClaimListItem[],
    verificationMethods,
  };
}
