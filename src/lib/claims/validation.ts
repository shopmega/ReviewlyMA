import type { ClaimFormData, ClaimProofData } from '@/lib/claims/client';

export function isClaimBusinessStepComplete(formData: ClaimFormData) {
  return Boolean(
    formData.businessName &&
    formData.category &&
    formData.subcategory &&
    formData.address &&
    formData.city &&
    formData.quartier,
  );
}

export function getMissingClaimBusinessFields(
  formData: ClaimFormData,
  labels: {
    businessName: string;
    category: string;
    subcategory: string;
    address: string;
    city: string;
    quartier: string;
  },
) {
  const missing: string[] = [];
  if (!formData.businessName) missing.push(labels.businessName);
  if (!formData.category) missing.push(labels.category);
  if (!formData.subcategory) missing.push(labels.subcategory);
  if (!formData.address) missing.push(labels.address);
  if (!formData.city) missing.push(labels.city);
  if (!formData.quartier) missing.push(labels.quartier);
  return missing;
}

export function getClaimProofRequirementState(selectedProofMethods: string[], proofData: ClaimProofData) {
  const documentMethodSelected = selectedProofMethods.includes('document');
  const videoMethodSelected = selectedProofMethods.includes('video');

  return {
    documentMethodSelected,
    videoMethodSelected,
    proofRequirementsMet:
      (!documentMethodSelected || !!proofData.documentFile) &&
      (!videoMethodSelected || !!proofData.videoFile),
  };
}

export function getMissingClaimIdentityFields(
  input: {
    formData: ClaimFormData;
    selectedProofMethods: string[];
    existingBusinessId?: string | null;
  },
  labels: {
    fullName: string;
    position: string;
    claimerType: string;
    claimerTitle: string;
    email: string;
    personalPhone: string;
    businessContact: string;
    verificationMethod: string;
  },
) {
  const { formData, selectedProofMethods, existingBusinessId } = input;
  const missing: string[] = [];

  if (!formData.fullName) missing.push(labels.fullName);
  if (!formData.position) missing.push(labels.position);
  if (!formData.claimerType) missing.push(labels.claimerType);
  if (formData.claimerType === 'other' && !formData.claimerTitle.trim()) missing.push(labels.claimerTitle);
  if (!formData.email) missing.push(labels.email);
  if (!formData.personalPhone) missing.push(labels.personalPhone);
  if (!existingBusinessId && !formData.phone.trim() && !formData.website.trim()) missing.push(labels.businessContact);
  if (selectedProofMethods.length === 0) missing.push(labels.verificationMethod);

  return missing;
}

export function canSubmitClaim(input: {
  formData: ClaimFormData;
  selectedProofMethods: string[];
  existingBusinessId?: string | null;
  proofRequirementsMet: boolean;
}) {
  const { formData, selectedProofMethods, existingBusinessId, proofRequirementsMet } = input;
  const professionalContactMet = !!existingBusinessId || !!formData.phone.trim() || !!formData.website.trim();

  return Boolean(
    isClaimBusinessStepComplete(formData) &&
      formData.fullName &&
      formData.position &&
      formData.claimerType &&
      (formData.claimerType !== 'other' || !!formData.claimerTitle.trim()) &&
      formData.email &&
      formData.personalPhone &&
      selectedProofMethods.length > 0 &&
      proofRequirementsMet &&
      professionalContactMet,
  );
}
