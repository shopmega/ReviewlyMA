import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAdminMessages, markAdminMessagesRead, moderateAdminMessage } from '../admin-messages';
import { createAdminClient, verifyAdminPermission } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { logAuditAction } from '@/lib/audit-logger';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
  verifyAdminPermission: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/audit-logger', () => ({
  logAuditAction: vi.fn(async () => undefined),
}));

describe('admin messages actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdminPermission).mockResolvedValue('admin-1');
  });

  it('loads hidden messages when moderation filter is applied', async () => {
    const limit = vi.fn(async () => ({
      data: [
        {
          id: 'msg-1',
          business_id: 'biz-1',
          sender_id: null,
          sender_name: 'Candidate',
          sender_email: 'candidate@example.com',
          content: 'Please contact me.',
          is_from_business: false,
          moderation_status: 'hidden',
          moderation_notes: 'Off-platform solicitation',
          moderated_at: '2026-03-28T09:00:00.000Z',
          moderated_by: 'admin-1',
          read_at: null,
          created_at: '2026-03-28T08:00:00.000Z',
          businesses: { name: 'Acme', slug: 'acme' },
        },
      ],
      error: null,
    }));
    const order = vi.fn(() => ({ limit }));
    const eqModeration = vi.fn(() => ({ order }));
    const eqSource = vi.fn(() => ({ eq: eqModeration }));
    const select = vi.fn(() => ({ eq: eqSource }));

    vi.mocked(createAdminClient).mockResolvedValue({
      from: vi.fn(() => ({ select })),
    } as any);

    const result = await getAdminMessages({ source: 'inbound', read: 'all', moderation: 'hidden' });

    expect(verifyAdminPermission).toHaveBeenCalledWith('support.manage');
    expect(eqSource).toHaveBeenCalledWith('is_from_business', false);
    expect(eqModeration).toHaveBeenCalledWith('moderation_status', 'hidden');
    expect(result[0]?.moderation_notes).toBe('Off-platform solicitation');
  });

  it('marks unread messages as read', async () => {
    const is = vi.fn(async () => ({ error: null }));
    const update = vi.fn(() => ({ in: vi.fn(() => ({ is })) }));

    vi.mocked(createAdminClient).mockResolvedValue({
      from: vi.fn(() => ({ update })),
    } as any);

    const result = await markAdminMessagesRead(['msg-1', 'msg-2']);

    expect(result.status).toBe('success');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/messages');
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/messages');
  });

  it('hides a message and writes an audit record', async () => {
    const eq = vi.fn(async () => ({ error: null }));
    const update = vi.fn(() => ({ eq }));

    vi.mocked(createAdminClient).mockResolvedValue({
      from: vi.fn(() => ({ update })),
    } as any);

    const result = await moderateAdminMessage({
      messageId: 'msg-3',
      moderationStatus: 'hidden',
      moderationNotes: 'Pressure to remove a review',
    });

    expect(result.status).toBe('success');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      moderation_status: 'hidden',
      moderation_notes: 'Pressure to remove a review',
      moderated_by: 'admin-1',
    }));
    expect(eq).toHaveBeenCalledWith('id', 'msg-3');
    expect(logAuditAction).toHaveBeenCalledWith(expect.objectContaining({
      adminId: 'admin-1',
      action: 'HIDE_MESSAGE',
      targetType: 'message',
      targetId: 'msg-3',
    }));
  });
});
