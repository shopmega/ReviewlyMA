export type ClaimFormData = {
  businessName: string;
  category: string;
  subcategory: string;
  city: string;
  quartier: string;
  address: string;
  phone: string;
  website: string;
  description: string;
  priceLevel: string;
  fullName: string;
  position: string;
  claimerType: string;
  claimerTitle: string;
  email: string;
  personalPhone: string;
  messageToAdmin: string;
};

export type ClaimProofData = {
  documentFile: File | null;
  videoFile: File | null;
};

export type ClaimDraftData = {
  formData: ClaimFormData;
  selectedAmenities: string[];
  selectedProofMethods: string[];
  proofData: ClaimProofData;
  step: number;
  timestamp: number;
};

export const CLAIM_DRAFT_STORAGE_KEY = 'claimFormDraft';

export const EMPTY_CLAIM_FORM_DATA: ClaimFormData = {
  businessName: '',
  category: '',
  subcategory: '',
  city: '',
  quartier: '',
  address: '',
  phone: '',
  website: '',
  description: '',
  priceLevel: '',
  fullName: '',
  position: '',
  claimerType: 'owner',
  claimerTitle: '',
  email: '',
  personalPhone: '',
  messageToAdmin: '',
};

export const EMPTY_CLAIM_PROOF_DATA: ClaimProofData = {
  documentFile: null,
  videoFile: null,
};

const CLAIM_FORM_FIELDS: Array<keyof ClaimFormData> = [
  'businessName',
  'category',
  'subcategory',
  'city',
  'quartier',
  'address',
  'phone',
  'website',
  'description',
  'priceLevel',
  'fullName',
  'position',
  'claimerType',
  'claimerTitle',
  'email',
  'personalPhone',
  'messageToAdmin',
];

export function syncClaimFormDataFromForm(form: HTMLFormElement | null, previousData: ClaimFormData): ClaimFormData {
  if (!form) {
    return previousData;
  }

  const data = new FormData(form);
  let changed = false;
  const next = { ...previousData };

  for (const field of CLAIM_FORM_FIELDS) {
    const value = data.get(field);
    if (typeof value === 'string' && value !== previousData[field]) {
      next[field] = value;
      changed = true;
    }
  }

  return changed ? next : previousData;
}

export function readClaimDraft(): ClaimDraftData | null {
  const savedDraft = localStorage.getItem(CLAIM_DRAFT_STORAGE_KEY);
  if (!savedDraft) {
    return null;
  }

  try {
    const draft = JSON.parse(savedDraft) as Partial<ClaimDraftData>;
    return {
      formData: { ...EMPTY_CLAIM_FORM_DATA, ...(draft.formData || {}) },
      selectedAmenities: Array.isArray(draft.selectedAmenities) ? draft.selectedAmenities : [],
      selectedProofMethods: Array.isArray(draft.selectedProofMethods) ? draft.selectedProofMethods : [],
      proofData: { ...EMPTY_CLAIM_PROOF_DATA, ...(draft.proofData || {}) },
      step: typeof draft.step === 'number' ? draft.step : 1,
      timestamp: typeof draft.timestamp === 'number' ? draft.timestamp : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeClaimDraft(input: {
  formData: ClaimFormData;
  selectedAmenities: string[];
  selectedProofMethods: string[];
  proofData: ClaimProofData;
  step: number;
}) {
  const draft: ClaimDraftData = {
    formData: input.formData,
    selectedAmenities: input.selectedAmenities,
    selectedProofMethods: input.selectedProofMethods,
    proofData: {
      documentFile: null,
      videoFile: null,
    },
    step: input.step,
    timestamp: Date.now(),
  };

  localStorage.setItem(CLAIM_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearClaimDraft() {
  localStorage.removeItem(CLAIM_DRAFT_STORAGE_KEY);
}

export async function attachUploadedClaimProofs(input: {
  formData: FormData;
  selectedProofMethods: string[];
  proofData: ClaimProofData;
  uploadFile: (file: File, bucket: string, path: string) => Promise<string>;
}) {
  const { formData, selectedProofMethods, proofData, uploadFile } = input;
  const timestamp = Date.now();

  if (selectedProofMethods.includes('document') && proofData.documentFile) {
    const path = `claims/temp/${timestamp}-${proofData.documentFile.name}`;
    const uploadedPath = await uploadFile(proofData.documentFile, 'claim-proofs', path);
    formData.set('documentFile', uploadedPath);
  }

  if (selectedProofMethods.includes('video') && proofData.videoFile) {
    const path = `claims/temp/${timestamp}-${proofData.videoFile.name}`;
    const uploadedPath = await uploadFile(proofData.videoFile, 'claim-proofs', path);
    formData.set('videoFile', uploadedPath);
  }
}
