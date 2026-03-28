import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAdminClaimsPageData } from '../claim-admin-data';
import { createAdminClient, verifyAdminPermission } from '@/lib/supabase/admin';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
  verifyAdminPermission: vi.fn(),
}));

describe('claim admin data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdminPermission).mockResolvedValue('admin-1');
  });

  it('loads claims and verification methods through permission-checked server access', async () => {
    const claimsPendingQuery = {
      order: vi.fn(() => Promise.resolve({
        data: [
          {
            id: 'claim-1',
            business_id: 'biz-1',
            full_name: 'Owner',
            job_title: 'Founder',
            email: 'owner@example.com',
            status: 'pending',
            claim_state: 'verification_pending',
            created_at: '2026-03-27T00:00:00.000Z',
          },
        ],
        error: null,
      })),
    };

    const claimsBaseQuery = {
      or: vi.fn(() => claimsPendingQuery),
      order: vi.fn(() => Promise.resolve({
        data: [
          {
            id: 'claim-1',
            business_id: 'biz-1',
            full_name: 'Owner',
            job_title: 'Founder',
            email: 'owner@example.com',
            status: 'pending',
            claim_state: 'verification_pending',
            created_at: '2026-03-27T00:00:00.000Z',
          },
        ],
        error: null,
      })),
    };

    const settingsMaybeSingle = vi.fn(() => Promise.resolve({
      data: { verification_methods: ['email', 'document'] },
      error: null,
    }));

    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'business_claims') {
          return {
            select: vi.fn(() => claimsBaseQuery),
          };
        }

        if (table === 'site_settings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: settingsMaybeSingle,
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    vi.mocked(createAdminClient).mockResolvedValue(serviceClient as any);

    const result = await getAdminClaimsPageData('pending');

    expect(verifyAdminPermission).toHaveBeenCalledWith('moderation.claim.review');
    expect(result.claims).toHaveLength(1);
    expect(result.verificationMethods).toEqual(['email', 'document']);
    expect(claimsBaseQuery.or).toHaveBeenCalledWith('claim_state.eq.verification_pending,status.eq.pending');
  });
});
