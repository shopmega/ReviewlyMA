'use client';

import { useEffect, useMemo, useState } from 'react';
import { getFilteredBusinesses } from '@/lib/data';
import type { Business, PaginatedBusinesses } from '@/lib/types';
import { ReviewForm } from '@/components/forms/ReviewForm';
import { Input } from '@/components/ui/input';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BusinessLogo } from '@/components/shared/BusinessLogo';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/components/providers/i18n-provider';

export default function GeneralReviewPageClient() {
  const { t, tf } = useI18n();
  const [paginatedBusinesses, setPaginatedBusinesses] = useState<PaginatedBusinesses>({
    businesses: [],
    totalCount: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
  });
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('relevance');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    async function fetchData(page = 1) {
      setLoading(true);
      try {
        const result = await getFilteredBusinesses({
          search: searchQuery || undefined,
          category: categoryFilter === 'all' ? undefined : categoryFilter,
          page,
          limit: 12,
          sort: sortBy as any,
          minimal: true,
        });
        setPaginatedBusinesses(result);
        setCurrentPage(page);
      } catch (error) {
        console.error('Error fetching businesses:', error);
      } finally {
        setLoading(false);
      }
    }

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
        minimal: true,
      });
      setPaginatedBusinesses(result);
      setCurrentPage(newPage);
    } catch (error) {
      console.error('Error changing page:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(paginatedBusinesses.businesses.map((business: Business) => business.category))];
    return uniqueCategories.sort();
  }, [paginatedBusinesses.businesses]);

  const displayBusinesses = paginatedBusinesses.businesses;

  if (selectedBusiness) {
    return (
      <div className="container mx-auto px-4 py-12 md:px-6">
        <div className="mx-auto max-w-2xl">
          <Button variant="ghost" onClick={() => setSelectedBusiness(null)} className="mb-4">
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('reviewPage.backToChooser', 'Back to company selection')}
          </Button>
          <h1 className="mb-2 font-headline text-3xl font-bold">{tf('reviewPage.title', 'Write a review for {name}', { name: selectedBusiness.name })}</h1>
          <p className="mb-8 text-muted-foreground">
            {t('reviewPage.subtitle', 'Your review is anonymous and will help thousands of people make better decisions.')}
          </p>
          <ReviewForm businessId={selectedBusiness.id} businessName={selectedBusiness.name} />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="font-headline text-4xl font-bold">{t('reviewPage.listTitle', 'Leave a review')}</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {t('reviewPage.listSubtitle', 'Search for and select the company you want to review.')}
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('reviewPage.searchPlaceholder', 'Search for a company...')}
              className="h-12 w-full rounded-lg pl-12 text-base shadow-sm"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('reviewPage.allCategories', 'All categories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('reviewPage.allCategories', 'All categories')}</SelectItem>
                {categories.map((category: string) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder={t('reviewPage.sortBy', 'Sort by')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">{t('reviewPage.sortOptions.relevance', 'Relevance')}</SelectItem>
                <SelectItem value="rating">{t('reviewPage.sortOptions.rating', 'Rating')}</SelectItem>
                <SelectItem value="reviews">{t('reviewPage.sortOptions.reviews', 'Review count')}</SelectItem>
                <SelectItem value="newest">{t('reviewPage.sortOptions.newest', 'Newest')}</SelectItem>
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
                    className="cursor-pointer transition-colors hover:bg-accent"
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

              <div className="flex items-center justify-between py-4">
                <div className="text-sm text-muted-foreground">
                  {tf('reviewPage.resultsSummary', 'Showing {from} to {to} of {total} results', {
                    from: (currentPage - 1) * paginatedBusinesses.limit + 1,
                    to: Math.min(currentPage * paginatedBusinesses.limit, paginatedBusinesses.totalCount),
                    total: paginatedBusinesses.totalCount,
                  })}
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
                    <span className="text-sm text-muted-foreground">{tf('reviewPage.pageOf', 'of {total}', { total: paginatedBusinesses.totalPages })}</span>
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
            <p className="py-8 text-center text-muted-foreground">{tf('reviewPage.emptySearch', 'No company found for "{query}".', { query: searchQuery })}</p>
          ) : (
            <p className="py-8 text-center text-muted-foreground">{t('reviewPage.emptyAll', 'No companies available.')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
