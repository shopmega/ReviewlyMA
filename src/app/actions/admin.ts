'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createAdminClient, createAuthClient, verifyAdminSession } from '@/lib/supabase/admin';
import { format } from 'date-fns';
import { ActionState, businessUpdateSchema, SubscriptionTier } from '@/lib/types';
import { AdminPermission, hasAdminPermission } from '@/lib/admin-rbac';
import {
  sendPremiumActivationEmail,
  sendPremiumRejectionEmail
} from './email';
import { logAuditAction } from '@/lib/audit-logger';
import { logger } from '@/lib/logger';

export type AdminActionResult = {
  status: 'success' | 'error';
  message: string;
  data?: any;
};

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
  message: string;
}

function isSchemaCacheMissingColumnError(error: any, columnName: string, tableName?: string) {
  if (!error) return false;

  const message = String(error.message || '').toLowerCase();
  const column = columnName.toLowerCase();
  const table = (tableName || '').toLowerCase();

  const hasSchemaCacheSignal = message.includes('schema cache');
  const hasColumnSignal =
    message.includes(`"${column}"`)
    || message.includes(`'${column}'`)
    || message.includes(`"${column.replace(/_/g, '-')}"`)
    || message.includes(`'${column.replace(/_/g, '-')}'`);
  const hasTableSignal = !table || message.includes(table);

  return hasSchemaCacheSignal && hasColumnSignal && hasTableSignal;
}

async function getPremiumPaymentByIdentifier(serviceClient: any, rawIdentifier: string) {
  const identifier = String(rawIdentifier || '').trim();
  if (!identifier) return { data: null, error: { message: 'empty identifier' } };

  const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
  const isNoRowsError = (error: any) =>
    !!error && (
      String(error.message || '').toLowerCase().includes('no rows')
      || String(error.code || '') === 'PGRST116'
    );
  const isInvalidUuidCast = (error: any) =>
    !!error && (
      String(error.code || '') === '22P02'
      || String(error.message || '').toLowerCase().includes('invalid input syntax for type uuid')
    );

  const lookupById = async () => serviceClient
    .from('premium_payments')
    .select('*')
    .eq('id', identifier)
    .single();

  const lookupByReference = async () => serviceClient
    .from('premium_payments')
    .select('*')
    .eq('payment_reference', identifier)
    .single();

  const primary = isUuidLike ? await lookupById() : await lookupByReference();
  if (!primary.error && primary.data) return primary;

  if (primary.error && !isNoRowsError(primary.error) && !isInvalidUuidCast(primary.error)) {
    return primary;
  }

  const secondary = isUuidLike ? await lookupByReference() : await lookupById();
  if (!secondary.error && secondary.data) return secondary;

  if (secondary.error && isNoRowsError(secondary.error)) {
    return { data: null, error: null };
  }

  if (secondary.error && isInvalidUuidCast(secondary.error)) {
    return { data: null, error: null };
  }

  return secondary;
}

async function notifyUserPaymentStatus(
  serviceClient: any,
  userId: string,
  payload: { title: string; message: string; type: string; link?: string }
) {
  try {
    const notificationsTable = serviceClient.from('notifications');
    if (!notificationsTable || typeof notificationsTable.insert !== 'function') {
      return;
    }

    const { error } = await notificationsTable.insert({
      user_id: userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      link: payload.link ?? '/dashboard/premium',
      is_read: false,
    });

    if (error) {
      logger.warn('Failed to create payment status notification', { userId, error });
    }
  } catch (error) {
    logger.warn('Unexpected error while creating payment status notification', { userId, error });
  }
}

