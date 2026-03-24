import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { type Profile, type SubscriptionTier } from '@/lib/types';
import { syncProProfile } from '@/app/actions/user';
import { useOptionalBusiness } from '@/contexts/BusinessContext';
import { getEffectiveTier, hasEffectivePaidAccess, hasEffectiveTierAccess } from '@/lib/tier-utils';

export function useBusinessProfile() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [businessTier, setBusinessTier] = useState<SubscriptionTier | null>(null);
    const [businessTierLoading, setBusinessTierLoading] = useState(false);
    const searchParams = useSearchParams();
    const businessContext = useOptionalBusiness();
    const currentBusiness = businessContext?.currentBusiness ?? null;
    const allBusinesses = businessContext?.allBusinesses ?? [];
    const businessLoading = businessContext?.isLoading ?? false;

    const sanitizeBusinessId = (rawId: string | null | undefined): string | null => {
        if (!rawId || typeof rawId !== 'string') return null;
        let normalized = rawId.trim();
        if (!normalized) return null;
        if (normalized.includes(':')) normalized = normalized.split(':')[0];
        if (normalized.includes('?')) normalized = normalized.split('?')[0];
        return normalized.trim() || null;
    };

    useEffect(() => {
        async function load() {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setError('Vous devez être connecté pour accéder à cette page.');
                    setLoading(false);
                    return;
                }

                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profileError) {
                    setError('Erreur lors du chargement du profil.');
                    setLoading(false);
                    return;
                }

                const sanitizedProfileBusinessId = sanitizeBusinessId(profileData?.business_id);
                let mergedProfile = profileData
                    ? { ...profileData, business_id: sanitizedProfileBusinessId }
                    : profileData;

                // AUTO-SYNC: If no business_id but they might have an approved claim
                if (!sanitizedProfileBusinessId && profileData) {
                    const { data: approvedClaims, error: claimsError } = await supabase
                        .from('business_claims')
                        .select('business_id, created_at')
                        .eq('user_id', user.id)
                        .or('claim_state.eq.verified,status.eq.approved')
                        .order('created_at', { ascending: false })
                        .limit(1);

                    const approvedBusinessId = !claimsError && approvedClaims?.[0]?.business_id
                        ? sanitizeBusinessId(approvedClaims[0].business_id)
                        : null;

                    if (approvedBusinessId) {
                        // Found an approved claim! Trigger background sync and use this ID
                        mergedProfile = { ...profileData, business_id: approvedBusinessId, role: 'pro' };

                        // Only call syncProProfile if the profile is missing business_id and role is not pro
                        if (!profileData.business_id || profileData.role !== 'pro') {
                            syncProProfile(); // Fire and forget background sync
                        }
                    } else {
                        setError('Aucun établissement associé à votre compte.');
                    }
                }

                setProfile(mergedProfile);

            } catch (e) {
                console.error(e);
                setError('Une erreur inattendue est survenue.');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const requestedBusinessId = sanitizeBusinessId(searchParams.get('id'));
    const requestedBusiness =
        requestedBusinessId
            ? allBusinesses.find((business) => business.id === requestedBusinessId) || null
            : null;

    const resolvedCurrentBusiness = requestedBusiness || currentBusiness;
    const businessId = resolvedCurrentBusiness?.id || profile?.business_id || null;

    useEffect(() => {
        async function loadBusinessTier(activeBusinessId: string) {
            try {
                setBusinessTierLoading(true);
                const supabase = createClient();
                const { data: business, error: businessError } = await supabase
                    .from('businesses')
                    .select('tier')
                    .eq('id', activeBusinessId)
                    .maybeSingle();

                if (businessError) {
                    console.error('Error loading business tier:', businessError);
                    setBusinessTier(null);
                    return;
                }

                setBusinessTier((business?.tier ?? 'standard') as SubscriptionTier);
            } catch (tierError) {
                console.error('Unexpected error while loading business tier:', tierError);
                setBusinessTier(null);
            } finally {
                setBusinessTierLoading(false);
            }
        }

        if (businessLoading) return;

        if (!businessId) {
            setBusinessTier(null);
            setBusinessTierLoading(false);
            return;
        }

        void loadBusinessTier(businessId);
    }, [businessId, businessLoading]);

    const profileTier = (profile?.tier ?? 'standard') as SubscriptionTier;
    const effectiveTier = getEffectiveTier(profileTier, businessTier);

    return { 
        businessId, 
        profile, 
        loading: loading || businessLoading || businessTierLoading, 
        error,
        currentBusiness: resolvedCurrentBusiness,
        allBusinesses,
        isMultiBusiness: allBusinesses.length > 1,
        businessTier,
        effectiveTier,
        hasPaidAccess: hasEffectivePaidAccess(profileTier, businessTier),
        hasGoldAccess: hasEffectiveTierAccess('gold', profileTier, businessTier),
    };
}
