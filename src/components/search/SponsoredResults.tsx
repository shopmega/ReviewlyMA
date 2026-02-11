'use client';

import React from 'react';
import { Business } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface SponsoredResultsProps {
  businesses: Business[];
  className?: string;
}

const SponsoredResults: React.FC<SponsoredResultsProps> = ({ 
  businesses, 
  className = '' 
}) => {
  if (!businesses || businesses.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          Annonces Sponsorisées
        </Badge>
        <span className="text-sm text-muted-foreground">Résultats sponsorisés par les entreprises</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {businesses.map((business) => (
          <Card 
            key={business.id} 
            className="overflow-hidden border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-md transition-shadow"
          >
            <Link href={`/businesses/${business.id}`} className="block">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {business.logo?.imageUrl && (
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={business.logo.imageUrl}
                        alt={business.name}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">{business.name}</h3>
                      <Badge variant="outline" className="text-xs bg-orange-100 border-orange-300">
                        Sponsorisé
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1 truncate">{business.category}</p>
                    
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-current text-yellow-400" />
                        <span className="text-sm font-medium">{business.overallRating.toFixed(1)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground truncate">{business.location}</span>
                      </div>
                    </div>
                    
                    {business.hours && business.hours.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {business.hours[0].isOpen ? 'Ouvert' : 'Fermé'} • {business.hours[0].open}-{business.hours[0].close}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SponsoredResults;