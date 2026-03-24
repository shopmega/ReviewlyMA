import { claimSchema } from '@/lib/types';

type ClaimSchemaData = {
  existingBusinessId?: string;
  businessName: string;
  category: string;
  subcategory: string;
  address: string;
  city: string;
  quartier: string;
  phone?: string;
  website?: string;
  description?: string;
  amenities: string[];
  fullName: string;
  position: string;
  claimerType: string;
  claimerTitle?: string;
  email: string;
  personalPhone: string;
  proofMethods: string[];
  messageToAdmin?: string;
};

export function parseClaimFormSubmission(formData: FormData) {
  const entries = Object.fromEntries(formData.entries());
  const amenities = (formData.get('amenities') as string)?.split(',').filter(Boolean) || [];
  const proofMethods = (formData.get('proofMethods') as string)?.split(',').filter(Boolean) || [];

  const documentFile = formData.get('documentFile') as File | string | null;
  const videoFile = formData.get('videoFile') as File | string | null;
  const logoFile = formData.get('logoFile') as File | null;
  const coverFile = formData.get('coverFile') as File | null;

  const dataForValidation = {
    ...entries,
    amenities,
    proofMethods,
    documentFile: undefined,
    videoFile: undefined,
    logoFile: undefined,
    coverFile: undefined,
    galleryFiles: undefined,
  };

  const validatedFields = claimSchema.safeParse(dataForValidation);

  return {
    entries,
    amenities,
    proofMethods,
    documentFile,
    videoFile,
    logoFile,
    coverFile,
    dataForValidation,
    validatedFields,
  };
}

export function getClaimProofPresence(input: {
  documentFile: File | string | null;
  videoFile: File | string | null;
}) {
  return {
    hasDocumentProof: typeof input.documentFile === 'string' ? input.documentFile.trim().length > 0 : !!input.documentFile,
    hasVideoProof: typeof input.videoFile === 'string' ? input.videoFile.trim().length > 0 : !!input.videoFile,
  };
}

export function buildRequestedBusinessUpdates(claimData: ClaimSchemaData) {
  const updates: Record<string, unknown> = {
    amenities: claimData.amenities,
  };

  if (claimData.description) {
    updates.description = claimData.description;
  }

  if (claimData.website) {
    updates.website = claimData.website;
  }

  if (claimData.phone) {
    updates.phone = claimData.phone;
  }

  return updates;
}

export function buildClaimBusinessPayload(claimData: ClaimSchemaData) {
  return {
    id: `${claimData.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
    name: claimData.businessName,
    type: 'commerce',
    category: claimData.category,
    subcategory: claimData.subcategory,
    city: claimData.city,
    quartier: claimData.quartier,
    location: `${claimData.address}, ${claimData.quartier}, ${claimData.city}`,
    description: claimData.description || 'A completer',
    website: claimData.website || null,
    amenities: claimData.amenities,
    overall_rating: 0,
    is_featured: false,
    logo_url: null,
    logo_hint: null,
    cover_url: null,
    cover_hint: null,
    tags: [],
  };
}

export function buildClaimProofStatus(input: {
  proofMethods: string[];
  hasDocumentProof: boolean;
  hasVideoProof: boolean;
}) {
  const { proofMethods, hasDocumentProof, hasVideoProof } = input;

  return proofMethods.reduce((acc, method) => {
    if (method === 'email' || method === 'phone') {
      acc[method] = 'pending';
    } else if (method === 'document') {
      acc[method] = hasDocumentProof ? 'pending_review' : 'pending';
    } else if (method === 'video') {
      acc[method] = hasVideoProof ? 'pending_review' : 'pending';
    } else {
      acc[method] = 'pending';
    }
    return acc;
  }, {} as Record<string, string>);
}

export function buildClaimRecordPayload(input: {
  userId: string;
  businessId: string;
  claimData: ClaimSchemaData;
  proofStatus: Record<string, string>;
  hasDocumentProof: boolean;
  hasVideoProof: boolean;
  isAdmin: boolean;
  requestedBusinessUpdates: Record<string, unknown>;
}) {
  const {
    userId,
    businessId,
    claimData,
    proofStatus,
    hasDocumentProof,
    hasVideoProof,
    isAdmin,
    requestedBusinessUpdates,
  } = input;

  return {
    user_id: userId,
    business_id: businessId,
    full_name: claimData.fullName,
    job_title: claimData.position,
    claimer_type: claimData.claimerType,
    claimer_title: claimData.claimerTitle || null,
    email: claimData.email,
    phone: claimData.personalPhone,
    status: 'pending',
    proof_methods: claimData.proofMethods,
    proof_status: proofStatus,
    proof_data: {
      email_verified: false,
      phone_verified: false,
      document_uploaded: hasDocumentProof,
      video_uploaded: hasVideoProof,
      verified_at: new Date().toISOString(),
      ...(claimData.existingBusinessId && !isAdmin && Object.keys(requestedBusinessUpdates).length > 0
        ? { requested_updates: requestedBusinessUpdates }
        : {}),
    },
    message: claimData.messageToAdmin,
  };
}