function slugifyForBusinessId(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function buildDeterministicBusinessId(name: string, city: string): string {
  return slugifyForBusinessId(`${name}-${city}`);
}

async function enforceAdminPermission(
  serviceClient: any,
  adminId: string,
  permission: AdminPermission
) {
  const profilesTable = serviceClient?.from?.('profiles');
  if (!profilesTable || typeof profilesTable.select !== 'function') {
    return;
  }

  const extendedProfile = await profilesTable
    .select('role, admin_access_level, admin_permissions')
    .eq('id', adminId)
    .single();

  // Backward-compatible fallback for environments where new RBAC columns are not yet present.
  if (extendedProfile.error) {
    const message = String(extendedProfile.error.message || '').toLowerCase();
    const missingRbacColumns =
      message.includes('admin_access_level')
      || message.includes('admin_permissions')
      || message.includes('schema cache')
      || String(extendedProfile.error.code || '') === '42703';

    if (!missingRbacColumns) {
      throw new Error(`Non autorise: verification permission impossible (${extendedProfile.error.message})`);
    }
  }

  const profile = extendedProfile.data || { role: 'admin' };
  if (!hasAdminPermission(profile, permission)) {
    throw new Error(`Non autorise: permission '${permission}' requise.`);
  }
}

/**
 * Toggle a user's premium status
 * Logs the change in premium_audit_log for compliance and tracking
 * FIXED: Double-check admin status immediately before mutation to prevent TOCTOU
 */
export async function toggleUserPremium(
  targetUserId: string,
  tier: SubscriptionTier,
  periodMonths: number | null = null
): Promise<AdminActionResult> {
  const isPremium = tier !== 'standard';
  const expiresAt =
    isPremium && periodMonths && periodMonths > 0
      ? new Date(new Date().setMonth(new Date().getMonth() + periodMonths)).toISOString()
      : null;
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();

    // Perform atomic update via RPC
    const { data: rpcResult, error: rpcError } = await serviceClient.rpc(
      'toggle_user_premium',
      {
        p_user_id: targetUserId,
        p_tier: tier,
        p_is_premium: isPremium,
        p_granted_at: isPremium ? new Date().toISOString() : null,
        p_expires_at: expiresAt
      }
    );

    if (rpcError) {
      logger.error('RPC Error updating premium status', rpcError, { targetUserId });
      return { status: 'error', message: `Erreur atomique: ${rpcError.message}` };
    }

    if (!rpcResult || !rpcResult.success) {
      return { status: 'error', message: 'Erreur lors de la mise à jour atomique.' };
    }

    // Log the change in audit log
    try {
      await logAuditAction({
        adminId,
        action: isPremium ? 'granted_premium' : 'revoked_premium',
        targetType: 'profile',
        targetId: targetUserId,
        details: {
          tier,
          is_premium: isPremium,
          period_months: periodMonths,
          expires_at: expiresAt,
          businesses_updated: rpcResult.businesses_updated,
          business_ids: rpcResult.business_ids
        }
      });
    } catch (auditError) {
      logger.error('Audit log error', auditError, { targetUserId });
    }

    return {
      status: 'success',
      message: isPremium
        ? `Statut ${tier.toUpperCase()} activé (${rpcResult.businesses_updated} établissement(s) mis à jour).`
        : 'Statut Premium désactivé avec succès.'
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

/**
 * Change a user's role (admin, pro, user)
 */
export async function changeUserRole(
  targetUserId: string,
  newRole: 'admin' | 'pro' | 'user'
): Promise<AdminActionResult> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();
    await enforceAdminPermission(serviceClient, adminId, 'user.role.manage');

    // Prevent admin from demoting themselves
    if (targetUserId === adminId && newRole !== 'admin') {
      return { status: 'error', message: 'Vous ne pouvez pas modifier votre propre rôle.' };
    }

    const { error } = await serviceClient
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId);

    if (error) {
      return { status: 'error', message: `Erreur: ${error.message}` };
    }

    // Log the action
    await logAuditAction({
      adminId,
      action: 'UPDATE_ROLE',
      targetType: 'profile',
      targetId: targetUserId,
      details: { new_role: newRole }
    });

    const roleLabels: Record<string, string> = {
      admin: 'Administrateur',
      pro: 'Professionnel',
      user: 'Utilisateur'
    };

    return {
      status: 'success',
      message: `Rôle changé en "${roleLabels[newRole]}" avec succès.`
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

/**
 * Suspend or unsuspend a user account
 */
export async function toggleUserSuspension(
  targetUserId: string,
  suspend: boolean
): Promise<AdminActionResult> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();
    await enforceAdminPermission(serviceClient, adminId, 'user.suspend');

    // Prevent admin from suspending themselves
    if (targetUserId === adminId) {
      return { status: 'error', message: 'Vous ne pouvez pas suspendre votre propre compte.' };
    }

    // Check if target is also an admin
    const { data: targetProfile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', targetUserId)
      .single();

    if (targetProfile?.role === 'admin') {
      return { status: 'error', message: 'Impossible de suspendre un administrateur.' };
    }

    const { error } = await serviceClient
      .from('profiles')
      .update({
        suspended: suspend,
        suspended_at: suspend ? new Date().toISOString() : null
      })
      .eq('id', targetUserId);

    if (error) {
      return { status: 'error', message: `Erreur: ${error.message}` };
    }

    // Log the action
    await logAuditAction({
      adminId,
      action: suspend ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
      targetType: 'profile',
      targetId: targetUserId
    });

    return {
      status: 'success',
      message: suspend
        ? 'Compte suspendu avec succès.'
        : 'Compte réactivé avec succès.'
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

/**
 * Fetch all users (for admin panel)
 * NOTE: This function has N+1 performance issues and should only be used in client components
 * For server components, use getAdminUsersWithClaims() from admin-queries.ts
 */
export async function fetchAllUsers(): Promise<ActionState> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();

    const { data, error } = await serviceClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { status: 'error', message: `Erreur: ${error.message}` };
    }

    return {
      status: 'success',
      data,
      message: 'Utilisateurs récupérés. NOTE: This function has N+1 performance issues and should only be used in client components.'
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

/**
 * Create a new business (admin only)
 */
export async function createBusiness(data: {
  name: string;
  category: string;
  city: string;
  address: string;
  description?: string;
  tier?: SubscriptionTier;
}): Promise<AdminActionResult> {
  const isPremium = (data.tier && data.tier !== 'standard');
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();

    const businessId = buildDeterministicBusinessId(data.name, data.city);

    const { data: business, error } = await serviceClient
      .from('businesses')
      .upsert({
        id: businessId,
        name: data.name,
        category: data.category,
        city: data.city,
        address: data.address,
        description: data.description || '',
        is_premium: isPremium,
        tier: data.tier || 'standard',
        status: 'active',
        overall_rating: 0,
        review_count: 0
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      return { status: 'error', message: `Erreur DB: ${error.message}` };
    }

    // Log action
    await logAuditAction({
      adminId,
      action: 'CREATE_BUSINESS',
      targetType: 'business',
      targetId: business.id,
      details: { name: data.name }
    });

    revalidatePath('/admin/etablissements');
    revalidatePath('/');

    return { status: 'success', message: 'Établissement créé avec succès.', data: business };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

/**
 * Approve a business suggestion and create the business
 */
export async function approveBusinessSuggestion(suggestionId: string, reviewNotes?: string): Promise<AdminActionResult> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();

    // Get the suggestion
    const { data: suggestion, error: fetchError } = await serviceClient
      .from('business_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single();

    if (fetchError || !suggestion) {
      return { status: 'error', message: 'Suggestion non trouvée.' };
    }

    if (suggestion.status !== 'pending') {
      return { status: 'error', message: 'Cette suggestion a déjà été traitée.' };
    }

    const businessId = buildDeterministicBusinessId(suggestion.name, suggestion.city);

    // Create or update the business idempotently.
    const { data: business, error: createError } = await serviceClient
      .from('businesses')
      .upsert({
        id: businessId,
        name: suggestion.name,
        category: suggestion.category,
        city: suggestion.city,
        location: suggestion.location || '',
        description: suggestion.description || '',
        type: 'company',
        is_featured: false,
        is_premium: false,
        tier: 'standard',
        overall_rating: 0,
        review_count: 0
      }, { onConflict: 'id' })
      .select()
      .single();

    if (createError) {
      return { status: 'error', message: `Erreur DB: ${createError.message}` };
    }

    // Update the suggestion status
    const { error: updateError } = await serviceClient
      .from('business_suggestions')
      .update({
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null
      })
      .eq('id', suggestionId);

    if (updateError) {
      console.error('Error updating suggestion status:', updateError);
      // Don't fail the whole operation if we can't update the suggestion
    }

    // Log action
    await logAuditAction({
      adminId,
      action: 'APPROVE_BUSINESS_SUGGESTION',
      targetType: 'business_suggestion',
      targetId: suggestionId,
      details: {
        businessName: suggestion.name,
        businessId: business.id,
        suggestionId
      }
    });

    revalidatePath('/admin/business-suggestions');
    revalidatePath('/admin/etablissements');
    revalidatePath('/');

    return {
      status: 'success',
      message: 'Établissement créé avec succès depuis la suggestion.',
      data: business
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

/**
 * Reject a business suggestion
 */
export async function rejectBusinessSuggestion(suggestionId: string, reviewNotes?: string): Promise<AdminActionResult> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();

    const { error } = await serviceClient
      .from('business_suggestions')
      .update({
        status: 'rejected',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null
      })
      .eq('id', suggestionId);

    if (error) {
      return { status: 'error', message: `Erreur DB: ${error.message}` };
    }

    // Log action
    await logAuditAction({
      adminId,
      action: 'REJECT_BUSINESS_SUGGESTION',
      targetType: 'business_suggestion',
      targetId: suggestionId,
      details: { suggestionId }
    });

    revalidatePath('/admin/business-suggestions');

    return { status: 'success', message: 'Suggestion rejetée avec succès.' };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

export async function toggleBusinessFeatured(
  businessId: string,
  isFeatured: boolean
): Promise<AdminActionResult> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();

    const { error } = await serviceClient
      .from('businesses')
      .update({ is_featured: isFeatured })
      .eq('id', businessId);

    if (error) {
      return { status: 'error', message: `Erreur: ${error.message}` };
    }

    revalidatePath('/');
    revalidatePath('/admin/etablissements');
    revalidatePath('/admin/homepage');
    revalidatePath(`/businesses/${businessId}`);

    return {
      status: 'success',
      message: isFeatured ? 'Établissement mis à la une.' : 'Établissement retiré de la une.'
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

/**
 * Toggle business sponsored status (admin only)
 */
export async function toggleBusinessSponsored(
  businessId: string,
  isSponsored: boolean
): Promise<AdminActionResult> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();

    const { error } = await serviceClient
      .from('businesses')
      .update({ is_sponsored: isSponsored })
      .eq('id', businessId);

    if (error) {
      return { status: 'error', message: `Erreur: ${error.message}` };
    }

    revalidatePath('/');
    revalidatePath('/admin/etablissements');
    revalidatePath(`/businesses/${businessId}`);

    return {
      status: 'success',
      message: isSponsored ? 'Établissement marqué comme sponsorisé.' : 'Établissement n\'est plus sponsorisé.'
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

/**
 * Delete a business and its associated data
 */
export async function deleteBusiness(
  businessId: string
): Promise<AdminActionResult> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();
    await enforceAdminPermission(serviceClient, adminId, 'business.delete');

    // First, get business info for logging
    const { data: business } = await serviceClient
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .single();

    if (!business) {
      return { status: 'error', message: 'Établissement introuvable.' };
    }

    // Remove business_id from any profiles linked to this business
    // Also reset premium status to maintain consistent state
    await serviceClient
      .from('profiles')
      .update({ business_id: null, role: 'user', is_premium: false })
      .eq('business_id', businessId);

    // Delete associated claims
    await serviceClient
      .from('business_claims')
      .delete()
      .eq('business_id', businessId);

    // Delete associated updates
    await serviceClient
      .from('updates')
      .delete()
      .eq('business_id', businessId);

    // Delete associated reviews
    await serviceClient
      .from('reviews')
      .delete()
      .eq('business_id', businessId);

    // Finally, delete the business itself
    const { error } = await serviceClient
      .from('businesses')
      .delete()
      .eq('id', businessId);

    if (error) {
      return { status: 'error', message: `Erreur: ${error.message}` };
    }

    revalidatePath('/admin/etablissements');

    // Log the action
    await logAuditAction({
      adminId,
      action: 'DELETE_BUSINESS',
      targetType: 'business',
      targetId: businessId,
      details: { business_name: business.name }
    });

    return {
      status: 'success',
      message: `"${business.name}" a été supprimé avec succès.`
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

/**
 * Delete an update (for pro users managing their updates)
 */
export async function deleteUpdate(
  updateId: string
): Promise<AdminActionResult> {
  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { status: 'error', message: 'Vous devez être connecté.' };
    }

    // Get user's business_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile?.business_id) {
      return { status: 'error', message: 'Aucun établissement associé.' };
    }

    // Verify the update belongs to this business
    const { data: update } = await supabase
      .from('updates')
      .select('business_id')
      .eq('id', updateId)
      .single();

    if (!update || update.business_id !== profile.business_id) {
      return { status: 'error', message: 'Mise à jour introuvable ou non autorisée.' };
    }

    // Delete the update
    const { error } = await supabase
      .from('updates')
      .delete()
      .eq('id', updateId);

    if (error) {
      return { status: 'error', message: `Erreur: ${error.message}` };
    }

    return { status: 'success', message: 'Mise à jour supprimée.' };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

/**
 * Edit an update (for pro users managing their updates)
 */
export async function editUpdate(
  updateId: string,
  title: string,
  content: string
): Promise<AdminActionResult> {
  try {
    const validatedFields = businessUpdateSchema.safeParse({ title, text: content });

    if (!validatedFields.success) {
      return {
        status: 'error',
        message: 'Veuillez corriger les erreurs dans le formulaire.'
      };
    }

    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { status: 'error', message: 'Vous devez être connecté.' };
    }

    // Get user's business_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile?.business_id) {
      return { status: 'error', message: 'Aucun établissement associé.' };
    }

    // Verify the update belongs to this business
    const { data: update } = await supabase
      .from('updates')
      .select('business_id')
      .eq('id', updateId)
      .single();

    if (!update || update.business_id !== profile.business_id) {
      return { status: 'error', message: 'Mise à jour introuvable ou non autorisée.' };
    }

    // Update the record
    const { error } = await supabase
      .from('updates')
      .update({ title, content })
      .eq('id', updateId);

    if (error) {
      return { status: 'error', message: `Erreur: ${error.message}` };
    }

    return { status: 'success', message: 'Mise à jour modifiée avec succès.' };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

export async function setUpdatePinned(
  updateId: string,
  isPinned: boolean
): Promise<AdminActionResult> {
  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { status: 'error', message: 'Vous devez etre connecte.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile?.business_id) {
      return { status: 'error', message: 'Aucun etablissement associe.' };
    }

    const { data: update } = await supabase
      .from('updates')
      .select('business_id')
      .eq('id', updateId)
      .single();

    if (!update || update.business_id !== profile.business_id) {
      return { status: 'error', message: 'Mise a jour introuvable ou non autorisee.' };
    }

    const { error } = await supabase
      .from('updates')
      .update({
        is_pinned: isPinned,
        pinned_at: isPinned ? new Date().toISOString() : null,
      })
      .eq('id', updateId);

    if (error) {
      return { status: 'error', message: `Erreur: ${error.message}` };
    }

    revalidatePath('/dashboard/updates');
    revalidatePath(`/businesses/${profile.business_id}`);

    return {
      status: 'success',
      message: isPinned ? 'Nouveaute epinglee.' : 'Nouveaute desepinglee.',
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

/**
 * Verify offline premium payment and grant premium status
 */
export async function verifyOfflinePayment(
  paymentId: string,
  reason?: string
): Promise<AdminActionResult> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();

    // Fetch payment details
    const { data: payment, error: paymentError } = await getPremiumPaymentByIdentifier(serviceClient, paymentId);

    if (paymentError) {
      return { status: 'error', message: `Erreur lecture paiement: ${paymentError.message}` };
    }

    if (!payment) {
      return { status: 'error', message: 'Paiement introuvable.' };
    }

    if (payment.status !== 'pending') {
      return { status: 'error', message: `Ce paiement a déjà été ${payment.status}.` };
    }

    // Default expiration: 1 year if not specified
    const expirationDate = payment.expires_at || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();

    // Update payment status and persist effective expiration
    let { error: updatePaymentError } = await serviceClient
      .from('premium_payments')
      .update({
        status: 'verified',
        verified_by: adminId,
        verified_at: new Date().toISOString(),
        expires_at: expirationDate
      })
      .eq('id', payment.id);

    if (isSchemaCacheMissingColumnError(updatePaymentError, 'expires_at', 'premium_payments')) {
      logger.warn('premium_payments.expires_at missing in schema cache, retrying verification update without expires_at', {
        paymentId: payment.id,
        rawError: updatePaymentError,
      });

      const fallbackUpdate = await serviceClient
        .from('premium_payments')
        .update({
          status: 'verified',
          verified_by: adminId,
          verified_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      updatePaymentError = fallbackUpdate.error;
    }

    if (updatePaymentError) {
      return { status: 'error', message: `Erreur mise à jour paiement: ${updatePaymentError.message}` };
    }

    // Grant premium status to user + sync all linked businesses atomically
    const targetTier = payment.target_tier || 'gold';
    const { data: rpcResult, error: premiumError } = await serviceClient.rpc(
      'toggle_user_premium',
      {
        p_user_id: payment.user_id,
        p_tier: targetTier,
        p_is_premium: true,
        p_granted_at: new Date().toISOString(),
        p_expires_at: expirationDate
      }
    );

    if (premiumError) {
      return { status: 'error', message: `Erreur activation premium: ${premiumError.message}` };
    }

    if (!rpcResult?.success) {
      return { status: 'error', message: 'Erreur activation premium: echec synchronisation premium.' };
    }

    // Send confirmation email
    try {
      const { data: userProfile } = await serviceClient
        .from('profiles')
        .select('email, full_name')
        .eq('id', payment.user_id)
        .single();

      if (userProfile?.email) {
        await sendPremiumActivationEmail(userProfile.email, userProfile.full_name || 'Utilisateur');
      }
    } catch (emailError) {
      logger.warn('Failed to send premium activation email', { error: emailError, paymentId });
    }

    await notifyUserPaymentStatus(serviceClient, payment.user_id, {
      title: 'Paiement valide',
      message: `Votre paiement ${payment.payment_reference || ''} a ete valide. Votre abonnement ${targetTier.toUpperCase()} est actif.`,
      type: 'payment_verified',
      link: '/dashboard/premium',
    });

    // Log the audit
    try {
      await logAuditAction({
        adminId,
        action: 'VERIFY_OFFLINE_PAYMENT',
        targetType: 'payment',
        targetId: paymentId,
        details: {
          user_id: payment.user_id,
          business_id: payment.business_id,
          reference: payment.payment_reference,
          expiration: expirationDate
        }
      });
    } catch (auditError) {
      logger.warn('Failed to log payment verification', { error: auditError, paymentId });
    }

    return {
      status: 'success',
      message: 'Paiement verifié et statut Premium accordé avec succès.'
    };
  } catch (error: any) {
    logger.error('Payment verification error', error, { paymentId });
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

/**
 * Fetch premium payments for admin panel
 */
export async function fetchPremiumPayments(): Promise<ActionState> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();

    const { data, error } = await serviceClient
      .from('premium_payments')
      .select(`
                *,
                profiles:user_id(email, full_name),
                businesses:business_id(name)
            `)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching premium payments', error);
      // Fallback: fetch without join
      const { data: simpleData, error: simpleError } = await serviceClient
        .from('premium_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (simpleError) {
        return { status: 'error', message: `Erreur: ${simpleError.message}` };
      }

      return { status: 'success', data: simpleData, message: 'Paiements récupérés (sans détails).' };
    }

    return { status: 'success', data, message: 'Paiements récupérés.' };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

/**
 * Reject offline premium payment
 */
export async function rejectOfflinePayment(
  paymentId: string,
  reason: string
): Promise<AdminActionResult> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();

    // Fetch payment details
    const { data: payment, error: paymentError } = await getPremiumPaymentByIdentifier(serviceClient, paymentId);

    if (paymentError) {
      return { status: 'error', message: `Erreur lecture paiement: ${paymentError.message}` };
    }

    if (!payment) {
      return { status: 'error', message: 'Paiement introuvable.' };
    }

    if (payment.status !== 'pending') {
      return { status: 'error', message: `Ce paiement a déjà été ${payment.status}.` };
    }

    // Update payment status
    const { error: updatePaymentError } = await serviceClient
      .from('premium_payments')
      .update({
        status: 'rejected',
        notes: reason,
        verified_by: adminId,
        verified_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    if (updatePaymentError) {
      return { status: 'error', message: `Erreur mise à jour paiement: ${updatePaymentError.message}` };
    }

    // Log the action
    await logAuditAction({
      adminId,
      action: 'REJECT_OFFLINE_PAYMENT',
      targetType: 'payment',
      targetId: paymentId,
      details: { reason }
    });

    // Send rejection email
    try {
      const { data: userProfile } = await serviceClient
        .from('profiles')
        .select('email, full_name')
        .eq('id', payment.user_id)
        .single();

      if (userProfile?.email) {
        await sendPremiumRejectionEmail(userProfile.email, userProfile.full_name || 'Utilisateur', reason);
      }
    } catch (emailError) {
      logger.warn('Failed to send premium rejection email', { error: emailError, paymentId });
    }

    await notifyUserPaymentStatus(serviceClient, payment.user_id, {
      title: 'Paiement rejete',
      message: reason
        ? `Votre paiement ${payment.payment_reference || ''} a ete rejete: ${reason}`
        : `Votre paiement ${payment.payment_reference || ''} a ete rejete.`,
      type: 'payment_rejected',
      link: '/dashboard/premium',
    });

    return {
      status: 'success',
      message: 'Paiement rejeté avec succès.'
    };
  } catch (error: any) {
    logger.error('Payment rejection error', error, { paymentId });
    return { status: 'error', message: error.message || 'Une erreur est survenue lors du rejet.' };
  }
}

/**
 * Add a manual payment record for a user
 */
export async function addManualPayment(data: {
  userEmail: string;
  amount: number;
  reference: string;
  method: string;
  expirationDate: string;
  tier: SubscriptionTier;
  notes?: string;
}): Promise<AdminActionResult> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();

    // 1. Find the user by email
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('id, business_id, full_name')
      .eq('email', data.userEmail)
      .single();

    if (profileError || !profile) {
      return { status: 'error', message: 'Utilisateur introuvable avec cet email.' };
    }

    // 2. Create the payment record
    const paymentInsertPayload: Record<string, any> = {
      user_id: profile.id,
      business_id: profile.business_id,
      payment_reference: data.reference,
      payment_method: data.method,
      amount_usd: data.amount,
      currency: 'MAD',
      status: 'verified',
      target_tier: data.tier,
      notes: data.notes,
      verified_by: adminId,
      verified_at: new Date().toISOString(),
      expires_at: data.expirationDate
    };

    let { data: payment, error: paymentError } = await serviceClient
      .from('premium_payments')
      .insert([paymentInsertPayload])
      .select()
      .single();

    if (isSchemaCacheMissingColumnError(paymentError, 'expires_at', 'premium_payments')) {
      logger.warn('premium_payments.expires_at missing in schema cache, retrying manual payment insert without expires_at', {
        userId: profile.id,
        reference: data.reference,
        rawError: paymentError,
      });

      delete paymentInsertPayload.expires_at;
      const fallbackInsert = await serviceClient
        .from('premium_payments')
        .insert([paymentInsertPayload])
        .select()
        .single();

      payment = fallbackInsert.data;
      paymentError = fallbackInsert.error;
    }

    if (paymentError) {
      return { status: 'error', message: `Erreur création paiement: ${paymentError.message}` };
    }

    // 3. Activate premium and sync all linked businesses atomically
    const { data: rpcResult, error: profileUpdateError } = await serviceClient.rpc(
      'toggle_user_premium',
      {
        p_user_id: profile.id,
        p_tier: data.tier,
        p_is_premium: true,
        p_granted_at: new Date().toISOString(),
        p_expires_at: data.expirationDate
      }
    );

    if (profileUpdateError) {
      return { status: 'error', message: `Erreur mise à jour profil: ${profileUpdateError.message}` };
    }

    if (!rpcResult?.success) {
      return { status: 'error', message: 'Erreur mise a jour profil: echec synchronisation premium.' };
    }

    // 4. Audit log
    await logAuditAction({
      adminId,
      action: 'ADD_MANUAL_PAYMENT',
      targetType: 'payment',
      targetId: payment.id,
      details: {
        user_email: data.userEmail,
        amount: data.amount,
        reference: data.reference,
        expiration: data.expirationDate
      }
    });

    // 5. Send email
    try {
      await sendPremiumActivationEmail(data.userEmail, profile.full_name || 'Professionnel');
    } catch (e) {
      logger.warn('Failed to send activation email for manual payment', { userId: profile.id });
    }

    await notifyUserPaymentStatus(serviceClient, profile.id, {
      title: 'Abonnement active',
      message: `Votre abonnement ${data.tier.toUpperCase()} a ete active par un administrateur.`,
      type: 'payment_verified',
      link: '/dashboard/premium',
    });

    revalidatePath('/admin/paiements');

    return {
      status: 'success',
      message: `Paiement ajouté et Premium activé pour ${profile.full_name || data.userEmail} jusqu'au ${format(new Date(data.expirationDate), 'dd/MM/yyyy')}`
    };
  } catch (error: any) {
    logger.error('Manual payment error', error, { userEmail: data.userEmail });
    return { status: 'error', message: error.message || 'Une erreur est survenue lors de l\'ajout manuel.' };
  }
}

/**
 * Bulk Operations for Admin Panel
 */

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
  message: string;
}

/**
 * Bulk update multiple reviews
 */
export async function bulkUpdateReviews(
  reviewIds: number[],
  updateData: {
    status?: 'published' | 'rejected';
    reason?: string;
  }
): Promise<BulkOperationResult> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();

    if (reviewIds.length === 0) {
      return {
        success: true,
        processed: 0,
        failed: 0,
        errors: [],
        message: 'Aucun avis selectionne.'
      };
    }

    const { error, count } = await serviceClient
      .from('reviews')
      .update({
        status: updateData.status,
        ...(updateData.reason && {
          moderation_reason: updateData.reason,
          moderated_at: new Date().toISOString(),
          moderated_by: adminId
        })
      }, { count: 'exact' })
      .in('id', reviewIds);

    const processed = error ? 0 : Math.min(count ?? reviewIds.length, reviewIds.length);
    const failed = error ? reviewIds.length : Math.max(0, reviewIds.length - processed);
    const errors = error ? [`Bulk review update failed: ${error.message}`] : [];

    // Log bulk operation
    await logAuditAction({
      adminId,
      action: 'BULK_UPDATE_REVIEWS',
      targetType: 'review',
      details: {
        review_ids: reviewIds,
        update_data: updateData,
        processed,
        failed,
        errors
      }
    });

    revalidatePath('/admin/avis');

    return {
      success: !error,
      processed,
      failed,
      errors,
      message: `${processed} avis traites, ${failed} echecs`
    };
  } catch (error: any) {
    return {
      success: false,
      processed: 0,
      failed: reviewIds.length,
      errors: [error.message || 'Unknown error'],
      message: 'Erreur lors de la mise a jour groupee.'
    };
  }
}

/**
 * Bulk delete multiple reviews
 */
export async function bulkDeleteReviews(
  reviewIds: number[]
): Promise<BulkOperationResult> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();

    if (reviewIds.length === 0) {
      return {
        success: true,
        processed: 0,
        failed: 0,
        errors: [],
        message: 'Aucun avis selectionne.'
      };
    }

    const { error, count } = await serviceClient
      .from('reviews')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        deleted_by: adminId
      }, { count: 'exact' })
      .in('id', reviewIds);

    const processed = error ? 0 : Math.min(count ?? reviewIds.length, reviewIds.length);
    const failed = error ? reviewIds.length : Math.max(0, reviewIds.length - processed);
    const errors = error ? [`Bulk review delete failed: ${error.message}`] : [];

    // Log bulk operation
    await serviceClient
      .from('admin_audit_log')
      .insert({
        admin_id: adminId,
        action: 'bulk_delete_reviews',
        details: {
          review_ids: reviewIds,
          processed,
          failed,
          errors
        },
        created_at: new Date().toISOString()
      });

    revalidatePath('/admin/avis');

    return {
      success: !error,
      processed,
      failed,
      errors,
      message: `${processed} avis supprimes, ${failed} echecs`
    };
  } catch (error: any) {
    return {
      success: false,
      processed: 0,
      failed: reviewIds.length,
      errors: [error.message || 'Unknown error'],
      message: 'Erreur lors de la suppression groupee.'
    };
  }
}

/**
 * Bulk update multiple businesses
 */
export async function bulkUpdateBusinesses(
  businessIds: string[],
  updateData: {
    status?: 'active' | 'suspended';
    is_premium?: boolean;
    featured?: boolean;
    is_featured?: boolean;
  }
): Promise<BulkOperationResult> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();

    if (businessIds.length === 0) {
      return {
        success: true,
        processed: 0,
        failed: 0,
        errors: [],
        message: 'Aucun etablissement selectionne.'
      };
    }

    const { featured, ...rest } = updateData;
    const normalizedUpdateData = {
      ...rest,
      ...(typeof featured === 'boolean' ? { is_featured: featured } : {}),
    };

    const { error, count } = await serviceClient
      .from('businesses')
      .update(normalizedUpdateData, { count: 'exact' })
      .in('id', businessIds);

    const processed = error ? 0 : Math.min(count ?? businessIds.length, businessIds.length);
    const failed = error ? businessIds.length : Math.max(0, businessIds.length - processed);
    const errors = error ? [`Bulk business update failed: ${error.message}`] : [];

    // Log bulk operation
    await serviceClient
      .from('admin_audit_log')
      .insert({
        admin_id: adminId,
        action: 'bulk_update_businesses',
        details: {
          business_ids: businessIds,
          update_data: normalizedUpdateData,
          processed,
          failed,
          errors
        },
        created_at: new Date().toISOString()
      });

    revalidatePath('/admin/etablissements');

    return {
      success: !error,
      processed,
      failed,
      errors,
      message: `${processed} etablissements mis a jour, ${failed} echecs`
    };
  } catch (error: any) {
    return {
      success: false,
      processed: 0,
      failed: businessIds.length,
      errors: [error.message || 'Unknown error'],
      message: 'Erreur lors de la mise a jour groupee.'
    };
  }
}

/**
 * Bulk delete multiple businesses
 */
export async function bulkDeleteBusinesses(
  businessIds: string[]
): Promise<BulkOperationResult> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();

    if (businessIds.length === 0) {
      return {
        success: true,
        processed: 0,
        failed: 0,
        errors: [],
        message: 'Aucun etablissement selectionne.'
      };
    }

    const { error, count } = await serviceClient
      .from('businesses')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        deleted_by: adminId
      }, { count: 'exact' })
      .in('id', businessIds);

    const processed = error ? 0 : Math.min(count ?? businessIds.length, businessIds.length);
    const failed = error ? businessIds.length : Math.max(0, businessIds.length - processed);
    const errors = error ? [`Bulk business delete failed: ${error.message}`] : [];

    // Log bulk operation
    await serviceClient
      .from('admin_audit_log')
      .insert({
        admin_id: adminId,
        action: 'bulk_delete_businesses',
        details: {
          business_ids: businessIds,
          processed,
          failed,
          errors
        },
        created_at: new Date().toISOString()
      });

    revalidatePath('/admin/etablissements');

    return {
      success: !error,
      processed,
      failed,
      errors,
      message: `${processed} etablissements supprimes, ${failed} echecs`
    };
  } catch (error: any) {
    return {
      success: false,
      processed: 0,
      failed: businessIds.length,
      errors: [error.message || 'Unknown error'],
      message: 'Erreur lors de la suppression groupee.'
    };
  }
}

