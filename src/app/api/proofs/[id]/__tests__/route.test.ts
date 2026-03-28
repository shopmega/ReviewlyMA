import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const adminLimiterMock = vi.fn(
  async (
    request: NextRequest,
    handler: (request: NextRequest) => Promise<Response>
  ) => handler(request)
);

const createSignedUrlMock = vi.fn();
const singleClaimMock = vi.fn();
const verifyAdminPermissionMock = vi.fn();

const fromMock = vi.fn((table: string) => {
  if (table === 'business_claims') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: singleClaimMock,
        })),
      })),
    };
  }
  return { select: vi.fn() };
});

const createAdminClientMock = vi.fn(async () => ({
  from: fromMock,
  storage: {
    from: vi.fn(() => ({
      createSignedUrl: createSignedUrlMock,
    })),
  },
}));

vi.mock('@/lib/api-rate-limiter', () => ({
  rateLimitByEndpoint: {
    admin: (request: NextRequest, handler: (request: NextRequest) => Promise<Response>) =>
      adminLimiterMock(request, handler),
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
  verifyAdminPermission: (...args: any[]) => verifyAdminPermissionMock(...args),
}));

import { GET } from '../route';

describe('proofs [id] route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (process.env as any).NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    (process.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    (process.env as any).SUPABASE_SERVICE_ROLE_KEY = 'service-key';

    verifyAdminPermissionMock.mockResolvedValue('admin-1');
    singleClaimMock.mockResolvedValue({
      data: {
        proof_data: {
          document_url: 'docs/doc.pdf',
          video_url: 'video/proof.mp4',
          email_verified: true,
        },
        proof_methods: ['email', 'document'],
        email: 'owner@example.com',
        phone: '+212600000000',
      },
      error: null,
    });
    createSignedUrlMock
      .mockResolvedValueOnce({ data: { signedUrl: 'https://signed/doc' }, error: null })
      .mockResolvedValueOnce({ data: { signedUrl: 'https://signed/video' }, error: null });
  });

  it('returns 401 when user is not authenticated', async () => {
    verifyAdminPermissionMock.mockRejectedValueOnce(new Error('Non autorise: session invalide.'));
    const req = new NextRequest('https://example.com/api/proofs/claim-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'claim-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks proof permission', async () => {
    verifyAdminPermissionMock.mockRejectedValueOnce(new Error("Non autorise: permission 'moderation.claim.proofs' requise."));
    const req = new NextRequest('https://example.com/api/proofs/claim-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'claim-1' }) });
    expect(res.status).toBe(403);
  });

  it('returns 404 when claim does not exist', async () => {
    singleClaimMock.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });
    const req = new NextRequest('https://example.com/api/proofs/claim-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'claim-1' }) });
    expect(res.status).toBe(404);
  });

  it('returns signed urls and proof payload on success', async () => {
    const req = new NextRequest('https://example.com/api/proofs/claim-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'claim-1' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.claimId).toBe('claim-1');
    expect(json.signedUrls.document).toBe('https://signed/doc');
    expect(json.signedUrls.video).toBe('https://signed/video');
    expect(json.proofData.email_verified).toBe(true);
    expect(json.proofData.phone_verified).toBe(false);
    expect(adminLimiterMock).toHaveBeenCalled();
  });

  it('keeps null signed url and storageErrors when signing fails', async () => {
    createSignedUrlMock.mockReset();
    createSignedUrlMock
      .mockResolvedValueOnce({ data: null, error: { message: 'storage denied' } })
      .mockResolvedValueOnce({ data: { signedUrl: 'https://signed/video' }, error: null });

    const req = new NextRequest('https://example.com/api/proofs/claim-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'claim-1' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.signedUrls.document).toBeNull();
    expect(json.storageErrors.document).toBeTruthy();
    expect(json.signedUrls.video).toBe('https://signed/video');
  });
});
