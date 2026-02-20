import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  markAllUserSupportTicketsAsRead,
  markSupportTicketAsRead,
  sendSupportMessage,
} from '../support';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { verifyAdminSession } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email-service';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  verifyAdminSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/email-service', () => ({
  sendEmail: vi.fn(async () => undefined),
  emailTemplates: {
    supportResponse: {
      subject: (ticketSubject: string) => `Support: ${ticketSubject}`,
      html: ({ adminMessage }: any) => `<p>${adminMessage}</p>`,
    },
  },
}));

vi.mock('@/lib/data', () => ({
  getSiteSettings: vi.fn(async () => ({ site_name: 'Reviewly' })),
}));

vi.mock('@/lib/site-config', () => ({
  getServerSiteUrl: vi.fn(() => 'https://reviewly.ma'),
  getSiteName: vi.fn(() => 'Reviewly'),
}));

describe('Support Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('markAllUserSupportTicketsAsRead should fail for unauthenticated user', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      },
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const result = await markAllUserSupportTicketsAsRead();

    expect(result.status).toBe('error');
  });

  it('markAllUserSupportTicketsAsRead should update only unread user tickets', async () => {
    const eqSecondSpy = vi.fn(async () => ({ error: null }));
    const eqFirstSpy = vi.fn(() => ({ eq: eqSecondSpy }));
    const updateSpy = vi.fn(() => ({ eq: eqFirstSpy }));

    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: vi.fn(() => ({
        update: updateSpy,
      })),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const result = await markAllUserSupportTicketsAsRead();

    expect(result.status).toBe('success');
    expect(updateSpy).toHaveBeenCalledWith({ is_read_by_user: true });
    expect(eqFirstSpy).toHaveBeenCalledWith('user_id', 'user-1');
    expect(eqSecondSpy).toHaveBeenCalledWith('is_read_by_user', false);
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/support');
  });

  it('sendSupportMessage should set unread flags for user sender', async () => {
    vi.mocked(verifyAdminSession).mockRejectedValueOnce(new Error('not admin'));

    const ticketUpdateEqSpy = vi.fn(async () => ({ error: null }));
    const insertSpy = vi.fn(async () => ({ error: null }));
    const ticketUpdateSpy = vi.fn((payload: any) => {
      expect(payload).toEqual(
        expect.objectContaining({
          is_read_by_admin: false,
          is_read_by_user: true,
        })
      );
      return { eq: ticketUpdateEqSpy };
    });

    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: vi.fn((table: string) => {
        if (table === 'support_ticket_messages') {
          return { insert: insertSpy };
        }
        if (table === 'support_tickets') {
          return { update: ticketUpdateSpy };
        }
        return {};
      }),
    };

    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const result = await sendSupportMessage('ticket-1', 'hello');

    expect(result.status).toBe('success');
    expect(insertSpy).toHaveBeenCalledWith({
      ticket_id: 'ticket-1',
      sender_id: 'user-1',
      message: 'hello',
    });
    expect(ticketUpdateEqSpy).toHaveBeenCalledWith('id', 'ticket-1');
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/support');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/support');
  });

  it('sendSupportMessage should set unread flags for admin sender and send email', async () => {
    vi.mocked(verifyAdminSession).mockResolvedValueOnce('admin-1');

    const ticketUpdateEqSpy = vi.fn(async () => ({ error: null }));
    const insertSpy = vi.fn(async () => ({ error: null }));
    const ticketUpdateSpy = vi.fn((payload: any) => {
      expect(payload).toEqual(
        expect.objectContaining({
          is_read_by_admin: true,
          is_read_by_user: false,
        })
      );
      return { eq: ticketUpdateEqSpy };
    });

    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'admin-1' } }, error: null })),
      },
      from: vi.fn((table: string) => {
        if (table === 'support_ticket_messages') {
          return { insert: insertSpy };
        }
        if (table === 'support_tickets') {
          return { update: ticketUpdateSpy };
        }
        return {};
      }),
    };

    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: {
                subject: 'Billing issue',
                profiles: { full_name: 'User A', email: 'user@example.com' },
              },
            })),
          })),
        })),
      })),
    };

    vi.mocked(createClient).mockResolvedValue(supabase as any);
    vi.mocked(createServiceClient).mockResolvedValue(serviceClient as any);

    const result = await sendSupportMessage('ticket-2', 'admin reply');

    expect(result.status).toBe('success');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(ticketUpdateEqSpy).toHaveBeenCalledWith('id', 'ticket-2');
  });

  it('markSupportTicketAsRead should use service client for admin role', async () => {
    vi.mocked(verifyAdminSession).mockResolvedValueOnce('admin-1');

    const serviceUpdateEqSpy = vi.fn(async () => ({ error: null }));
    const serviceClient = {
      from: vi.fn(() => ({
        update: vi.fn((payload: any) => {
          expect(payload).toEqual({ is_read_by_admin: true });
          return { eq: serviceUpdateEqSpy };
        }),
      })),
    };

    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'admin-1' } }, error: null })),
      },
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      })),
    };

    vi.mocked(createClient).mockResolvedValue(supabase as any);
    vi.mocked(createServiceClient).mockResolvedValue(serviceClient as any);

    const result = await markSupportTicketAsRead('ticket-3', 'admin');

    expect(result.status).toBe('success');
    expect(serviceUpdateEqSpy).toHaveBeenCalledWith('id', 'ticket-3');
  });
});
