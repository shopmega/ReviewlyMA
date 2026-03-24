'use client';

import { useState, useActionState, useEffect, useCallback, useMemo, useTransition, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { submitClaim, isBusinessClaimed } from '@/app/actions/claim';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import {
  attachUploadedClaimProofs,
  clearClaimDraft,
  EMPTY_CLAIM_FORM_DATA,
  EMPTY_CLAIM_PROOF_DATA,
  readClaimDraft,
  syncClaimFormDataFromForm,
  writeClaimDraft,
  type ClaimFormData,
  type ClaimProofData,
} from '@/lib/claims/client';
import {
  canSubmitClaim,
  getClaimProofRequirementState,
  getMissingClaimBusinessFields,
  getMissingClaimIdentityFields,
  isClaimBusinessStepComplete,
} from '@/lib/claims/validation';
import { MAIN_CATEGORIES, SUBCATEGORIES, ALL_CITIES, getQuartiersForCity, BENEFITS } from '@/lib/location-discovery';
import { useI18n } from '@/components/providers/i18n-provider';
import {
  ClaimBenefitsSidebar,
  ClaimBlockedState,
  ClaimLoadingFallback,
  ClaimProgressHeader,
  CLAIM_PROGRESS_ICONS,
} from '@/components/claim/ClaimPresentation';
import { ClaimBenefitsStep, ClaimBusinessDetailsStep, ClaimIdentityProofStep, ClaimReviewSubmitStep } from '@/components/claim/ClaimStepPanels';

function NewClaimContent() {
  const searchParams = useSearchParams();
  const existingBusinessId = searchParams.get('businessId');
  const router = useRouter();
  const { toast } = useToast();
  const { t, tf } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(submitClaim, { status: 'idle', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeProofMethods, setActiveProofMethods] = useState<string[]>(['email', 'phone', 'document', 'video']);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isBusinessAlreadyClaimed, setIsBusinessAlreadyClaimed] = useState(false);
  const [userClaimStatus, setUserClaimStatus] = useState<'none' | 'pending' | 'approved'>('none');
  const [existingClaim, setExistingClaim] = useState<any>(null);
  const hasLoadedDraft = useRef(false);
  const hasLoadedBusiness = useRef(false);

  useEffect(() => {
    if (existingBusinessId && !hasLoadedBusiness.current) {
      const checkClaimStatus = async () => {
        try {
          const claimed = await isBusinessClaimed(existingBusinessId);
          setIsBusinessAlreadyClaimed(claimed);

          if (claimed) {
            toast({
              title: t('claimNew.toast.alreadyClaimedTitle', 'Etablissement deja revendique'),
              description: t('claimNew.toast.alreadyClaimedDesc', 'Cette entreprise a deja ete revendiquee par un autre utilisateur.'),
              variant: 'destructive',
            });
          }
        } catch (error) {
          console.error('Error checking claim status:', error);
        }
      };

      checkClaimStatus();
    }
  }, [existingBusinessId]);

  // Check user's existing claim status
  useEffect(() => {
    const checkUserClaimStatus = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setUserClaimStatus('none');
          return;
        }

        // Check if user has an existing claim
        const { data: claims, error } = await supabase
          .from('business_claims')
          .select('*, business:businesses(name, logo_url)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error checking claim status:', error);
          setUserClaimStatus('none');
          return;
        }

        if (claims && claims.length > 0) {
          const claim = claims[0];
          setExistingClaim(claim);

          const isVerified = claim.status === 'approved' || claim.claim_state === 'verified';
          const isPending = claim.status === 'pending' || claim.claim_state === 'verification_pending';

          if (isVerified) {
            setUserClaimStatus('approved');
            toast({
              title: t('claimNew.toast.accessDeniedTitle', 'Acces refuse'),
              description: t('claimNew.toast.accessDeniedDesc', 'Vous gerez deja un etablissement valide. Redirection vers votre tableau de bord...'),
              variant: "destructive",
            });
            setTimeout(() => router.push('/dashboard'), 2500);
            return;
          } else if (isPending) {
            setUserClaimStatus('pending');
            toast({
              title: t('claimNew.toast.requestPendingTitle', 'Demande en cours'),
              description: t('claimNew.toast.requestPendingDesc', 'Vous avez deja une revendication en attente de validation.'),
            });
            setTimeout(() => router.push('/dashboard/pending'), 2500);
            return;
          }
        } else {
          setUserClaimStatus('none');
        }
      } catch (error) {
        console.error('Error checking user claim status:', error);
        setUserClaimStatus('none');
      }
    };

    checkUserClaimStatus();
  }, [router]);

  const [step, setStep] = useState(1);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedProofMethods, setSelectedProofMethods] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [formData, setFormData] = useState<ClaimFormData>(EMPTY_CLAIM_FORM_DATA);

  // Proof verification state
  const [proofData, setProofData] = useState<ClaimProofData>(EMPTY_CLAIM_PROOF_DATA);
  const proofMethods = useMemo(() => ([
    {
      value: 'email',
      label: t('claimNew.proof.email.label', 'Email professionnel'),
      description: t('claimNew.proof.email.description', 'Recevez un code sur votre email professionnel'),
    },
    {
      value: 'phone',
      label: t('claimNew.proof.phone.label', 'Telephone'),
      description: t('claimNew.proof.phone.description', "Recevez un SMS au numero de l'entreprise"),
    },
    {
      value: 'document',
      label: t('claimNew.proof.document.label', 'Document officiel'),
      description: t('claimNew.proof.document.description', 'Telechargez un extrait registre de commerce ou facture'),
    },
    {
      value: 'video',
      label: t('claimNew.proof.video.label', 'Video rapide'),
      description: t('claimNew.proof.video.description', "Enregistrez une video 10s montrant l'enseigne"),
    },
  ]), [t]);
  const claimerTypeOptions = useMemo(() => ([
    { value: 'owner', label: t('claimNew.claimerType.owner', 'Proprietaire') },
    { value: 'co_owner', label: t('claimNew.claimerType.coOwner', 'Co-proprietaire') },
    { value: 'legal_representative', label: t('claimNew.claimerType.legalRepresentative', 'Representant legal') },
    { value: 'manager', label: t('claimNew.claimerType.manager', 'Gerant / Manager') },
    { value: 'marketing_manager', label: t('claimNew.claimerType.marketingManager', 'Responsable marketing') },
    { value: 'agency_representative', label: t('claimNew.claimerType.agencyRepresentative', 'Agence mandatee') },
    { value: 'employee_delegate', label: t('claimNew.claimerType.employeeDelegate', 'Delegue interne') },
    { value: 'other', label: t('claimNew.claimerType.other', 'Autre') },
  ]), [t]);

  const syncFormDataFromDOM = useCallback(() => {
    setFormData(prev => syncClaimFormDataFromForm(formRef.current, prev));
  }, []);


  // Load draft data from localStorage on mount
  useEffect(() => {
    if (hasLoadedDraft.current) return;
    hasLoadedDraft.current = true;

    const draftData = readClaimDraft();
    if (draftData) {
      setFormData(draftData.formData);
      setSelectedAmenities(draftData.selectedAmenities);
      setSelectedProofMethods(draftData.selectedProofMethods);
      setProofData(draftData.proofData);
      setStep(draftData.step);

      toast({
        title: t('claimNew.toast.draftRestoredTitle', 'Brouillon recupere'),
        description: t('claimNew.toast.draftRestoredDesc', 'Vos donnees sauvegardees ont ete restaurees.'),
      });
    }
  }, []); // Only once on mount

  // Save draft to localStorage whenever form data changes
  useEffect(() => {
    writeClaimDraft({
      formData,
      selectedAmenities,
      selectedProofMethods,
      proofData,
      step,
    });
  }, [formData, selectedAmenities, selectedProofMethods, proofData, step]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Clear draft when form is successfully submitted
  useEffect(() => {
    const claimId = state.claimId || state.data?.claimId;
    if (state.status === 'success' && claimId) {
      clearClaimDraft();
    }
  }, [state.status, state.claimId, state.data]);

  async function loadVerificationSettings() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('site_settings')
        .select('verification_methods')
        .eq('id', 'main')
        .single();

      if (!error && data?.verification_methods && Array.isArray(data.verification_methods)) {
        setActiveProofMethods(data.verification_methods);
      }
    } catch (err) {
      console.error('Failed to load verification settings:', err);
      // Keep defaults if fetch fails
    } finally {
      setSettingsLoaded(true);
    }
  }

  // Update isSubmitting based on isPending
  useEffect(() => {
    if (!isPending && isSubmitting) {
      setIsSubmitting(false);
    }
  }, [isPending, isSubmitting]);

  useEffect(() => {
    const claimId = state.claimId || state.data?.claimId;

    if (state.status === 'success') {
      toast({
        title: t('common.success', 'Succes'),
        description: state.message,
      });

      if (claimId) {
        // Redirect after delay
        const timer = setTimeout(() => {
          router.push(`/dashboard/pending?claimId=${claimId}`);
        }, 1500);
        return () => clearTimeout(timer);
      } else {
        // Fallback redirect if no ID (should rely on fetching latest claim anyway)
        const timer = setTimeout(() => {
          router.push('/dashboard/pending');
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
    if (state.status === 'error' && state.message) {
      if (state.errors) {
        // Find the first error to scroll to or show in toast
        const errors = state.errors as Record<string, string[]>;
        const keys = Object.keys(errors);
        if (keys.length > 0) {
          const firstErrorField = keys[0];
          const messages = errors[firstErrorField];
          const firstErrorMessage = messages?.[0] || t('claimNew.toast.validationErrorTitle', 'Erreur de validation');
          toast({
            title: t('claimNew.toast.validationErrorTitle', 'Erreur de validation'),
            description: `${firstErrorField}: ${firstErrorMessage}`,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: t('common.error', 'Erreur'),
          description: state.message,
          variant: 'destructive',
        });
      }
    }
  }, [state.status, state.claimId, state.data, state.message, state.errors, toast, router]);

  // Load settings on mount
  useEffect(() => {
    if (!settingsLoaded) {
      loadVerificationSettings();
    }
  }, [settingsLoaded]);

  useEffect(() => {
    const timer = setTimeout(() => {
      syncFormDataFromDOM();
    }, 300);
    return () => clearTimeout(timer);
  }, [syncFormDataFromDOM]);

  useEffect(() => {
    const timer = setTimeout(() => {
      syncFormDataFromDOM();
    }, 150);
    return () => clearTimeout(timer);
  }, [step, syncFormDataFromDOM]);

  // Load existing business data if editing an existing business claim
  useEffect(() => {
    if (existingBusinessId && !hasLoadedBusiness.current) {
      hasLoadedBusiness.current = true; // Set early to prevent parallel loading
      const loadBusinessData = async () => {
        try {
          const supabase = createClient();
          const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('id, name, category, subcategory, location, city, quartier, phone, website, description')
            .eq('id', existingBusinessId)
            .single();

          if (!businessError && business) {
            const catObj = MAIN_CATEGORIES.find(c => c.id === business.category || c.name === business.category);
            const categoryName = catObj?.name || business.category || '';

            setFormData(prev => ({
              ...prev,
              businessName: business.name || '',
              category: categoryName,
              subcategory: business.subcategory || '',
              address: business.location || '',
              city: business.city || '',
              quartier: business.quartier || '',
              phone: business.phone || '',
              website: business.website || '',
              description: business.description || '',
            }));
          }
        } catch (error) {
          console.error('Error in loadBusinessData:', error);
        }
      };

      loadBusinessData();
    }
  }, [existingBusinessId]);

  // Memoized handlers to prevent infinite re-renders
  const handleInputChange = useCallback((e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.currentTarget;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSelectChange = useCallback((name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleAmenityToggle = useCallback((amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  }, []);

  const handleProofMethodToggle = useCallback((method: string) => {
    setSelectedProofMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  }, []);

  useEffect(() => {
    setSelectedProofMethods(prev => prev.filter(method => activeProofMethods.includes(method)));
  }, [activeProofMethods]);

  const handleDocumentUpload = useCallback((file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({ title: t('common.error', 'Erreur'), description: t('claimNew.toast.fileTooLargeDoc', 'Fichier trop volumineux (max 10MB)'), variant: 'destructive' });
      return;
    }
    setProofData(prev => ({ ...prev, documentFile: file }));
    toast({ title: t('common.success', 'Succes'), description: t('claimNew.toast.documentUploaded', 'Document telecharge') });
  }, [toast]);

  const handleVideoUpload = useCallback((file: File) => {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { // 100MB limit for video
      toast({ title: t('common.error', 'Erreur'), description: t('claimNew.toast.fileTooLargeVideo', 'Video trop volumineuse (max 100MB)'), variant: 'destructive' });
      return;
    }
    setProofData(prev => ({ ...prev, videoFile: file }));
    toast({ title: t('common.success', 'Succes'), description: t('claimNew.toast.videoUploaded', 'Video telechargee') });
  }, [toast]);

  // Business image handlers

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const formDataObj = new FormData(e.currentTarget);
      const supabase = createClient();

      const uploadToSupabase = async (file: File, bucket: string, path: string) => {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            upsert: false,
          });
        if (error) throw error;
        return data.path;
      };

      await attachUploadedClaimProofs({
        formData: formDataObj,
        selectedProofMethods,
        proofData,
        uploadFile: uploadToSupabase,
      });

      // Pass existing business ID if available
      if (existingBusinessId) {
        formDataObj.set('existingBusinessId', existingBusinessId);
      }

      // Call the server action in a transition
      startTransition(async () => {
        await formAction(formDataObj);
      });
    } catch (error: any) {
      console.error('Error during client-side upload:', error);
      toast({
        title: t('claimNew.toast.uploadErrorTitle', 'Erreur de telechargement'),
        description: error.message || t('claimNew.toast.uploadErrorDesc', 'Une erreur est survenue lors de envoi des fichiers.'),
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  }, [formAction, proofData, existingBusinessId, selectedProofMethods, toast, startTransition]);

  const canProceedToStep2 = isClaimBusinessStepComplete(formData);
  const { documentMethodSelected, videoMethodSelected, proofRequirementsMet } = getClaimProofRequirementState(selectedProofMethods, proofData);
  const canSubmit = canSubmitClaim({
    formData,
    selectedProofMethods,
    existingBusinessId,
    proofRequirementsMet,
  });

  // Enhanced validation for better user feedback
  const missingStep1Fields = getMissingClaimBusinessFields(formData, {
    businessName: t('claimNew.fields.businessName', 'Nom commercial'),
    category: t('claimNew.fields.category', 'Categorie principale'),
    subcategory: t('claimNew.fields.subcategory', 'Specialite'),
    address: t('claimNew.fields.address', 'Adresse exacte'),
    city: t('claimNew.fields.city', 'Ville'),
    quartier: t('claimNew.fields.quartier', 'Quartier'),
  });

  const missingStep3Fields = getMissingClaimIdentityFields(
    {
      formData,
      selectedProofMethods,
      existingBusinessId,
    },
    {
      fullName: t('claimNew.fields.fullName', 'Votre nom complet'),
      position: t('claimNew.fields.position', 'Votre poste/fonction'),
      claimerType: t('claimNew.fields.claimerType', 'Type de representant'),
      claimerTitle: t('claimNew.fields.claimerTitle', 'Precision du role'),
      email: t('claimNew.fields.email', 'Email professionnel'),
      personalPhone: t('claimNew.fields.personalPhone', 'Telephone personnel'),
      businessContact: t('claimNew.fields.businessContact', 'Telephone professionnel ou site web'),
      verificationMethod: t('claimNew.fields.verificationMethod', 'Methode de verification'),
    },
  );

  const missingStep1Message = missingStep1Fields.length > 0 ? tf('claimNew.missingFields', 'Champs manquants: {fields}', { fields: missingStep1Fields.join(', ') }) : '';
  const missingStep3Message = missingStep3Fields.length > 0 ? tf('claimNew.missingFields', 'Champs manquants: {fields}', { fields: missingStep3Fields.join(', ') }) : '';

  // Memoize filtered proof methods to prevent re-renders
  const filteredProofMethods = useMemo(() => {
    return proofMethods.filter(method => activeProofMethods.includes(method.value));
  }, [activeProofMethods, proofMethods]);

  // Memoize filtered amenities to prevent re-renders
  const filteredAmenities = useMemo(() => {
    return BENEFITS;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-3xl">
        {isBusinessAlreadyClaimed ? (
          <ClaimBlockedState
            title={t('claimNew.blocked.title', 'Etablissement deja revendique')}
            description={t('claimNew.blocked.desc', 'Cette entreprise a deja ete revendiquee par un autre utilisateur.')}
            helpText={t('claimNew.blocked.help', 'Si vous etes le proprietaire legitime de cette entreprise, veuillez nous contacter pour resoudre ce probleme.')}
            backLabel={t('claimNew.backToSearch', 'Retour a la recherche')}
            contactLabel={t('claimNew.contactTeam', "Contacter l'equipe")}
          />
        ) : (
          <div>
            <ClaimProgressHeader
              step={step}
              backLabel={t('claimNew.backToSearch', 'Retour a la recherche')}
              title={t('claimNew.hero.title', 'Revendiquez votre etablissement')}
              subtitle={
                step === 1
                  ? t('claimNew.hero.step1', 'Commencons par les details de votre activite')
                  : step === 2
                    ? t('claimNew.hero.step2', 'Dites-nous qui vous etes')
                    : t('claimNew.hero.step3', 'Verifiez vos informations avant de soumettre')
              }
              steps={[
                { step: 1, label: t('claimNew.stepper.business', 'Etablissement'), icon: CLAIM_PROGRESS_ICONS.business },
                { step: 2, label: t('claimNew.stepper.benefits', 'Avantages'), icon: CLAIM_PROGRESS_ICONS.benefits },
                { step: 3, label: t('claimNew.stepper.identity', 'Identite'), icon: CLAIM_PROGRESS_ICONS.identity },
                { step: 4, label: t('claimNew.stepper.validation', 'Validation'), icon: CLAIM_PROGRESS_ICONS.validation },
              ]}
            />

            <div className="grid lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-8">
                <form onSubmit={handleSubmit} ref={formRef}>
                  {/* Step 1: Business Details */}
                  {step === 1 && (
                    <ClaimBusinessDetailsStep
                      formData={formData}
                      categoryOptions={MAIN_CATEGORIES}
                      subcategoryOptions={formData.category ? SUBCATEGORIES[formData.category] || [] : []}
                      cityOptions={ALL_CITIES}
                      quartierOptions={formData.city ? getQuartiersForCity(formData.city) : []}
                      missingStep1Fields={missingStep1Fields}
                      missingStep1Message={missingStep1Message}
                      canProceedToStep2={!!canProceedToStep2}
                      onInputChange={handleInputChange}
                      onSelectChange={handleSelectChange}
                      onNext={() => setStep(2)}
                      labels={{
                        title: t('claimNew.step1.title', "Informations de l entreprise"),
                        description: t('claimNew.step1.desc', 'Remplissez les details de votre entreprise'),
                        detailsTitle: t('claimNew.step1.detailsTitle', 'Details de etablissement'),
                        detailsDescription: t('claimNew.step1.detailsDesc', 'Ces informations seront visibles par les clients.'),
                        businessName: t('claimNew.fields.businessName', 'Nom commercial'),
                        businessNamePlaceholder: t('claimNew.placeholders.businessName', 'Ex: Le Petit Bistro'),
                        category: t('claimNew.fields.category', 'Categorie principale'),
                        categoryPlaceholder: t('claimNew.placeholders.category', 'Choisir une categorie'),
                        subcategory: t('claimNew.fields.subcategory', 'Specialite'),
                        subcategoryPlaceholder: t('claimNew.placeholders.subcategory', 'Precisez votre activite'),
                        city: t('claimNew.fields.city', 'Ville'),
                        cityPlaceholder: t('claimNew.placeholders.city', 'Ex: Casablanca'),
                        quartier: t('claimNew.fields.quartier', 'Quartier'),
                        quartierPlaceholder: t('claimNew.placeholders.quartier', 'Quartier'),
                        address: t('claimNew.fields.address', 'Adresse exacte'),
                        addressPlaceholder: t('claimNew.placeholders.address', 'Rue, N?, Immeuble...'),
                        phoneOptional: t('claimNew.fields.phoneOptional', 'Tel. Professionnel (Optionnel)'),
                        phonePlaceholder: t('claimNew.placeholders.phone', '+212 5XX XXX XXX'),
                        websiteOptional: t('claimNew.fields.websiteOptional', 'Site Web (Optionnel)'),
                        websitePlaceholder: t('claimNew.placeholders.website', 'https://...'),
                        presentation: t('claimNew.step1.presentation', 'Presentation'),
                        descriptionLabel: t('claimNew.fields.description', 'A propos de etablissement'),
                        descriptionPlaceholder: t('claimNew.placeholders.description', 'Decrivez votre activite, vos specialites, votre ambiance...'),
                        cancel: t('claimNew.cancel', 'Annuler'),
                        requiredHint: t('claimNew.step1.requiredHint', 'Veuillez remplir les informations obligatoires (*) pour continuer'),
                        next: t('claimNew.step1.next', 'Suivant : Vos Avantages'),
                      }}
                    />
                  )}

                  {/* Step 2: Marque Employeur */}
                  {step === 2 && (
                    <ClaimBenefitsStep
                      benefits={BENEFITS}
                      selectedAmenities={selectedAmenities}
                      onAmenityToggle={handleAmenityToggle}
                      onBack={() => setStep(1)}
                      onNext={() => setStep(3)}
                      labels={{
                        title: t('claimNew.step2.title', 'Marque Employeur (Optionnel)'),
                        description: t('claimNew.step2.desc', 'Affichez les avantages que vous offrez a vos employes pour attirer les meilleurs talents.'),
                        benefitsTitle: t('claimNew.step2.benefitsTitle', 'Avantages & Services'),
                        back: t('claimNew.back', 'Retour'),
                        next: t('claimNew.step2.next', 'Suivant : Votre Identite'),
                      }}
                    />
                  )}
                  {/* Step 3: Identity & Proof */}
                  {step === 3 && (
                    <ClaimIdentityProofStep
                      formData={formData}
                      claimerTypeOptions={claimerTypeOptions}
                      filteredProofMethods={filteredProofMethods}
                      selectedProofMethods={selectedProofMethods}
                      documentMethodSelected={documentMethodSelected}
                      videoMethodSelected={videoMethodSelected}
                      proofData={proofData}
                      missingStep3Fields={missingStep3Fields}
                      missingStep3Message={missingStep3Message}
                      canSubmit={!!canSubmit}
                      onInputChange={handleInputChange}
                      onSelectChange={handleSelectChange}
                      onProofMethodToggle={handleProofMethodToggle}
                      onDocumentUpload={handleDocumentUpload}
                      onVideoUpload={handleVideoUpload}
                      onBack={() => setStep(2)}
                      onNext={() => setStep(4)}
                      labels={{
                        title: t('claimNew.step3.title', 'Votre identite & Preuve de propriete'),
                        description: t('claimNew.step3.desc', 'Verifiez votre identite et prouvez votre propriete'),
                        representativeTitle: t('claimNew.step3.representativeTitle', 'Informations Representant'),
                        representativeDescription: t('claimNew.step3.representativeDesc', 'Qui effectue la revendication ?'),
                        fullName: t('claimNew.fields.fullNameLabel', 'Nom complet'),
                        fullNamePlaceholder: t('claimNew.placeholders.fullName', 'Ex: Mohammed Alami'),
                        position: t('claimNew.fields.positionLabel', 'Poste / Fonction'),
                        positionPlaceholder: t('claimNew.placeholders.position', 'Gerant, Proprietaire...'),
                        claimerType: t('claimNew.fields.claimerTypeLabel', 'Vous etes'),
                        claimerTypePlaceholder: t('claimNew.placeholders.claimerType', 'Selectionnez votre role'),
                        claimerTitle: t('claimNew.fields.claimerTitleLabel', 'Precisez votre role'),
                        claimerTitlePlaceholder: t('claimNew.placeholders.claimerTitle', 'Ex: Consultant mandate'),
                        email: t('claimNew.fields.emailLabel', 'Email Professionnel'),
                        emailPlaceholder: t('claimNew.placeholders.email', 'contact@entreprise.ma'),
                        personalPhone: t('claimNew.fields.personalPhoneLabel', 'Telephone direct'),
                        personalPhonePlaceholder: t('claimNew.placeholders.personalPhone', '+212 6XX XXX XXX'),
                        verificationTitle: t('claimNew.step3.verificationTitle', 'Methodes de Verification'),
                        verificationDescription: t('claimNew.step3.verificationDesc', 'Selectionnez comment vous souhaitez prouver votre identite.'),
                        documentUploadTitle: t('claimNew.upload.document.title', 'Importez un document officiel'),
                        documentUploadCta: t('claimNew.upload.document.cta', 'Cliquez pour ajouter un fichier'),
                        documentUploadHint: t('claimNew.upload.document.hint', 'Registre de commerce, Patente ou Facture (Max 10MB)'),
                        documentReady: t('claimNew.upload.document.ready', 'Fichier pret : {name}'),
                        videoUploadTitle: t('claimNew.upload.video.title', 'Video de preuve (Obligatoire si selectionnee)'),
                        videoUploadCta: t('claimNew.upload.video.cta', 'Cliquez pour ajouter une video'),
                        videoUploadHint: t('claimNew.upload.video.hint', "Filmez l'enseigne de votre etablissement (Max 10s, 100MB)"),
                        videoReady: t('claimNew.upload.video.ready', 'Video prete : {name}'),
                        submitHint: t('claimNew.step3.submitHint', 'Veuillez completer vos infos et selectionner une methode de validation.'),
                        back: t('claimNew.back', 'Retour'),
                        next: t('claimNew.step3.next', 'Recapitulatif'),
                      }}
                    />
                  )}
                  {/* Step 4: Review & Submit */}
                  {step === 4 && (
                    <ClaimReviewSubmitStep
                      formData={formData}
                      claimerTypeLabel={claimerTypeOptions.find((opt) => opt.value === formData.claimerType)?.label}
                      selectedAmenities={selectedAmenities}
                      selectedProofMethodLabels={selectedProofMethods.map((method) => proofMethods.find((proofMethod) => proofMethod.value === method)?.label || method)}
                      isSubmitting={isSubmitting}
                      canSubmit={!!canSubmit}
                      submitState={state.status === 'success' ? 'success' : state.status === 'error' ? 'error' : 'idle'}
                      errorMessage={state.status === 'error' ? state.message : undefined}
                      onBack={() => setStep(3)}
                      labels={{
                        title: t('claimNew.step4.title', 'Recapitulatif Final'),
                        description: t('claimNew.step4.desc', 'Lisez attentivement avant de valider votre demande.'),
                        business: t('claimNew.step4.business', 'Etablissement'),
                        representative: t('claimNew.step4.representative', 'Representant'),
                        selectedBenefits: t('claimNew.step4.selectedBenefits', 'Avantages Selectionnes'),
                        selectedMethods: t('claimNew.step4.selectedMethods', 'Methodes de Validation choisies'),
                        commitmentTitle: t('claimNew.step4.commitmentTitle', 'Engagement de responsabilite'),
                        commitmentBody: t('claimNew.step4.commitmentBody', "En cliquant sur soumettre, vous certifiez etre le representant legal ou dument autorise de cet etablissement. Toute fausse declaration peut entrainer le bannissement definitif de la plateforme."),
                        back: t('claimNew.back', 'Retour'),
                        submitting: t('claimNew.submit.submitting', 'Soumission...'),
                        sent: t('claimNew.submit.sent', 'Envoye !'),
                        confirm: t('claimNew.submit.confirm', 'Confirmer la Revendication'),
                      }}
                      hiddenInputs={(
                        <>
                          <input type="hidden" name="existingBusinessId" value={existingBusinessId || ''} />
                          <input type="hidden" name="businessName" value={formData.businessName} />
                          <input type="hidden" name="category" value={formData.category} />
                          <input type="hidden" name="subcategory" value={formData.subcategory} />
                          <input type="hidden" name="address" value={formData.address} />
                          <input type="hidden" name="city" value={formData.city} />
                          <input type="hidden" name="quartier" value={formData.quartier} />
                          <input type="hidden" name="phone" value={formData.phone} />
                          <input type="hidden" name="website" value={formData.website} />
                          <input type="hidden" name="description" value={formData.description} />
                          <input type="hidden" name="priceLevel" value={formData.priceLevel} />
                          <input type="hidden" name="fullName" value={formData.fullName} />
                          <input type="hidden" name="position" value={formData.position} />
                          <input type="hidden" name="claimerType" value={formData.claimerType} />
                          <input type="hidden" name="claimerTitle" value={formData.claimerTitle} />
                          <input type="hidden" name="email" value={formData.email} />
                          <input type="hidden" name="personalPhone" value={formData.personalPhone} />
                          <input type="hidden" name="messageToAdmin" value={formData.messageToAdmin} />
                          <input type="hidden" name="amenities" value={selectedAmenities.join(',')} />
                          <input type="hidden" name="proofMethods" value={selectedProofMethods.join(',')} />
                        </>
                      )}
                    />
                  )}

                </form>
              </div>

              <ClaimBenefitsSidebar
                title={t('claimNew.sidebar.whyClaim', 'Pourquoi revendiquer ?')}
                badgeTitle={t('claimNew.sidebar.badgeTitle', 'Badge Certifie')}
                badgeDescription={t('claimNew.sidebar.badgeDesc', 'Obtenez le badge de confiance bleu sur votre profil public.')}
                controlTitle={t('claimNew.sidebar.controlTitle', 'Controlez vos Infos')}
                controlDescription={t('claimNew.sidebar.controlDesc', 'Mettez a jour vos horaires, photos et services en temps reel.')}
                convertTitle={t('claimNew.sidebar.convertTitle', 'Convertissez Plus')}
                convertDescription={t('claimNew.sidebar.convertDesc', 'Repondez aux avis et interagissez avec vos futurs clients.')}
                launchOfferLabel={t('claimNew.sidebar.launchOffer', 'Offre Lancement')}
                launchOfferDescription={t('claimNew.sidebar.launchOfferDesc', '1 mois de visibilite PRO offert apres approbation.')}
                helpLabel={t('claimNew.sidebar.needHelp', 'Besoin aide ?')}
                supportLabel={t('claimNew.sidebar.support24', 'Support Premium 7j/7')}
                supportCta={t('claimNew.sidebar.supportCenter', 'Support Center')}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewClaimPage() {
  return (
    <Suspense fallback={
      <ClaimPageLoadingFallback />
    }>
      <NewClaimContent />
    </Suspense>
  );
}

function ClaimPageLoadingFallback() {
  const { t } = useI18n();
  return <ClaimLoadingFallback label={t('claimNew.loadingForm', 'Chargement du formulaire...')} />;
}
