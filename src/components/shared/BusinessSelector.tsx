'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Store, 
  ChevronDown, 
  Star, 
  Eye, 
  Crown, 
  Check, 
  Plus,
  Settings
} from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface BusinessSelectorProps {
  variant?: 'header' | 'card' | 'dropdown';
  showStats?: boolean;
  className?: string;
}

export function BusinessSelector({ 
  variant = 'header', 
  showStats = false, 
  className = '' 
}: BusinessSelectorProps) {
  const { 
    currentBusiness, 
    allBusinesses, 
    isLoading, 
    switchBusiness, 
    setPrimaryBusiness,
    isMultiBusiness,
    canManageBusiness
  } = useBusiness();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return <BusinessSelectorSkeleton variant={variant} className={className} />;
  }

  if (!currentBusiness) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Store className="h-4 w-4" />
        <span>No business</span>
      </div>
    );
  }

  const handleSetPrimary = async (businessId: string) => {
    await setPrimaryBusiness(businessId);
    setIsOpen(false);
  };

  const handleSwitch = async (businessId: string) => {
    await switchBusiness(businessId);
    setIsOpen(false);
  };

  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Store className="h-4 w-4" />
        {isMultiBusiness ? (
          <Select value={currentBusiness.id} onValueChange={handleSwitch}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <span className="truncate">{currentBusiness.name}</span>
                  {currentBusiness.isPrimary && (
                    <Badge variant="secondary" className="text-xs">
                      Primary
                    </Badge>
                  )}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {allBusinesses.map((business) => (
                <SelectItem key={business.id} value={business.id}>
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    <span>{business.name}</span>
                    {business.isPrimary && (
                      <Badge variant="secondary" className="text-xs">
                        Primary
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="font-medium">{currentBusiness.name}</span>
        )}
        
        {showStats && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              <span>{currentBusiness.overall_rating?.toFixed(1) || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>1.2k</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={`border-2 ${className}`}>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                <h3 className="font-semibold">Business Management</h3>
              </div>
              {isMultiBusiness && (
                <Badge variant="outline" className="text-xs">
                  {allBusinesses.length} Businesses
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              {allBusinesses.map((business) => (
                <div
                  key={business.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    currentBusiness.id === business.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Store className="h-4 w-4" />
                    <div>
                      <p className="font-medium">{business.name}</p>
                      {business.isPrimary && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          Primary
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {currentBusiness.id !== business.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSwitch(business.id)}
                      >
                        Switch
                      </Button>
                    )}
                    
                    {!business.isPrimary && isMultiBusiness && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSetPrimary(business.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/dashboard/business/${business.id}`}>
                        <Settings className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {isMultiBusiness && (
              <div className="pt-2 border-t">
                <Button asChild className="w-full">
                  <Link href="/claim">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Business
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'dropdown') {
    return (
      <Select value={currentBusiness.id} onValueChange={handleSwitch}>
        <SelectTrigger className={`w-full ${className}`}>
          <SelectValue>
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              <span className="truncate">{currentBusiness.name}</span>
              {currentBusiness.isPrimary && (
                <Badge variant="secondary" className="text-xs">
                  Primary
                </Badge>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allBusinesses.map((business) => (
            <SelectItem key={business.id} value={business.id}>
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                <span>{business.name}</span>
                {business.isPrimary && (
                  <Badge variant="secondary" className="text-xs">
                    Primary
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Store className="h-4 w-4" />
      <span>{currentBusiness.name}</span>
    </div>
  );
}

function BusinessSelectorSkeleton({ variant = 'header', className = '' }: { variant: string; className: string }) {
  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className={`animate-pulse ${className}`}>
      <div className="h-20 bg-muted rounded" />
    </div>
  );
}
