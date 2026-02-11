'use client';

import { useState, useEffect, useMemo } from 'react';
import { getFilteredBusinesses } from '@/lib/data';
import type { Business, PaginatedBusinesses } from '@/lib/types';
import { ReviewForm } from '@/components/forms/ReviewForm';
import { Input } from '@/components/ui/input';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { BusinessLogo } from '@/components/shared/BusinessLogo';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export default function GeneralReviewPage() {
  const [paginatedBusinesses, setPaginatedBusinesses] = useState<PaginatedBusinesses>({
    businesses: [],
    totalCount: 0,
    page: 1,
    limit: 12,
    totalPages: 1
  });
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('relevance');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    async function fetchData(page: number = 1) {
      setLoading(true);
      try {
        const result = await getFilteredBusinesses({ 
          search: searchQuery || undefined,
          category: categoryFilter === 'all' ? undefined : categoryFilter,
          page,
          limit: 12,
          sort: sortBy as any,
          minimal: true 
        });
        setPaginatedBusinesses(result);
      } catch (error) {
        console.error('Error fetching businesses:', error);
      } finally {
        setLoading(false);
      }
    }
    
    // Reset to page 1 when search query or filters change
    fetchData(1);
  }, [searchQuery, categoryFilter, sortBy]);

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > paginatedBusinesses.totalPages) return;
    
    setLoading(true);
    try {
      const result = await getFilteredBusinesses({ 
        search: searchQuery || undefined,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        page: newPage,
        limit: 12,
        sort: sortBy as any,
        minimal: true 
      });
      setPaginatedBusinesses(result);
      setCurrentPage(newPage);
    } catch (error) {
      console.error('Error changing page:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(paginatedBusinesses.businesses.map((b: Business) => b.category))];
    return uniqueCategories.sort();
  }, [paginatedBusinesses.businesses]);

  // Show search results when searching, otherwise show paginated businesses
  const displayBusinesses = paginatedBusinesses.businesses;

  if (selectedBusiness) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => setSelectedBusiness(null)} className="mb-4">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Retour au choix de l'entreprise
          </Button>
          <h1 className="text-3xl font-bold font-headline mb-2">Écrire un avis pour {selectedBusiness.name}</h1>
          <p className="text-muted-foreground mb-8">Votre avis est anonyme et aidera des milliers de personnes à faire des choix éclairés.</p>
          <ReviewForm
            businessId={selectedBusiness.id}
            businessName={selectedBusiness.name}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold font-headline">Laisser un avis</h1>
          <p className="text-muted-foreground mt-2 text-lg">Recherchez et sélectionnez l'entreprise que vous souhaitez noter.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher une entreprise..."
              className="w-full pl-12 h-12 text-base rounded-lg shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map((category: string) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Pertinence</SelectItem>
                <SelectItem value="rating">Note</SelectItem>
                <SelectItem value="reviews">Nombre d'avis</SelectItem>
                <SelectItem value="newest">Plus récents</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                    <Skeleton className="h-12 w-12 rounded-md" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[150px]" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : displayBusinesses.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-4">
                {displayBusinesses.map((business: Business) => (
                  <Card
                    key={business.id}
                    className="hover:bg-accent hover:cursor-pointer transition-colors"
                    onClick={() => setSelectedBusiness(business)}
                  >
                    <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                      <BusinessLogo
                        logo={business.logo}
                        businessName={business.name}
                        width={48}
                        height={48}
                        className="rounded-md border"
                      />
                      <div>
                        <p className="font-semibold">{business.name}</p>
                        <p className="text-sm text-muted-foreground">{business.location}</p>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              
              {/* Pagination Controls */}
              <div className="flex items-center justify-between py-4">
                <div className="text-sm text-muted-foreground">
                  Affichage de <strong>{(currentPage - 1) * paginatedBusinesses.limit + 1}</strong> à 
                  <strong>{Math.min(currentPage * paginatedBusinesses.limit, paginatedBusinesses.totalCount)}</strong> sur 
                  <strong>{paginatedBusinesses.totalCount}</strong> résultats
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">{currentPage}</span>
                    <span className="text-sm text-muted-foreground">sur {paginatedBusinesses.totalPages}</span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === paginatedBusinesses.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(paginatedBusinesses.totalPages)}
                    disabled={currentPage === paginatedBusinesses.totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : searchQuery ? (
            <p className="text-center text-muted-foreground py-8">Aucune entreprise trouvée pour "{searchQuery}".</p>
          ) : (
            <p className="text-center text-muted-foreground py-8">Aucune entreprise disponible.</p>
          )}
        </div>
      </div>
    </div>
  );
}