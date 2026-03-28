import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitClaim } from '../claim';

vi.mock('@/lib/data', () => ({
  getSiteSettings: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/claims/workflow', () => ({
  getClaimUserContext: vi.fn(async () => ({
    currentUserProfile: null,
    existingClaims: [],
    isAdmin: false,
  })),
  getClaimEligibilityError: vi.fn(async () => null),
  resolveClaimBusiness: vi.fn(),
  syncClaimUserProfile: vi.fn(async () => ({ error: null })),
}));

vi.mock('@/lib/claims/submission', () => ({
  parseClaimFormSubmission: vi.fn(),
  getClaimProofPresence: vi.fn(() => ({
    hasDocumentProof: false,
    hasVideoProof: false,
  })),
  buildClaimProofStatus: vi.fn(),
  buildClaimRecordPayload: vi.fn(),
  buildRequestedBusinessUpdates: vi.fn(),
}));

vi.mock('@/lib/errors', () => ({
  handleValidationError: vi.fn((message: string, errors: Record<string, string[]>) => ({
    status: 'error',
    message,
    errors,
  })),
  handleDatabaseError: vi.fn(),
  handleAuthenticationError: vi.fn(),
  createErrorResponse: vi.fn((code: string, message: string) => ({
    status: 'error',
    code,
    message,
  })),
  createSuccessResponse: vi.fn(),
  logError: vi.fn(),
  ErrorCode: {
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  },
}));

vi.mock('@/lib/file-handlers', () => ({
  handleMultipleProofFiles: vi.fn(),
  buildProofDataUpdates: vi.fn(),
}));

vi.mock('@/lib/claims/server', () => ({
  createClaimVerificationCodeRecord: vi.fn(),
  sendClaimEmailVerificationCode: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  notifyAdmins: vi.fn(),
}));

describe('claim settings enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects proof methods that are disabled in admin settings', async () => {
    const { getSiteSettings } = await import('@/lib/data');
    const { createClient, createServiceClient } = await import('@/lib/supabase/server');
    const { parseClaimFormSubmission } = await import('@/lib/claims/submission');

    vi.mocked(getSiteSettings).mockResolvedValue({
      enable_claims: true,
      verification_methods: ['email', 'phone'],
    } as any);

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-1' } },
          error: null,
        })),
      },
    } as any);

    vi.mocked(createServiceClient).mockResolvedValue({} as any);

    vi.mocked(parseClaimFormSubmission).mockReturnValue({
      documentFile: null,
      videoFile: null,
      logoFile: null,
      coverFile: null,
      validatedFields: {
        success: true,
        data: {
          existingBusinessId: 'biz-1',
          businessName: 'Acme',
          category: 'Tech',
          subcategory: 'Software',
          address: '1 Main St',
          city: 'Casablanca',
          quartier: 'Maarif',
          phone: '',
          website: '',
          description: '',
          amenities: [],
          fullName: 'Test User',
          position: 'Owner',
          claimerType: 'owner',
          claimerTitle: '',
          email: 'owner@acme.ma',
          personalPhone: '+212600000000',
          proofMethods: ['video'],
          messageToAdmin: '',
        },
      },
    } as any);

    const result = await submitClaim({ status: 'idle', message: '' }, new FormData());

    expect(result.status).toBe('error');
    expect(result.message).toContain('Certaines methodes de verification');
    expect((result as any).errors?.proofMethods?.[0]).toContain('video');
  });
});
