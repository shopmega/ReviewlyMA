import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  suggestBusiness,
  reportMedia,
  submitUpdate,
  updateBusinessProfile,
  updateBusinessImagesAction,
  saveBusinessHours,
  getBusinessHours,
} from '../business';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase/server';
import { notifyAdmins } from '@/lib/notifications';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  notifyAdmins: vi.fn(() => Promise.resolve()),
}));

function buildAuthClient(options: {
  userId?: string | null;
  businessSuggestionError?: { message: string } | null;
  mediaReportError?: { message: string } | null;
  hoursData?: any[];
  hoursError?: { message: string } | null;
} = {}) {
  return {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: options.userId ? { id: options.userId } : null },
          error: null,
        })
      ),
    },
    from: vi.fn((table: string) => {
      if (table === 'business_suggestions') {
        return {
          insert: vi.fn(() =>
            Promise.resolve({ error: options.businessSuggestionError ?? null })
          ),
        };
      }
      if (table === 'media_reports') {
        return {
          insert: vi.fn(() => Promise.resolve({ error: options.mediaReportError ?? null })),
        };
      }
      if (table === 'business_hours') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: options.hoursData ?? [],
                error: options.hoursError ?? null,
              })
            ),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null, data: [] })),
        })),
      };
    }),
  };
}

describe('Business CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServiceClient).mockResolvedValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
      rpc: vi.fn(() => Promise.resolve({ error: null })),
    } as any);
  });

  it('suggestBusiness should validate required fields', async () => {
    vi.mocked(createServerClient).mockReturnValue(buildAuthClient({ userId: 'u1' }) as any);

    const result = await suggestBusiness(new FormData());

    expect(result.status).toBe('error');
    expect(result.message).toContain('champs');
  });

  it('suggestBusiness should require authentication', async () => {
    const formData = new FormData();
    formData.append('name', 'Test');
    formData.append('category', 'Cafe');
    formData.append('city', 'Rabat');

    vi.mocked(createServerClient).mockReturnValue(buildAuthClient({ userId: null }) as any);

    const result = await suggestBusiness(formData);

    expect(result.status).toBe('error');
  });

  it('suggestBusiness should return success for authenticated valid submission', async () => {
    const formData = new FormData();
    formData.append('name', 'Test');
    formData.append('category', 'Cafe');
    formData.append('city', 'Rabat');
    formData.append('address', '1 Main St');

    vi.mocked(createServerClient).mockReturnValue(buildAuthClient({ userId: 'u1' }) as any);

    const result = await suggestBusiness(formData);

    expect(result.status).toBe('success');
  });

  it('reportMedia should insert report and notify admins', async () => {
    vi.mocked(createServerClient).mockReturnValue(buildAuthClient({ userId: 'u1' }) as any);

    const result = await reportMedia({
      media_url: 'https://example.com/image.jpg',
      media_type: 'image',
      business_id: 'biz-1',
      reason: 'other',
      details: 'test',
    });

    expect(result.status).toBe('success');
    expect(notifyAdmins).toHaveBeenCalledTimes(1);
  });

  it('reportMedia should require authentication', async () => {
    vi.mocked(createServerClient).mockReturnValue(buildAuthClient({ userId: null }) as any);

    const result = await reportMedia({
      media_url: 'https://example.com/image.jpg',
      media_type: 'image',
      business_id: 'biz-1',
      reason: 'other',
      details: 'test',
    });

    expect(result.status).toBe('error');
    expect(result.message).toContain('connecte');
  });

  it('reportMedia should validate payload', async () => {
    vi.mocked(createServerClient).mockReturnValue(buildAuthClient({ userId: 'u1' }) as any);

    const result = await reportMedia({
      media_url: 'not-a-valid-url',
      media_type: 'image',
      business_id: 'biz-1',
      reason: 'other',
      details: 'test',
    } as any);

    expect(result.status).toBe('error');
    expect(result.message).toContain('invalides');
  });

  it('reportMedia should not notify admins when insert fails', async () => {
    vi.mocked(createServerClient).mockReturnValue(
      buildAuthClient({
        userId: 'u1',
        mediaReportError: { message: 'insert failed' },
      }) as any
    );

    const result = await reportMedia({
      media_url: 'https://example.com/image.jpg',
      media_type: 'image',
      business_id: 'biz-1',
      reason: 'other',
      details: 'test',
    });

    expect(result.status).toBe('error');
    expect(notifyAdmins).not.toHaveBeenCalled();
  });

  it('submitUpdate should fail for unauthenticated user', async () => {
    vi.mocked(createServerClient).mockReturnValue(buildAuthClient({ userId: null }) as any);

    const formData = new FormData();
    formData.append('businessId', 'biz-1');
    formData.append('updateTitle', 'Title');
    formData.append('updateText', 'Body');

    const result = await submitUpdate({ status: 'idle' } as any, formData);

    expect(result.status).toBe('error');
  });

  it('updateBusinessProfile should fail for unauthenticated user', async () => {
    vi.mocked(createServerClient).mockReturnValue(buildAuthClient({ userId: null }) as any);

    const formData = new FormData();
    formData.append('businessId', 'biz-1');

    const result = await updateBusinessProfile({ status: 'idle' } as any, formData);

    expect(result.status).toBe('error');
  });

  it('updateBusinessImagesAction should fail for unauthenticated user', async () => {
    vi.mocked(createServerClient).mockReturnValue(buildAuthClient({ userId: null }) as any);

    const result = await updateBusinessImagesAction('biz-1', { logo_url: 'https://example.com/logo.png' });

    expect(result.status).toBe('error');
  });

  it('saveBusinessHours should fail for unauthenticated user', async () => {
    vi.mocked(createServerClient).mockReturnValue(buildAuthClient({ userId: null }) as any);

    const result = await saveBusinessHours([], 'biz-1');

    expect(result.status).toBe('error');
  });

  it('getBusinessHours should return hours array when query succeeds', async () => {
    const hours = [{ day_of_week: 1, open_time: '09:00', close_time: '17:00', is_closed: false }];
    vi.mocked(createServerClient).mockReturnValue(
      buildAuthClient({
        userId: 'u1',
        hoursData: hours,
      }) as any
    );

    const result = await getBusinessHours('biz-1');

    expect(result).toEqual(hours);
  });

  it('getBusinessHours should return empty array when query fails', async () => {
    vi.mocked(createServerClient).mockReturnValue(
      buildAuthClient({
        userId: 'u1',
        hoursData: null as any,
        hoursError: { message: 'query failed' },
      }) as any
    );

    const result = await getBusinessHours('biz-1');

    expect(result).toEqual([]);
  });
});