/**
 * Request a logo from a business owner
 */
export async function requestLogo(businessId: string): Promise<AdminActionResult> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();

    // Get business details to find the owner
    const { data: business, error: businessError } = await serviceClient
      .from('businesses')
      .select('user_id, name')
      .eq('id', businessId)
      .single();

    if (businessError) {
      return { status: 'error', message: `Erreur: ${businessError.message}` };
    }

    // Update the business record to mark logo as requested
    const { error: updateError } = await serviceClient
      .from('businesses')
      .update({ logo_requested: true })
      .eq('id', businessId);

    if (updateError) {
      return { status: 'error', message: `Erreur: ${updateError.message}` };
    }

    // Send notification to business owner if they exist
    if (business.user_id) {
      const { error: notificationError } = await serviceClient
        .from('notifications')
        .insert({
          user_id: business.user_id,
          title: 'Demande de logo reçue',
          message: `Un administrateur a demandé un logo pour votre établissement "${business.name}". Veuillez ajouter un logo dans votre tableau de bord pour améliorer la visibilité de votre entreprise.`,
          type: 'logo_request',
          link: '/dashboard/edit-profile',
          is_read: false
        });

      if (notificationError) {
        console.error('Error sending logo request notification:', notificationError);
        // Don't return error here as the main action succeeded
      }
    }

    revalidatePath('/admin/etablissements');

    // Log the action (if possible, or just revalidate)
    try {
      await logAuditAction({
        adminId,
        action: 'REQUEST_LOGO',
        targetType: 'business',
        targetId: businessId
      });
    } catch (e) {
      logger.warn('Failed to log logo request audit', { businessId });
    }

    return {
      status: 'success',
      message: 'Demande de logo marquée pour cet établissement.'
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

/**
 * Update global site settings and invalidate cache
 */
export async function updateSiteSettings(settings: any): Promise<AdminActionResult> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();
    await enforceAdminPermission(serviceClient, adminId, 'settings.write');
    const payload = { ...settings, id: 'main', updated_at: new Date().toISOString() };

    // Keep legacy/new pricing aliases synchronized to prevent UI drift:
    // admin page writes tier_pro_* while parts of the app still read tier_gold_* first.
    if (Object.hasOwn(payload, 'tier_pro_monthly_price') && !Object.hasOwn(payload, 'tier_gold_monthly_price')) {
      payload.tier_gold_monthly_price = payload.tier_pro_monthly_price;
    }
    if (Object.hasOwn(payload, 'tier_pro_annual_price') && !Object.hasOwn(payload, 'tier_gold_annual_price')) {
      payload.tier_gold_annual_price = payload.tier_pro_annual_price;
    }
    if (Object.hasOwn(payload, 'tier_gold_monthly_price') && !Object.hasOwn(payload, 'tier_pro_monthly_price')) {
      payload.tier_pro_monthly_price = payload.tier_gold_monthly_price;
    }
    if (Object.hasOwn(payload, 'tier_gold_annual_price') && !Object.hasOwn(payload, 'tier_pro_annual_price')) {
      payload.tier_pro_annual_price = payload.tier_gold_annual_price;
    }

    const { error: updateError, data: updatedRows } = await serviceClient
      .from('site_settings')
      .update(payload)
      .eq('id', 'main')
      .select('id');

    if (updateError) {
      return { status: 'error', message: `Erreur: ${updateError.message}` };
    }

    if (!updatedRows || updatedRows.length === 0) {
      const { error: insertError } = await serviceClient
        .from('site_settings')
        .insert(payload);

      if (insertError) {
        return { status: 'error', message: `Erreur: ${insertError.message}` };
      }
    }

    // Invalidate site settings cache
    revalidateTag('site-settings');
    revalidatePath('/');

    // Log the action
    try {
      await logAuditAction({
        adminId,
        action: 'UPDATE_SITE_SETTINGS',
        targetType: 'site_settings',
        targetId: 'main',
        details: { keys: Object.keys(settings) }
      });
    } catch (e) {
      logger.warn('Failed to log site settings update audit');
    }

    return {
      status: 'success',
      message: 'Paramètres mis à jour et cache vidé avec succès.'
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

/**
 * Toggle maintenance mode directly
 */
export async function toggleMaintenanceMode(
  enabled: boolean,
  options?: { reason?: string; confirmationText?: string }
): Promise<AdminActionResult> {
  const adminId = await verifyAdminSession();
  const serviceClient = await createAdminClient();
  await enforceAdminPermission(serviceClient, adminId, 'settings.maintenance.toggle');

  const reason = String(options?.reason || '').trim();
  if (reason.length < 10) {
    return { status: 'error', message: 'Une raison detaillee (10+ caracteres) est obligatoire.' };
  }

  const expectedConfirmation = enabled ? 'ENABLE_MAINTENANCE' : 'DISABLE_MAINTENANCE';
  const confirmationText = String(options?.confirmationText || '').trim();
  if (confirmationText !== expectedConfirmation) {
    return { status: 'error', message: `Confirmation invalide. Saisissez '${expectedConfirmation}'.` };
  }

  const { error } = await serviceClient
    .from('site_settings')
    .update({
      maintenance_mode: enabled,
      updated_at: new Date().toISOString()
    })
    .eq('id', 'main');

  if (error) {
    return { status: 'error', message: `Erreur: ${error.message}` };
  }

  // Invalidate site settings cache
  revalidateTag('site-settings');
  revalidatePath('/');

  // Log the action
  await logAuditAction({
    adminId,
    action: 'TOGGLE_MAINTENANCE',
    targetType: 'site_settings',
    targetId: 'main',
    details: {
      maintenance_mode: enabled,
      reason,
      confirmation_text: confirmationText,
    }
  });

  return {
    status: 'success',
    message: enabled ? 'Mode maintenance ACTIVÉ' : 'Mode maintenance DÉSACTIVÉ'
  };
}

/**
 * Generate monthly salary report snapshot ("Barometre des salaires").
 * Requires migration: 20260217220000_salary_phase3_monthly_reporting.sql
 */
export async function generateSalaryMonthlyReport(
  options?: { reportMonth?: string; publish?: boolean }
): Promise<AdminActionResult> {
  try {
    await verifyAdminSession();
    const serviceClient = await createAdminClient();

    const reportMonth = options?.reportMonth
      ? new Date(options.reportMonth).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const { data, error } = await serviceClient.rpc('generate_salary_monthly_report', {
      p_report_month: reportMonth,
      p_publish: !!options?.publish,
    });

    if (error) {
      return { status: 'error', message: `Erreur: ${error.message}` };
    }

    revalidatePath('/admin/statistiques');
    revalidatePath('/salaires');

    return {
      status: 'success',
      message: options?.publish
        ? 'Barometre genere et publie.'
        : 'Barometre genere en brouillon.',
      data,
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

export type SalaryLeaderboardRow = {
  businessId: string;
  businessName: string;
  city: string;
  category: string;
  metricValue: number;
  avgMonthlySalary: number;
  medianMonthlySalary: number;
  p90MonthlySalary: number;
  submissionCount: number;
};

type SalaryCustomReportsData = {
  callCenterCasablanca: SalaryLeaderboardRow[];
  trainees: SalaryLeaderboardRow[];
  generatedAt: string;
};

type SalaryReportMetric = 'avg' | 'median' | 'p90';

export type SalaryReportBuilderInput = {
  city?: string;
  category?: string;
  jobTitleKeyword?: string;
  employmentType?: 'all' | 'full_time' | 'part_time' | 'contract' | 'intern';
  minSamples?: number;
  limit?: number;
  metric?: SalaryReportMetric;
};

export type SalaryReportBuilderData = {
  filters: Required<SalaryReportBuilderInput>;
  generatedAt: string;
  rows: SalaryLeaderboardRow[];
};

function normalizeText(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function looksLikeCallCenterRole(jobTitle: string, category: string): boolean {
  const text = `${jobTitle} ${category}`;
  return (
    text.includes('call center')
    || text.includes('call-center')
    || text.includes("centre d'appel")
    || text.includes('centre appel')
    || text.includes('teleconseiller')
    || text.includes('telesales')
  );
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function aggregateLeaderboard(
  rows: Array<{
    business_id: string | null;
    salary_monthly_normalized: number | null;
    businesses: { name?: string | null; city?: string | null; category?: string | null } | null;
  }>,
  metric: SalaryReportMetric = 'avg',
  minSamples = 5,
  limit = 10
): SalaryLeaderboardRow[] {
  const map = new Map<string, { name: string; city: string; category: string; values: number[] }>();

  for (const row of rows) {
    const businessId = row.business_id || '';
    const salary = Number(row.salary_monthly_normalized || 0);
    if (!businessId || !Number.isFinite(salary) || salary <= 0) continue;

    const businessName = String(row.businesses?.name || businessId);
    const city = String(row.businesses?.city || 'Non defini');
    const category = String(row.businesses?.category || 'Non defini');
    const current = map.get(businessId);
    if (!current) {
      map.set(businessId, { name: businessName, city, category, values: [salary] });
    } else {
      current.values.push(salary);
      map.set(businessId, current);
    }
  }

  return Array.from(map.entries())
    .map(([businessId, value]) => {
      const avg = value.values.reduce((sum, v) => sum + v, 0) / value.values.length;
      const med = median(value.values);
      const p90 = percentile(value.values, 0.9);
      const metricValue = metric === 'median' ? med : metric === 'p90' ? p90 : avg;

      return {
        businessId,
        businessName: value.name,
        city: value.city,
        category: value.category,
        metricValue: Number(metricValue.toFixed(2)),
        avgMonthlySalary: Number(avg.toFixed(2)),
        medianMonthlySalary: Number(med.toFixed(2)),
        p90MonthlySalary: Number(p90.toFixed(2)),
        submissionCount: value.values.length,
      };
    })
    .filter((item) => item.submissionCount >= minSamples)
    .sort((a, b) => b.metricValue - a.metricValue || b.submissionCount - a.submissionCount)
    .slice(0, limit);
}

export async function getSalaryReportBuilder(
  input?: SalaryReportBuilderInput
): Promise<AdminActionResult> {
  try {
    await verifyAdminSession();
    const serviceClient = await createAdminClient();

    const filters: Required<SalaryReportBuilderInput> = {
      city: String(input?.city || '').trim(),
      category: String(input?.category || '').trim(),
      jobTitleKeyword: String(input?.jobTitleKeyword || '').trim(),
      employmentType: (input?.employmentType || 'all') as Required<SalaryReportBuilderInput>['employmentType'],
      minSamples: Math.max(1, Math.min(Number(input?.minSamples || 5), 100)),
      limit: Math.max(1, Math.min(Number(input?.limit || 10), 50)),
      metric: (input?.metric || 'avg') as SalaryReportMetric,
    };

    const { data, error } = await serviceClient
      .from('salaries')
      .select(`
        business_id,
        salary_monthly_normalized,
        employment_type,
        job_title,
        status,
        businesses!inner(name, city, category)
      `)
      .eq('status', 'published')
      .not('salary_monthly_normalized', 'is', null)
      .gt('salary_monthly_normalized', 0)
      .limit(20000);

    if (error) {
      return { status: 'error', message: `Erreur: ${error.message}` };
    }

    const rows = (data || []) as Array<{
      business_id: string | null;
      salary_monthly_normalized: number | null;
      employment_type?: string | null;
      job_title?: string | null;
      status?: string | null;
      businesses: { name?: string | null; city?: string | null; category?: string | null } | null;
    }>;

    const filteredRows = rows.filter((row) => {
      const city = normalizeText(row.businesses?.city);
      const category = normalizeText(row.businesses?.category);
      const jobTitle = normalizeText(row.job_title);
      const employmentType = normalizeText(row.employment_type);

      if (filters.city && city !== normalizeText(filters.city)) return false;
      if (filters.category && !category.includes(normalizeText(filters.category))) return false;
      if (filters.jobTitleKeyword && !jobTitle.includes(normalizeText(filters.jobTitleKeyword))) return false;
      if (filters.employmentType !== 'all' && employmentType !== normalizeText(filters.employmentType)) return false;
      return true;
    });

    const result: SalaryReportBuilderData = {
      filters,
      generatedAt: new Date().toISOString(),
      rows: aggregateLeaderboard(filteredRows, filters.metric, filters.minSamples, filters.limit),
    };

    return {
      status: 'success',
      message: 'Rapport salaires genere.',
      data: result,
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

/**
 * Presets kept for quick business questions.
 */
export async function getSalaryCustomReports(): Promise<AdminActionResult> {
  try {
    const [callCenterRes, traineeRes] = await Promise.all([
      getSalaryReportBuilder({
        city: 'Casablanca',
        category: 'call center',
        metric: 'avg',
        minSamples: 5,
        limit: 10,
      }),
      getSalaryReportBuilder({
        employmentType: 'intern',
        metric: 'avg',
        minSamples: 5,
        limit: 10,
      }),
    ]);

    if (callCenterRes.status !== 'success') return callCenterRes;
    if (traineeRes.status !== 'success') return traineeRes;

    const callCenterData = callCenterRes.data as SalaryReportBuilderData;
    const traineeData = traineeRes.data as SalaryReportBuilderData;

    const result: SalaryCustomReportsData = {
      callCenterCasablanca: callCenterData.rows,
      trainees: traineeData.rows,
      generatedAt: new Date().toISOString(),
    };

    return {
      status: 'success',
      message: 'Rapports salaires personnalises generes.',
      data: result,
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}

/**
 * Delete a user completely (admin only)
 * This handles all related data and foreign key constraints properly
 */
export async function deleteUserCompletely(userId: string): Promise<AdminActionResult> {
  try {
    const adminId = await verifyAdminSession();
    const serviceClient = await createAdminClient();
    await enforceAdminPermission(serviceClient, adminId, 'user.delete');

    // Prevent admin from deleting themselves
    if (userId === adminId) {
      return { status: 'error', message: 'Vous ne pouvez pas supprimer votre propre compte.' };
    }

    // Check if target is also an admin
    const { data: targetProfile } = await serviceClient
      .from('profiles')
      .select('role, email')
      .eq('id', userId)
      .single();

    if (targetProfile?.role === 'admin') {
      return { status: 'error', message: 'Impossible de supprimer un administrateur.' };
    }

    // Call the database function to safely delete the user
    const { data, error } = await serviceClient
      .rpc('safe_delete_user', {
        user_id_param: userId
      });

    if (error) {
      console.error('Error calling safe_delete_user function:', error);
      return { status: 'error', message: `Erreur DB: ${error.message}` };
    }

    // Log the action
    await logAuditAction({
      adminId,
      action: 'DELETE_USER',
      targetType: 'user',
      targetId: userId,
      details: {
        email: targetProfile?.email,
        deletion_results: data
      }
    });

    revalidatePath('/admin/utilisateurs');

    return {
      status: 'success',
      message: `Utilisateur supprimé avec succès. ${data?.profile_deleted ? 'Profil supprimé.' : ''}`,
      data
    };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Une erreur est survenue.' };
  }
}
