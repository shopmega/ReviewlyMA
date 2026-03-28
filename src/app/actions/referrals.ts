'use server';

import type { ActionState } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

export type ReferralEligibility = {
  is_eligible: boolean;
  is_email_verified: boolean;
  has_published_review: boolean;
  has_published_salary: boolean;
  reason: string;
};

const DEFAULT_ACTION_STATE: ActionState = { status: 'idle', message: '' };
const REFERRALS_DECOMMISSIONED_MESSAGE =
  'The referral module is being retired. New referral actions are no longer available.';

function createReferralDecommissionedState(): ActionState {
  return {
    status: 'error',
    message: REFERRALS_DECOMMISSIONED_MESSAGE,
  };
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function getReferralEligibility(): Promise<ReferralEligibility | null> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;

  return {
    is_eligible: false,
    is_email_verified: false,
    has_published_review: false,
    has_published_salary: false,
    reason: REFERRALS_DECOMMISSIONED_MESSAGE,
  };
}

export async function createReferralOffer(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return createReferralDecommissionedState();
}

export async function createReferralDemandListing(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return createReferralDecommissionedState();
}

export async function updateReferralDemandListing(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return createReferralDecommissionedState();
}

export async function requestReferral(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return createReferralDecommissionedState();
}

export async function updateMyReferralOfferStatus(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return createReferralDecommissionedState();
}

export async function updateMyReferralDemandListingStatus(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return createReferralDecommissionedState();
}

export async function retractReferralDemandListing(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return createReferralDecommissionedState();
}

export async function createReferralDemandResponse(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return createReferralDecommissionedState();
}

export async function retractReferralDemandResponse(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return createReferralDecommissionedState();
}

export async function retractReferralOffer(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return createReferralDecommissionedState();
}

export async function reportReferralOffer(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return createReferralDecommissionedState();
}

export async function blockReferralUser(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return createReferralDecommissionedState();
}

export async function updateReferralRequestStatus(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return createReferralDecommissionedState();
}

export async function adminUpdateReferralOfferStatus(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return createReferralDecommissionedState();
}

export async function adminUpdateReferralRequestStatus(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return createReferralDecommissionedState();
}

export async function adminUpdateReferralReportStatus(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return createReferralDecommissionedState();
}

export async function sendReferralMessage(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return createReferralDecommissionedState();
}

export async function updateMyReferralOfferStatusForm(formData: FormData): Promise<void> {
  await updateMyReferralOfferStatus(DEFAULT_ACTION_STATE, formData);
}

export async function updateMyReferralDemandListingStatusForm(formData: FormData): Promise<void> {
  await updateMyReferralDemandListingStatus(DEFAULT_ACTION_STATE, formData);
}

export async function updateReferralDemandListingForm(formData: FormData): Promise<void> {
  await updateReferralDemandListing(DEFAULT_ACTION_STATE, formData);
}

export async function createReferralDemandResponseForm(formData: FormData): Promise<void> {
  await createReferralDemandResponse(DEFAULT_ACTION_STATE, formData);
}

export async function retractReferralDemandResponseForm(formData: FormData): Promise<void> {
  await retractReferralDemandResponse(DEFAULT_ACTION_STATE, formData);
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

export async function retractReferralDemandListingForm(formData: FormData): Promise<void> {
  await retractReferralDemandListing(DEFAULT_ACTION_STATE, formData);
}
