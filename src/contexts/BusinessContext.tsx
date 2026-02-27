'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Business {
  id: string;
  name: string;
  role: string;
  isPrimary: boolean;
  slug?: string;
  overall_rating?: number;
  logo_url?: string;
}

export interface BusinessContextType {
  currentBusiness: Business | null;
  allBusinesses: Business[];
  isLoading: boolean;
  switchBusiness: (businessId: string) => Promise<void>;
  setPrimaryBusiness: (businessId: string) => Promise<void>;
  canManageBusiness: (businessId: string) => boolean;
  isMultiBusiness: boolean;
  refreshBusinesses: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}

interface BusinessProviderProps {
  children: ReactNode;
}

export function BusinessProvider({ children }: BusinessProviderProps) {
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load businesses on mount
  useEffect(() => {
    loadBusinesses();
  }, []);

  const sanitizeBusinessId = (rawId: string | null | undefined): string | null => {
    if (!rawId || typeof rawId !== 'string') return null;
    let normalized = rawId.trim();
    if (!normalized) return null;
    if (normalized.includes(':')) normalized = normalized.split(':')[0];
    if (normalized.includes('?')) normalized = normalized.split('?')[0];
    return normalized.trim() || null;
  };

  const loadBusinesses = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setAllBusinesses([]);
        setCurrentBusiness(null);
        return;
      }

      // Get user's businesses from new system
      const { data: userBusinesses, error: userBusinessesError } = await supabase
        .from('user_businesses')
        .select(`
          business_id,
          role,
          is_primary,
          businesses!inner(
            id,
            name,
            overall_rating,
            logo_url
          )
        `)
        .eq('user_id', user.id);

      if (userBusinessesError) {
        console.error('Error loading user businesses:', userBusinessesError);
        console.error('Error details:', {
          message: userBusinessesError.message,
          details: userBusinessesError.details,
          code: userBusinessesError.code
        });
        // Fallback to old system
        await fallbackToOldSystem(user.id);
        return;
      }

      if (userBusinesses && userBusinesses.length > 0) {
        const businesses: Business[] = userBusinesses.map(ub => ({
          id: ub.business_id,
          name: (ub.businesses as any).name,
          role: ub.role,
          isPrimary: ub.is_primary,
          overall_rating: (ub.businesses as any).overall_rating,
          logo_url: (ub.businesses as any).logo_url,
        }));

        setAllBusinesses(businesses);
        
        // Set current business to primary or first one
        const primaryBusiness = businesses.find(b => b.isPrimary);
        if (primaryBusiness) {
          setCurrentBusiness(primaryBusiness);
        } else {
          setCurrentBusiness(businesses[0]);
        }
      } else {
        // No businesses in new system, check old system
        await fallbackToOldSystem(user.id);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load businesses',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fallbackToOldSystem = async (userId: string) => {
    try {
      console.log('Falling back to old system for user:', userId);
      const supabase = createClient();
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error loading profile in fallback:', profileError);
        console.error('Profile error details:', {
          message: profileError.message,
          details: profileError.details,
          code: profileError.code
        });
        return;
      }

      let fallbackBusinessId = sanitizeBusinessId(profile?.business_id);

      if (!fallbackBusinessId) {
        const { data: claim } = await supabase
          .from('business_claims')
          .select('business_id')
          .eq('user_id', userId)
          .or('claim_state.eq.verified,status.eq.approved')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        fallbackBusinessId = sanitizeBusinessId((claim as { business_id?: string } | null)?.business_id || null);
      }

      if (fallbackBusinessId) {
        console.log('Found business in fallback system:', fallbackBusinessId);
        
        // First try to find by ID, then by slug if not found
        let { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('id, name, overall_rating, logo_url')
          .eq('id', fallbackBusinessId)
          .single();

        // If not found by ID, the profile.business_id might be stored as the slug in the id field
        if (businessError && (businessError.code === 'PGRST116' || businessError.message.includes('Row not found'))) {
          console.log('Business not found by ID, trying by slug (stored in id field):', fallbackBusinessId);
          
          // In this schema, the id field in businesses table contains slugs like 'morocco-mall'
          const { data: businessBySlug, error: businessErrorBySlug } = await supabase
            .from('businesses')
            .select('id, name, overall_rating, logo_url')
            .eq('id', fallbackBusinessId)
            .single();
            
          business = businessBySlug;
          businessError = businessErrorBySlug;
        }

        if (businessError || !business) {
          console.error('Error loading business in fallback:', businessError);
          console.error('Business error details:', {
            message: businessError?.message,
            details: businessError?.details,
            code: businessError?.code
          });
          return;
        }

        const businessData: Business = {
          id: business.id,
          name: business.name,
          role: 'owner',
          isPrimary: true,
          overall_rating: business.overall_rating,
          logo_url: business.logo_url,
        };

        console.log('Setting business from fallback:', businessData);
        setAllBusinesses([businessData]);
        setCurrentBusiness(businessData);
      } else {
        console.log('No business found for user in fallback system');
        setAllBusinesses([]);
        setCurrentBusiness(null);
      }
    } catch (error: any) {
      console.error('Error in fallback system:', error);
      console.error('Fallback error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      setAllBusinesses([]);
      setCurrentBusiness(null);
    }
  };

  const switchBusiness = async (businessId: string) => {
    try {
      const business = allBusinesses.find(b => b.id === businessId);
      if (!business) {
        toast({
          title: 'Error',
          description: 'Business not found',
          variant: 'destructive'
        });
        return;
      }

      setCurrentBusiness(business);
      
      // Store in localStorage for persistence
      localStorage.setItem('selectedBusinessId', businessId);
      
      toast({
        title: 'Business Switched',
        description: `Now managing ${business.name}`,
      });
    } catch (error) {
      console.error('Error switching business:', error);
      toast({
        title: 'Error',
        description: 'Failed to switch business',
        variant: 'destructive'
      });
    }
  };

  const setPrimaryBusiness = async (businessId: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Remove primary flag from all businesses
      await supabase
        .from('user_businesses')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      // Set new primary business
      const { error } = await supabase
        .from('user_businesses')
        .update({ is_primary: true })
        .eq('user_id', user.id)
        .eq('business_id', businessId);

      if (error) {
        throw error;
      }

      // Update local state
      setAllBusinesses(prev => 
        prev.map(b => ({
          ...b,
          isPrimary: b.id === businessId
        }))
      );

      // Switch to the new primary business
      await switchBusiness(businessId);

      toast({
        title: 'Primary Business Updated',
        description: `${allBusinesses.find(b => b.id === businessId)?.name} is now your primary business`,
      });
    } catch (error) {
      console.error('Error setting primary business:', error);
      toast({
        title: 'Error',
        description: 'Failed to set primary business',
        variant: 'destructive'
      });
    }
  };

  const canManageBusiness = (businessId: string): boolean => {
    return allBusinesses.some(b => b.id === businessId);
  };

  const isMultiBusiness = allBusinesses.length > 1;

  // Restore selected business from localStorage
  useEffect(() => {
    if (allBusinesses.length > 0) {
      const savedBusinessId = localStorage.getItem('selectedBusinessId');
      if (savedBusinessId) {
        const savedBusiness = allBusinesses.find(b => b.id === savedBusinessId);
        if (savedBusiness) {
          setCurrentBusiness(savedBusiness);
        }
      }
    }
  }, [allBusinesses]);

  const value: BusinessContextType = {
    currentBusiness,
    allBusinesses,
    isLoading,
    switchBusiness,
    setPrimaryBusiness,
    canManageBusiness,
    isMultiBusiness,
    refreshBusinesses: loadBusinesses,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}
