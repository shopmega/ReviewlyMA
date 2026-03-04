'use client';

import { useState, useActionState, useEffect, useCallback, useMemo, useTransition, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { submitClaim, isBusinessClaimed } from '@/app/actions/claim';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft, MapPin, Phone, Globe, Upload, AlertCircle, Loader2, X, Info, Store, Crown,
  Sparkles, CheckCircle2, Users, ArrowRight, Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { MAIN_CATEGORIES, SUBCATEGORIES, ALL_CITIES, getQuartiersForCity, BENEFITS } from '@/lib/location-discovery';
import { useI18n } from '@/components/providers/i18n-provider';

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

  const [formData, setFormData] = useState({
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
  });

  // Proof verification state
  const [proofData, setProofData] = useState({
    documentFile: null as File | null,
    videoFile: null as File | null,
  });
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
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    const fields: Array<keyof typeof formData> = [
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

    setFormData(prev => {
      let changed = false;
      const next = { ...prev };
      for (const field of fields) {
        const value = data.get(field);
        if (typeof value === 'string' && value !== prev[field]) {
          next[field] = value;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);


  // Load draft data from localStorage on mount
  useEffect(() => {
    if (hasLoadedDraft.current) return;
    hasLoadedDraft.current = true;

    const savedDraft = localStorage.getItem('claimFormDraft');
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        setFormData(draftData.formData || formData);
        setSelectedAmenities(draftData.selectedAmenities || []);
        setSelectedProofMethods(draftData.selectedProofMethods || []);
        setProofData(draftData.proofData || proofData);
        setStep(draftData.step || 1);

        toast({
          title: t('claimNew.toast.draftRestoredTitle', 'Brouillon recupere'),
          description: t('claimNew.toast.draftRestoredDesc', 'Vos donnees sauvegardees ont ete restaurees.'),
        });
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, []); // Only once on mount

  // Save draft to localStorage whenever form data changes
  useEffect(() => {
    const draftData = {
      formData,
      selectedAmenities,
      selectedProofMethods,
      proofData: {
        ...proofData,
        documentFile: null, // Don't save files
        videoFile: null,
      },
      step,
      timestamp: Date.now(),
    };
    localStorage.setItem('claimFormDraft', JSON.stringify(draftData));
  }, [formData, selectedAmenities, selectedProofMethods, proofData, step]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Clear draft when form is successfully submitted
  useEffect(() => {
    const claimId = state.claimId || state.data?.claimId;
    if (state.status === 'success' && claimId) {
      localStorage.removeItem('claimFormDraft');
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

      // Helper for client-side upload
      const uploadToSupabase = async (file: File, bucket: string, path: string) => {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            upsert: false,
          });
        if (error) throw error;
        return data.path;
      };

      // Upload proof data client-side to keep server action body small
      if (selectedProofMethods.includes('document') && proofData.documentFile) {
        const path = `claims/temp/${Date.now()}-${proofData.documentFile.name}`;
        const uploadedPath = await uploadToSupabase(proofData.documentFile, 'claim-proofs', path);
        formDataObj.set('documentFile', uploadedPath);
      }

      if (selectedProofMethods.includes('video') && proofData.videoFile) {
        const path = `claims/temp/${Date.now()}-${proofData.videoFile.name}`;
        const uploadedPath = await uploadToSupabase(proofData.videoFile, 'claim-proofs', path);
        formDataObj.set('videoFile', uploadedPath);
      }

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

  const canProceedToStep2 = formData.businessName && formData.category && formData.subcategory && formData.address && formData.city && formData.quartier;

  // Check if auto-verifiable proofs are verified when selected
  const documentMethodSelected = selectedProofMethods.includes('document');
  const videoMethodSelected = selectedProofMethods.includes('video');

  const proofRequirementsMet = (
    (!documentMethodSelected || !!proofData.documentFile) &&
    (!videoMethodSelected || !!proofData.videoFile)
  );

  const professionalContactMet = !!existingBusinessId || !!formData.phone.trim() || !!formData.website.trim();
  const canSubmit = canProceedToStep2
    && formData.fullName
    && formData.position
    && formData.claimerType
    && (formData.claimerType !== 'other' || !!formData.claimerTitle.trim())
    && formData.email
    && formData.personalPhone
    && selectedProofMethods.length > 0
    && proofRequirementsMet
    && professionalContactMet;

  // Enhanced validation for better user feedback
  const missingStep1Fields: string[] = [];
  if (!formData.businessName) missingStep1Fields.push(t('claimNew.fields.businessName', 'Nom commercial'));
  if (!formData.category) missingStep1Fields.push(t('claimNew.fields.category', 'Categorie principale'));
  if (!formData.subcategory) missingStep1Fields.push(t('claimNew.fields.subcategory', 'Specialite'));
  if (!formData.address) missingStep1Fields.push(t('claimNew.fields.address', 'Adresse exacte'));
  if (!formData.city) missingStep1Fields.push(t('claimNew.fields.city', 'Ville'));
  if (!formData.quartier) missingStep1Fields.push(t('claimNew.fields.quartier', 'Quartier'));

  const missingStep3Fields: string[] = [];
  if (!formData.fullName) missingStep3Fields.push(t('claimNew.fields.fullName', 'Votre nom complet'));
  if (!formData.position) missingStep3Fields.push(t('claimNew.fields.position', 'Votre poste/fonction'));
  if (!formData.claimerType) missingStep3Fields.push(t('claimNew.fields.claimerType', 'Type de representant'));
  if (formData.claimerType === 'other' && !formData.claimerTitle.trim()) missingStep3Fields.push(t('claimNew.fields.claimerTitle', 'Precision du role'));
  if (!formData.email) missingStep3Fields.push(t('claimNew.fields.email', 'Email professionnel'));
  if (!formData.personalPhone) missingStep3Fields.push(t('claimNew.fields.personalPhone', 'Telephone personnel'));
  if (!existingBusinessId && !formData.phone.trim() && !formData.website.trim()) {
    missingStep3Fields.push(t('claimNew.fields.businessContact', 'Telephone professionnel ou site web'));
  }
  if (selectedProofMethods.length === 0) missingStep3Fields.push(t('claimNew.fields.verificationMethod', 'Methode de verification'));

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
          <Card className="max-w-lg mx-auto mt-12">
            <CardHeader>
              <CardTitle className="text-center text-destructive">{t('claimNew.blocked.title', 'Etablissement deja revendique')}</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Alert className="bg-destructive/10 border-destructive/30">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">{t('claimNew.blocked.desc', 'Cette entreprise a deja ete revendiquee par un autre utilisateur.')}</AlertDescription>
              </Alert>
              <p className="text-muted-foreground">
                {t('claimNew.blocked.help', 'Si vous etes le proprietaire legitime de cette entreprise, veuillez nous contacter pour resoudre ce probleme.')}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button variant="outline" asChild>
                  <Link href="/claim">{t('claimNew.backToSearch', 'Retour a la recherche')}</Link>
                </Button>
                <Button asChild>
                  <Link href="/contact">{t('claimNew.contactTeam', "Contacter l'equipe")}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div>
            {/* Header & New Stepper */}
            <div className="mb-10 text-center md:text-left">
              <Link href="/claim" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-4 group">
                <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                {t('claimNew.backToSearch', 'Retour a la recherche')}
              </Link>
              <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                {t('claimNew.hero.title', 'Revendiquez votre etablissement')}
              </h1>
              <p className="text-muted-foreground mt-2 text-lg italic">
                {step === 1 && t('claimNew.hero.step1', 'Commencons par les details de votre activite')}
                {step === 2 && t('claimNew.hero.step2', 'Dites-nous qui vous etes')}
                {step === 3 && t('claimNew.hero.step3', 'Verifiez vos informations avant de soumettre')}
              </p>
            </div>

            {/* Modern Visual Stepper */}
            <div className="relative mb-12 px-2">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 -z-10" />
              <div
                className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 -z-10 transition-all duration-500 ease-in-out"
                style={{ width: `${(step - 1) * 33.33}%` }}
              />
              <div className="flex justify-between">
                {[
                  { s: 1, label: t('claimNew.stepper.business', 'Etablissement'), icon: Store },
                  { s: 2, label: t('claimNew.stepper.benefits', 'Avantages'), icon: Sparkles },
                  { s: 3, label: t('claimNew.stepper.identity', 'Identite'), icon: Users },
                  { s: 4, label: t('claimNew.stepper.validation', 'Validation'), icon: CheckCircle2 }
                ].map((item) => (
                  <div key={item.s} className="flex flex-col items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 md:w-12 md:h-12 rounded-full border-4 flex items-center justify-center transition-all duration-300 shadow-sm",
                        step > item.s ? "bg-primary border-primary text-white" :
                          step === item.s ? "bg-white border-primary text-primary scale-110 ring-4 ring-primary/20" :
                            "bg-white border-gray-100 text-gray-400"
                      )}
                    >
                      {step > item.s ? <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6" /> : <item.icon className="h-5 w-5 md:h-6 md:w-6" />}
                    </div>
                    <span className={cn(
                      "text-[9px] md:text-xs font-bold uppercase tracking-wider transition-colors text-center max-w-[80px]",
                      step >= item.s ? "text-primary" : "text-gray-400"
                    )}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-8">
                <form onSubmit={handleSubmit} ref={formRef}>
                  {/* Step 1: Business Details */}
                  {step === 1 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('claimNew.step1.title', "Informations de l entreprise")}</CardTitle>
                        <CardDescription>{t('claimNew.step1.desc', 'Remplissez les details de votre entreprise')}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* General Info Section */}
                        <div className="space-y-6">
                          <div className="flex items-center gap-3 pb-2 border-b">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                              <MapPin className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg">{t('claimNew.step1.detailsTitle', 'Details de etablissement')}</h3>
                              <p className="text-xs text-muted-foreground">{t('claimNew.step1.detailsDesc', 'Ces informations seront visibles par les clients.')}</p>
                            </div>
                          </div>

                          <div className="grid gap-5">
                            <div className="space-y-2">
                              <Label htmlFor="businessName" className="text-sm font-semibold">{t('claimNew.fields.businessName', 'Nom commercial')} *</Label>
                              <Input
                                id="businessName"
                                name="businessName"
                                placeholder={t('claimNew.placeholders.businessName', 'Ex: Le Petit Bistro')}
                                value={formData.businessName}
                                onChange={handleInputChange}
                                onInput={handleInputChange}
                                required
                                className="bg-white/50 focus:bg-white transition-all border-gray-300"
                              />
                            </div>

                            <div className="grid md:grid-cols-2 gap-5">
                              <div className="space-y-2">
                                <Label htmlFor="category" className="text-sm font-semibold">{t('claimNew.fields.category', 'Categorie principale')} *</Label>
                                <Select
                                  name="category"
                                  value={formData.category}
                                  onValueChange={(val) => handleSelectChange('category', val)}
                                >
                                  <SelectTrigger className="bg-white/50">
                                    <SelectValue placeholder={t('claimNew.placeholders.category', 'Choisir une categorie')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MAIN_CATEGORIES.map((cat) => (
                                      <SelectItem key={cat.id} value={cat.name}>
                                        {cat.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="subcategory" className="text-sm font-semibold">{t('claimNew.fields.subcategory', 'Specialite')} *</Label>
                                <Select
                                  name="subcategory"
                                  value={formData.subcategory}
                                  onValueChange={(val) => handleSelectChange('subcategory', val)}
                                  disabled={!formData.category}
                                >
                                  <SelectTrigger className="bg-white/50">
                                    <SelectValue placeholder={t('claimNew.placeholders.subcategory', 'Precisez votre activite')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {formData.category && SUBCATEGORIES[formData.category]?.map((sub) => (
                                      <SelectItem key={sub} value={sub}>
                                        {sub}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-5">
                              <div className="space-y-2">
                                <Label htmlFor="city" className="text-sm font-semibold">{t('claimNew.fields.city', 'Ville')} *</Label>
                                <Select
                                  name="city"
                                  value={formData.city}
                                  onValueChange={(val) => handleSelectChange('city', val)}
                                >
                                  <SelectTrigger className="bg-white/50">
                                    <SelectValue placeholder={t('claimNew.placeholders.city', 'Ex: Casablanca')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ALL_CITIES.map((city) => (
                                      <SelectItem key={city} value={city}>
                                        {city}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="quartier" className="text-sm font-semibold">{t('claimNew.fields.quartier', 'Quartier')} *</Label>
                                <Select
                                  name="quartier"
                                  value={formData.quartier}
                                  onValueChange={(val) => handleSelectChange('quartier', val)}
                                  disabled={!formData.city}
                                >
                                  <SelectTrigger className="bg-white/50">
                                    <SelectValue placeholder={t('claimNew.placeholders.quartier', 'Quartier')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {formData.city && getQuartiersForCity(formData.city).map((q) => (
                                      <SelectItem key={q} value={q}>
                                        {q}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="address" className="text-sm font-semibold">{t('claimNew.fields.address', 'Adresse exacte')} *</Label>
                              <Input
                                id="address"
                                name="address"
                                placeholder={t('claimNew.placeholders.address', 'Rue, N?, Immeuble...')}
                                value={formData.address}
                                onChange={handleInputChange}
                                required
                                className="bg-white/50 shadow-inner"
                              />
                            </div>

                            <div className="grid md:grid-cols-2 gap-5">
                              <div className="space-y-2">
                                <Label htmlFor="phone" className="text-sm font-semibold text-muted-foreground">{t('claimNew.fields.phoneOptional', 'Tel. Professionnel (Optionnel)')}</Label>
                                <Input
                                  id="phone"
                                  name="phone"
                                  placeholder={t('claimNew.placeholders.phone', '+212 5XX XXX XXX')}
                                  value={formData.phone}
                                  onChange={handleInputChange}
                                  className="bg-white/50"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="website" className="text-sm font-semibold text-muted-foreground">{t('claimNew.fields.websiteOptional', 'Site Web (Optionnel)')}</Label>
                                <Input
                                  id="website"
                                  name="website"
                                  placeholder={t('claimNew.placeholders.website', 'https://...')}
                                  value={formData.website}
                                  onChange={handleInputChange}
                                  className="bg-white/50"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Description Section */}
                        <div className="space-y-4 border-t pt-6">
                          <div className="flex items-center gap-2">
                            <Store className="h-5 w-5 text-primary" />
                            <h3 className="font-bold">{t('claimNew.step1.presentation', 'Presentation')}</h3>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm font-semibold">{t('claimNew.fields.description', 'A propos de etablissement')}</Label>
                            <Textarea
                              id="description"
                              name="description"
                              placeholder={t('claimNew.placeholders.description', 'Decrivez votre activite, vos specialites, votre ambiance...')}
                              value={formData.description}
                              onChange={handleInputChange}
                              className="min-h-[120px] bg-white/50"
                            />
                          </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex flex-col sm:flex-row justify-between pt-6 gap-4">
                          <div className="flex gap-2">
                            <Button variant="ghost" asChild className="text-muted-foreground">
                              <Link href="/claim">{t('claimNew.cancel', 'Annuler')}</Link>
                            </Button>
                          </div>
                          <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                            {!canProceedToStep2 && (
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2 text-[10px] text-amber-600 font-medium">
                                  <Info className="h-3 w-3" />
                                  {t('claimNew.step1.requiredHint', 'Veuillez remplir les informations obligatoires (*) pour continuer')}
                                </div>
                                {missingStep1Fields.length > 0 && (
                                  <p className="text-[9px] text-amber-500/80 font-bold max-w-[250px] text-right">
                                    {missingStep1Message}
                                  </p>
                                )}
                              </div>
                            )}
                            <Button onClick={() => setStep(2)} disabled={!canProceedToStep2} size="lg" className="w-full sm:w-auto group">
                              {t('claimNew.step1.next', 'Suivant : Vos Avantages')}
                              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 2: Marque Employeur */}
                  {step === 2 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('claimNew.step2.title', 'Marque Employeur (Optionnel)')}</CardTitle>
                        <CardDescription>{t('claimNew.step2.desc', 'Affichez les avantages que vous offrez a vos employes pour attirer les meilleurs talents.')}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4 pt-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-5 w-5 text-amber-500" />
                            <h3 className="font-bold">{t('claimNew.step2.benefitsTitle', 'Avantages & Services')}</h3>
                          </div>
                          <div className="grid gap-6">
                            {BENEFITS.map(group => (
                              <div key={group.group}>
                                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-3 flex items-center gap-2">
                                  {group.icon || '🔹'} {group.group}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 ml-2">
                                  {group.amenities.map(amenity => (
                                    <div key={amenity}
                                      className={cn(
                                        "flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer hover:bg-white select-none relative group",
                                        selectedAmenities.includes(amenity)
                                          ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20"
                                          : "bg-gray-50/50 border-gray-200 hover:border-gray-300"
                                      )}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleAmenityToggle(amenity);
                                      }}
                                    >
                                      <div className={cn(
                                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                                        selectedAmenities.includes(amenity)
                                          ? "bg-primary border-primary text-white"
                                          : "bg-white border-gray-300 group-hover:border-primary/50"
                                      )}>
                                        {selectedAmenities.includes(amenity) && (
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                        )}
                                      </div>
                                      <span className={cn(
                                        "text-xs font-medium transition-colors",
                                        selectedAmenities.includes(amenity) ? "text-primary" : "text-gray-600"
                                      )}>
                                        {amenity}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex flex-col sm:flex-row justify-between pt-6 gap-4 border-t">
                          <Button variant="ghost" onClick={() => setStep(1)} className="text-muted-foreground">
                            {t('claimNew.back', 'Retour')}
                          </Button>
                          <Button onClick={() => setStep(3)} size="lg" className="w-full sm:w-auto group">
                            {t('claimNew.step2.next', 'Suivant : Votre Identite')}
                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 3: Identity & Proof */}
                  {step === 3 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('claimNew.step3.title', 'Votre identite & Preuve de propriete')}</CardTitle>
                        <CardDescription>{t('claimNew.step3.desc', 'Verifiez votre identite et prouvez votre propriete')}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Personal Info */}
                        <div className="space-y-6">
                          <div className="flex items-center gap-3 pb-2 border-b">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                              <Users className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg">{t('claimNew.step3.representativeTitle', 'Informations Representant')}</h3>
                              <p className="text-xs text-muted-foreground">{t('claimNew.step3.representativeDesc', 'Qui effectue la revendication ?')}</p>
                            </div>
                          </div>

                          <div className="grid gap-5">
                            <div className="space-y-2">
                              <Label htmlFor="fullName" className="text-sm font-semibold">{t('claimNew.fields.fullNameLabel', 'Nom complet')} *</Label>
                              <Input
                                id="fullName"
                                name="fullName"
                                placeholder={t('claimNew.placeholders.fullName', 'Ex: Mohammed Alami')}
                                value={formData.fullName}
                                onChange={handleInputChange}
                                onInput={handleInputChange}
                                required
                                className="bg-white/50"
                              />
                            </div>
                            <div className="grid md:grid-cols-2 gap-5">
                              <div className="space-y-2">
                                <Label htmlFor="position" className="text-sm font-semibold">{t('claimNew.fields.positionLabel', 'Poste / Fonction')} *</Label>
                                <Input
                                  id="position"
                                  name="position"
                                  placeholder={t('claimNew.placeholders.position', 'Gerant, Proprietaire...')}
                                  value={formData.position}
                                  onChange={handleInputChange}
                                  onInput={handleInputChange}
                                  required
                                  className="bg-white/50"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="claimerType" className="text-sm font-semibold">{t('claimNew.fields.claimerTypeLabel', 'Vous etes')} *</Label>
                                <Select
                                  name="claimerType"
                                  value={formData.claimerType}
                                  onValueChange={(val) => handleSelectChange('claimerType', val)}
                                >
                                  <SelectTrigger className="bg-white/50">
                                    <SelectValue placeholder={t('claimNew.placeholders.claimerType', 'Selectionnez votre role')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {claimerTypeOptions.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {formData.claimerType === 'other' && (
                                <div className="space-y-2 md:col-span-2">
                                  <Label htmlFor="claimerTitle" className="text-sm font-semibold">{t('claimNew.fields.claimerTitleLabel', 'Precisez votre role')} *</Label>
                                  <Input
                                    id="claimerTitle"
                                    name="claimerTitle"
                                    placeholder={t('claimNew.placeholders.claimerTitle', 'Ex: Consultant mandate')}
                                    value={formData.claimerTitle}
                                    onChange={handleInputChange}
                                    onInput={handleInputChange}
                                    required
                                    className="bg-white/50"
                                  />
                                </div>
                              )}
                              <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-semibold">{t('claimNew.fields.emailLabel', 'Email Professionnel')} *</Label>
                                <Input
                                  id="email"
                                  name="email"
                                  type="email"
                                  placeholder={t('claimNew.placeholders.email', 'contact@entreprise.ma')}
                                  value={formData.email}
                                  onChange={handleInputChange}
                                  onInput={handleInputChange}
                                  required
                                  className="bg-white/50"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="personalPhone" className="text-sm font-semibold">{t('claimNew.fields.personalPhoneLabel', 'Telephone direct')} *</Label>
                              <Input
                                id="personalPhone"
                                name="personalPhone"
                                placeholder={t('claimNew.placeholders.personalPhone', '+212 6XX XXX XXX')}
                                value={formData.personalPhone}
                                onChange={handleInputChange}
                                onInput={handleInputChange}
                                required
                                className="bg-white/50"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Verification Selection */}
                        <div className="space-y-4 border-t pt-6 bg-blue-50/30 -mx-6 px-6 py-6 border-b">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                              <Crown className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg">{t('claimNew.step3.verificationTitle', 'Methodes de Verification')}</h3>
                              <p className="text-xs text-muted-foreground">{t('claimNew.step3.verificationDesc', 'Selectionnez comment vous souhaitez prouver votre identite.')}</p>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-3">
                            {filteredProofMethods.map((method) => (
                              <div
                                key={method.value}
                                className={cn(
                                  "border rounded-xl p-4 cursor-pointer transition-all hover:border-primary/40 select-none",
                                  selectedProofMethods.includes(method.value) ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20" : "bg-white border-gray-200"
                                )}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleProofMethodToggle(method.value);
                                }}
                              >
                                <div className="flex items-start gap-4">
                                  <div className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    selectedProofMethods.includes(method.value) ? "bg-primary text-white" : "bg-gray-100 text-gray-500"
                                  )}>
                                    {method.value === 'email' && <Mail className="h-4 w-4" />}
                                    {method.value === 'phone' && <Phone className="h-4 w-4" />}
                                    {method.value === 'document' && <Upload className="h-4 w-4" />}
                                    {method.value === 'video' && <Loader2 className="h-4 w-4" />}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-bold text-sm leading-tight">{method.label}</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight mt-1">{method.description}</p>
                                  </div>
                                  <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5",
                                    selectedProofMethods.includes(method.value)
                                      ? "bg-primary border-primary text-white"
                                      : "bg-white border-gray-300"
                                  )}>
                                    {selectedProofMethods.includes(method.value) && (
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* File Upload Area for selected methods */}
                          <div className="grid gap-4 mt-4">
                            {documentMethodSelected && (
                              <div className="border rounded-lg p-5 bg-white shadow-sm border-blue-200">
                                <Label className="font-bold text-sm block mb-3">{t('claimNew.upload.document.title', 'Importez un document officiel')}</Label>
                                <label className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-blue-50/50 transition-all block border-blue-200 mb-2">
                                  <Upload className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                                  <p className="text-sm font-semibold">{t('claimNew.upload.document.cta', 'Cliquez pour ajouter un fichier')}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">{t('claimNew.upload.document.hint', 'Registre de commerce, Patente ou Facture (Max 10MB)')}</p>
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleDocumentUpload(e.target.files[0])}
                                  />
                                </label>
                                {proofData.documentFile && (
                                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded border border-green-100">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>{tf('claimNew.upload.document.ready', 'Fichier pret : {name}', { name: proofData.documentFile.name })}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {videoMethodSelected && (
                              <div className="border rounded-lg p-5 bg-white shadow-sm border-blue-200">
                                <Label className="font-bold text-sm block mb-3">{t('claimNew.upload.video.title', 'Video de preuve (Obligatoire si selectionnee)')}</Label>
                                <label className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-blue-50/50 transition-all block border-blue-200 mb-2">
                                  <Loader2 className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                                  <p className="text-sm font-semibold">{t('claimNew.upload.video.cta', 'Cliquez pour ajouter une video')}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">{t('claimNew.upload.video.hint', "Filmez l'enseigne de votre etablissement (Max 10s, 100MB)")}</p>
                                  <input
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
                                  />
                                </label>
                                {proofData.videoFile && (
                                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded border border-green-100">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>{tf('claimNew.upload.video.ready', 'Video prete : {name}', { name: proofData.videoFile.name })}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex flex-col sm:flex-row justify-between pt-6 gap-4">
                          <Button variant="ghost" onClick={() => setStep(2)} className="text-muted-foreground">
                            {t('claimNew.back', 'Retour')}
                          </Button>
                          <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                            {!canSubmit && (
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2 text-[10px] text-amber-600 font-medium max-w-[250px] text-right">
                                  <Info className="h-3 w-3 shrink-0" />
                                  <span>{t('claimNew.step3.submitHint', 'Veuillez completer vos infos et selectionner une methode de validation.')}</span>
                                </div>
                                {missingStep3Fields.length > 0 && (
                                  <p className="text-[9px] text-amber-500/80 font-bold max-w-[250px] text-right">
                                    {missingStep3Message}
                                  </p>
                                )}
                              </div>
                            )}
                            <Button onClick={() => setStep(4)} disabled={!canSubmit} size="lg" className="w-full sm:w-auto group">
                              {t('claimNew.step3.next', 'Recapitulatif')}
                              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 4: Review & Submit */}
                  {step === 4 && (
                    <Card className="border-primary/20 shadow-xl overflow-hidden">
                      <div className="bg-primary p-6 text-white">
                        <CardTitle className="text-2xl">{t('claimNew.step4.title', 'Recapitulatif Final')}</CardTitle>
                        <CardDescription className="text-primary-foreground/80">{t('claimNew.step4.desc', 'Lisez attentivement avant de valider votre demande.')}</CardDescription>
                      </div>
                      <CardContent className="p-8 space-y-8">
                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t('claimNew.step4.business', 'Etablissement')}</p>
                              <div className="p-3 bg-gray-50 rounded-lg border">
                                <p className="font-bold text-lg">{formData.businessName}</p>
                                <p className="text-sm text-muted-foreground">{formData.address}, {formData.city}</p>
                                <div className="mt-2 text-[10px] font-bold py-0.5 px-2 bg-blue-100 text-blue-700 rounded-full w-fit">
                                  {formData.category}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t('claimNew.step4.representative', 'Representant')}</p>
                              <div className="p-3 bg-gray-50 rounded-lg border">
                                <p className="font-bold">{formData.fullName}</p>
                                <p className="text-sm text-muted-foreground">{formData.position}</p>
                                <p className="text-sm text-muted-foreground">
                                  {claimerTypeOptions.find((opt) => opt.value === formData.claimerType)?.label}
                                  {formData.claimerType === 'other' && formData.claimerTitle ? ` - ${formData.claimerTitle}` : ''}
                                </p>
                                <p className="text-sm font-medium mt-1">{formData.email}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {selectedAmenities.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t('claimNew.step4.selectedBenefits', 'Avantages Selectionnes')}</p>
                            <div className="flex flex-wrap gap-2 text-sm italic">
                              {selectedAmenities.map(a => (
                                <Badge key={a} variant="outline" className="px-2 py-0.5 bg-blue-50/30">
                                  {a}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-3">
                          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t('claimNew.step4.selectedMethods', 'Methodes de Validation choisies')}</p>
                          <div className="flex flex-wrap gap-2 text-sm italic">
                            {selectedProofMethods.map(m => (
                              <Badge key={m} variant="secondary" className="px-3 py-1 bg-green-50 text-green-700 border-green-100">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {proofMethods.find(pm => pm.value === m)?.label || m}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3 shadow-sm">
                          <p className="font-bold text-amber-900 flex items-center gap-2">
                            <Info className="h-5 w-5" />
                            {t('claimNew.step4.commitmentTitle', 'Engagement de responsabilite')}
                          </p>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            En cliquant sur soumettre, vous certifiez être le représentant légal ou dûment autorisé de cet établissement.
                            Toute fausse déclaration peut entraîner le bannissement définitif de la plateforme.
                          </p>
                        </div>

                        {/* Hidden inputs for form submission */}
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

                        {/* Navigation */}
                        <div className="flex flex-col sm:flex-row justify-between pt-6 border-t gap-4">
                          <Button variant="ghost" onClick={() => setStep(3)} disabled={isSubmitting || state.status === 'success'} className="text-muted-foreground font-semibold">
                            {t('claimNew.back', 'Retour')}
                          </Button>
                          <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                            {state.status === 'error' && (
                              <p className="text-xs text-destructive font-bold bg-destructive/5 px-2 py-1 rounded border border-destructive/10">
                                ⚠️ {state.message}
                              </p>
                            )}
                            <Button
                              type="submit"
                              disabled={isSubmitting || !canSubmit || state.status === 'success'}
                              size="lg"
                              className="w-full sm:w-auto px-10 bg-gradient-to-r from-primary to-blue-700 hover:shadow-lg transition-all"
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  {t('claimNew.submit.submitting', 'Soumission...')}
                                </>
                              ) : state.status === 'success' ? (
                                <>
                                  <CheckCircle2 className="mr-2 h-5 w-5" />
                                  {t('claimNew.submit.sent', 'Envoye !')}
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="mr-2 h-5 w-5" />
                                  {t('claimNew.submit.confirm', 'Confirmer la Revendication')}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </form>
              </div>

              {/* Benefits Sidebar */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border-primary/20 shadow-lg overflow-hidden sticky top-8">
                  <div className="bg-primary/5 p-4 border-b border-primary/10">
                    <h3 className="font-bold flex items-center gap-2 text-primary">
                      <Sparkles className="h-5 w-5" />
                      {t('claimNew.sidebar.whyClaim', 'Pourquoi revendiquer ?')}
                    </h3>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    <div className="flex gap-4">
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-600 h-fit">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{t('claimNew.sidebar.badgeTitle', 'Badge Certifie')}</p>
                        <p className="text-xs text-muted-foreground">{t('claimNew.sidebar.badgeDesc', 'Obtenez le badge de confiance bleu sur votre profil public.')}</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="p-2 bg-amber-50 rounded-lg text-amber-600 h-fit">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{t('claimNew.sidebar.controlTitle', 'Controlez vos Infos')}</p>
                        <p className="text-xs text-muted-foreground">{t('claimNew.sidebar.controlDesc', 'Mettez a jour vos horaires, photos et services en temps reel.')}</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="p-2 bg-green-50 rounded-lg text-green-600 h-fit">
                        <Store className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{t('claimNew.sidebar.convertTitle', 'Convertissez Plus')}</p>
                        <p className="text-xs text-muted-foreground">{t('claimNew.sidebar.convertDesc', 'Repondez aux avis et interagissez avec vos futurs clients.')}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="bg-blue-900 rounded-xl p-4 text-white shadow-inner">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-blue-200 mb-1">{t('claimNew.sidebar.launchOffer', 'Offre Lancement')}</p>
                        <p className="text-sm font-bold">{t('claimNew.sidebar.launchOfferDesc', '1 mois de visibilite PRO offert apres approbation.')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="p-4 rounded-xl border border-dashed text-center space-y-2">
                  <p className="text-[10px] text-muted-foreground">{t('claimNew.sidebar.needHelp', 'Besoin aide ?')}</p>
                  <p className="text-xs font-bold">{t('claimNew.sidebar.support24', 'Support Premium 7j/7')}</p>
                  <Button variant="link" size="sm" asChild>
                    <Link href="/contact">{t('claimNew.sidebar.supportCenter', 'Support Center')}</Link>
                  </Button>
                </div>
              </div>
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
      <ClaimLoadingFallback />
    }>
      <NewClaimContent />
    </Suspense>
  );
}

function ClaimLoadingFallback() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{t('claimNew.loadingForm', 'Chargement du formulaire...')}</p>
      </div>
    </div>
  );
}
