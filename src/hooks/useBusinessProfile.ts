import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type Profile } from '@/lib/types';
import { syncProProfile } from '@/app/actions/user';
import { useBusiness } from '@/contexts/BusinessContext';

export function useBusinessProfile() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const { currentBusiness, allBusinesses, isLoading: businessLoading } = useBusiness();

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

                let mergedProfile = profileData;

                // AUTO-SYNC: If no business_id but they might have an approved claim
                if (!profileData?.business_id && profileData) {
                    const { data: approvedClaims, error: claimsError } = await supabase
                        .from('business_claims')
                        .select('business_id, created_at')
                        .eq('user_id', user.id)
                        .eq('status', 'approved')
                        .order('created_at', { ascending: false })
                        .limit(1);

                    const approvedBusinessId = !claimsError && approvedClaims?.[0]?.business_id
                        ? approvedClaims[0].business_id
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

    // Get businessId from current business context or fallback to profile
    const businessId = currentBusiness?.id || profile?.business_id || null;

    return { 
        businessId, 
        profile, 
        loading: loading || businessLoading, 
        error,
        currentBusiness,
        allBusinesses,
        isMultiBusiness: allBusinesses.length > 1
    };
}
