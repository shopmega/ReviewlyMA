'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, verifyAdminPermission } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit-logger';

export type AdminMessageRow = {
  id: string;
  business_id: string;
  sender_id: string | null;
  sender_name: string | null;
  sender_email: string | null;
  content: string;
  is_from_business: boolean;
  moderation_status: 'visible' | 'hidden';
  moderation_notes: string | null;
  moderated_at: string | null;
  moderated_by: string | null;
  read_at: string | null;
  created_at: string;
  businesses?: { name: string; slug?: string | null } | null;
};

export async function getAdminMessages(filters?: {
  source?: 'all' | 'inbound' | 'business';
  read?: 'all' | 'unread' | 'read';
  moderation?: 'all' | 'visible' | 'hidden';
}): Promise<AdminMessageRow[]> {
  await verifyAdminPermission('support.manage');
  const supabase = await createAdminClient();

  let query = supabase
    .from('messages')
    .select('id,business_id,sender_id,sender_name,sender_email,content,is_from_business,moderation_status,moderation_notes,moderated_at,moderated_by,read_at,created_at,businesses(name,slug)');

  if (filters?.source === 'inbound') {
    query = query.eq('is_from_business', false);
  } else if (filters?.source === 'business') {
    query = query.eq('is_from_business', true);
  }

  if (filters?.read === 'unread') {
    query = query.is('read_at', null);
  } else if (filters?.read === 'read') {
    query = query.not('read_at', 'is', null);
  }

  if (filters?.moderation === 'visible') {
    query = query.eq('moderation_status', 'visible');
  } else if (filters?.moderation === 'hidden') {
    query = query.eq('moderation_status', 'hidden');
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(250);
  if (error) {
    throw new Error(`Erreur chargement messages: ${error.message}`);
  }

  return ((data || []) as any[]).map((row) => ({
    ...row,
    businesses: Array.isArray(row.businesses) ? (row.businesses[0] ?? null) : row.businesses ?? null,
  })) as AdminMessageRow[];
}

export async function markAdminMessagesRead(messageIds: string[]): Promise<{ status: 'success' | 'error'; message: string }> {
  await verifyAdminPermission('support.manage');
  if (!messageIds.length) {
    return { status: 'success', message: 'Aucun message a marquer.' };
  }

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .in('id', messageIds)
    .is('read_at', null);

  if (error) {
    return { status: 'error', message: error.message };
  }

  revalidatePath('/admin/messages');
  revalidatePath('/dashboard/messages');
  return { status: 'success', message: 'Messages marques comme lus.' };
}

export async function moderateAdminMessage(input: {
  messageId: string;
  moderationStatus: 'visible' | 'hidden';
  moderationNotes?: string | null;
}): Promise<{ status: 'success' | 'error'; message: string }> {
  const adminId = await verifyAdminPermission('support.manage');
  const supabase = await createAdminClient();

  const updates = {
    moderation_status: input.moderationStatus,
    moderation_notes: input.moderationNotes?.trim() || null,
    moderated_at: new Date().toISOString(),
    moderated_by: adminId,
  };

  const { error } = await supabase
    .from('messages')
    .update(updates)
    .eq('id', input.messageId);

  if (error) {
    return { status: 'error', message: error.message };
  }

  try {
    await logAuditAction({
      adminId,
      action: input.moderationStatus === 'hidden' ? 'HIDE_MESSAGE' : 'RESTORE_MESSAGE',
      targetType: 'message',
      targetId: input.messageId,
      details: {
        moderation_status: input.moderationStatus,
        has_notes: Boolean(updates.moderation_notes),
      },
    });
  } catch {
    // Best effort only.
  }

  revalidatePath('/admin/messages');
  revalidatePath('/dashboard/messages');
  return {
    status: 'success',
    message: input.moderationStatus === 'hidden' ? 'Message masque pour les surfaces produit.' : 'Message restaure.',
  };
}
