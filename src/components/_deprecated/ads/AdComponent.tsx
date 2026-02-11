'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, X } from 'lucide-react';
import { Ad } from '@/lib/types';
import Link from 'next/link';

interface AdComponentProps {
  ad: Ad;
  onClose?: () => void; // Callback when ad is closed/dismissed
  className?: string; // Additional CSS classes
  variant?: 'sidebar' | 'inline' | 'banner'; // Different display variants
}

const AdComponent: React.FC<AdComponentProps> = ({ 
  ad, 
  onClose, 
  className = '', 
  variant = 'sidebar' 
}) => {
  // Check if the ad should be displayed based on dates
  const now = new Date();
  const startDate = ad.start_date ? new Date(ad.start_date) : null;
  const endDate = ad.end_date ? new Date(ad.end_date) : null;
  
  const isWithinDateRange = (!startDate || now >= startDate) && (!endDate || now <= endDate);
  
  if (!isWithinDateRange || ad.status !== 'active') {
    return null;
  }

  // Calculate ad spend percentage
  const spendPercentage = ad.budget_cents > 0 
    ? Math.min(100, (ad.spent_cents / ad.budget_cents) * 100) 
    : 0;

  return (
    <Card className={`border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm ${className}`}>
      <div className="flex justify-between items-start p-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-gray-900">{ad.title}</CardTitle>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
              Annonce
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{ad.content}</p>
        </div>
        
        {onClose && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-red-100"
            aria-label="Fermer l'annonce"
          >
            <X className="h-4 w-4 text-gray-500" />
          </Button>
        )}
      </div>
      
      <CardContent className="p-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center text-xs text-gray-500 mb-1">
              <span>Épuisé {spendPercentage.toFixed(0)}%</span>
              <div className="ml-2 h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full" 
                  style={{ width: `${spendPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link href="/" prefetch={false}>
              Voir plus <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdComponent;