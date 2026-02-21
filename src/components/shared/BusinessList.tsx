'use client';

import React, { useState, useMemo, useEffect, Fragment, useCallback } from 'react';
import { BusinessCard } from '@/components/shared/BusinessCard';
import { Input } from '@/components/ui/input';
import { SlidersHorizontal, Search, X, ChevronRight, ChevronLeft, MapPin, Building2, Star, Clock, Filter, RefreshCw, Layers, CheckCircle, SearchX } from 'lucide-react';
import { AdSlot } from './AdSlot';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Business } from '@/lib/types';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { BENEFITS, ALL_CITIES, getQuartiersForCity } from '@/lib/location-discovery';
import { logger } from '@/lib/logger';


type BusinessListProps = {
  initialBusinesses: Business[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  categories: string[];
  initialSubcategories?: string[];
  allBenefits: string[];
};

type SortOption = 'relevance' | 'rating' | 'reviews';




export function BusinessList({
  initialBusinesses,
  totalCount,
  totalPages,
  currentPage,
  categories,
  initialSubcategories = [],
  allBenefits
}: BusinessListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all');
  const [subcategoryFilter, setSubcategoryFilter] = useState(searchParams.get('subcategory') || 'all');
  const [subcategories, setSubcategories] = useState<string[]>(initialSubcategories);
  const [ratingFilter, setRatingFilter] = useState(searchParams.get('rating') || 'all');
  const [cityFilter, setCityFilter] = useState(searchParams.get('city') || searchParams.get('location') || 'all');
  const [quartierFilter, setQuartierFilter] = useState(searchParams.get('quartier') || 'all');
  const [benefitsFilter, setBenefitsFilter] = useState<string[]>(
    searchParams.get('benefits')?.split(',').filter(Boolean) || []
  );
  const [tagFilter, setTagFilter] = useState(searchParams.get('tag') || '');
  const [sortOrder, setSortOrder] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'relevance'
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Only update if values actually changed
    let hasChanges = false;

    if (searchQuery) {
      if (params.get('search') !== searchQuery) {
        params.set('search', searchQuery);
        hasChanges = true;
      }
    } else if (params.get('search')) {
      params.delete('search');
      hasChanges = true;
    }

    if (typeFilter !== 'all') {
      if (params.get('type') !== typeFilter) {
        params.set('type', typeFilter);
        hasChanges = true;
      }
    } else if (params.get('type')) {
      params.delete('type');
      hasChanges = true;
    }

    if (categoryFilter !== 'all') {
      if (params.get('category') !== categoryFilter) {
        params.set('category', categoryFilter);
        hasChanges = true;
      }
    } else if (params.get('category')) {
      params.delete('category');
      hasChanges = true;
    }

    if (subcategoryFilter !== 'all') {
      if (params.get('subcategory') !== subcategoryFilter) {
        params.set('subcategory', subcategoryFilter);
        hasChanges = true;
      }
    } else if (params.get('subcategory')) {
      params.delete('subcategory');
      hasChanges = true;
    }

    if (ratingFilter !== 'all') {
      if (params.get('rating') !== ratingFilter) {
        params.set('rating', ratingFilter);
        hasChanges = true;
      }
    } else if (params.get('rating')) {
      params.delete('rating');
      hasChanges = true;
    }

    if (cityFilter !== 'all') {
      if (params.get('city') !== cityFilter) {
        params.set('city', cityFilter);
        hasChanges = true;
      }
    } else if (params.get('city')) {
      params.delete('city');
      hasChanges = true;
    }

    if (quartierFilter !== 'all') {
      if (params.get('quartier') !== quartierFilter) {
        params.set('quartier', quartierFilter);
        hasChanges = true;
      }
    } else if (params.get('quartier')) {
      params.delete('quartier');
      hasChanges = true;
    }

    const benefitsValue = benefitsFilter.length > 0 ? benefitsFilter.join(',') : '';
    if (benefitsValue) {
      if (params.get('benefits') !== benefitsValue) {
        params.set('benefits', benefitsValue);
        hasChanges = true;
      }
    } else if (params.get('benefits')) {
      params.delete('benefits');
      hasChanges = true;
    }

    if (tagFilter) {
      if (params.get('tag') !== tagFilter) {
        params.set('tag', tagFilter);
        hasChanges = true;
      }
    } else if (params.get('tag')) {
      params.delete('tag');
      hasChanges = true;
    }

    if (sortOrder !== 'relevance') {
      if (params.get('sort') !== sortOrder) {
        params.set('sort', sortOrder);
        hasChanges = true;
      }
    } else if (params.get('sort')) {
      params.delete('sort');
      hasChanges = true;
    }

    // Clean up legacy location param if it exists
    if (params.get('location')) {
      params.delete('location');
      hasChanges = true;
    }

    // Only reset page to 1 if filters changed (not just page navigation)
    const currentPage = params.get('page');
    if (hasChanges && currentPage !== '1') {
      params.set('page', '1');
    }

    // Only update URL if there are actual changes
    if (hasChanges) {
      const timer = setTimeout(() => {
        router.replace(`${pathname}?${params.toString()}`);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [searchQuery, typeFilter, categoryFilter, subcategoryFilter, ratingFilter, cityFilter, quartierFilter, benefitsFilter, tagFilter, sortOrder, pathname, router, searchParams]);

  const applySearchQuery = useCallback(() => {
    const next = searchInput.trim();
    if (next !== searchQuery) {
      setSearchQuery(next);
    }
  }, [searchInput, searchQuery]);

  const handleCategoryChange = (newCategory: string) => {
    setCategoryFilter(newCategory);
    if (newCategory === 'all') {
      setSubcategories([]);
      setSubcategoryFilter('all');
    } else {
      // Fetch subcategories when category changes
      const fetchSubs = async () => {
        try {
          const { getSubcategoriesByCategory } = await import('@/lib/data');
          const subs = await getSubcategoriesByCategory(newCategory);
          setSubcategories(subs);

          // Reset subcategory if current one is not in new list
          if (subcategoryFilter !== 'all' && !subs.includes(subcategoryFilter)) {
            setSubcategoryFilter('all');
          }
        } catch (err) {
          logger.error('Error fetching subcategories', err);
        }
      };
      fetchSubs();
    }
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const cities = ALL_CITIES;
  const quartiers = cityFilter === 'all' ? [] : getQuartiersForCity(cityFilter);

  // Use the businesses passed from the server
  const businesses = initialBusinesses;

  // Available amenities from the server
  const availableBenefits = allBenefits;

  const resetFilters = () => {
    setSearchQuery('');
    setSearchInput('');
    setTypeFilter('all');
    handleCategoryChange('all');
    setRatingFilter('all');
    setCityFilter('all');
    setQuartierFilter('all');
    setBenefitsFilter([]);
    setTagFilter('');
    setSortOrder('relevance');
  };

  const activeFilters: Array<{ key: string; label: string; value: string }> = [
    ...(searchQuery ? [{ key: 'search', label: searchQuery, value: searchQuery }] : []),
    ...(typeFilter !== 'all' ? [{ key: 'type', label: typeFilter, value: typeFilter }] : []),
    ...(categoryFilter !== 'all' ? [{ key: 'category', label: categoryFilter, value: categoryFilter }] : []),
    ...(subcategoryFilter !== 'all' ? [{ key: 'subcategory', label: subcategoryFilter, value: subcategoryFilter }] : []),
    ...(ratingFilter !== 'all' ? [{ key: 'rating', label: `Note: ${ratingFilter}+ ★`, value: ratingFilter }] : []),
    ...(cityFilter !== 'all' ? [{ key: 'city', label: cityFilter, value: cityFilter }] : []),
    ...(quartierFilter !== 'all' ? [{ key: 'quartier', label: quartierFilter, value: quartierFilter }] : []),
    ...benefitsFilter.map((a: string) => ({ key: `benefit-${a}`, label: a, value: a })),
    ...(tagFilter ? [{ key: 'tag', label: `tag`, value: tagFilter }] : []),
  ];

  const removeFilter = (key: string) => {
    if (key === 'search') { setSearchQuery(''); setSearchInput(''); }
    else if (key === 'type') setTypeFilter('all');
    else if (key === 'category') { handleCategoryChange('all'); }
    else if (key === 'subcategory') setSubcategoryFilter('all');
    else if (key === 'rating') setRatingFilter('all');
    else if (key === 'city') { setCityFilter('all'); setQuartierFilter('all'); }
    else if (key === 'quartier') setQuartierFilter('all');
    else if (key.startsWith('benefit-')) {
      const benefit = key.replace('benefit-', '');
      setBenefitsFilter(benefitsFilter.filter((a: string) => a !== benefit));
    }
    else if (key === 'tag') setTagFilter('');
  };


  return (
    <div className="space-y-6">
      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs">
              {filter.label}
              <button
                onClick={() => removeFilter(filter.key)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-xs h-7"
          >
            Effacer tous
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Mobile Filter Button - Only visible on mobile */}
        <div className="md:hidden">
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl border-border hover:bg-secondary/50 font-semibold gap-2"
              >
                <SlidersHorizontal className="h-5 w-5" />
                Filtres
                {activeFilters.length > 0 && (
                  <Badge variant="default" className="ml-auto h-5 px-2 bg-primary text-primary-foreground">
                    {activeFilters.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[310px] sm:w-[420px] p-0 border-r border-white/10 glass overflow-hidden">
              <SheetTitle className="sr-only">Filtres de recherche</SheetTitle>
              <SheetDescription className="sr-only">Utilisez ces filtres pour affiner votre recherche d'établissements.</SheetDescription>

              <div className="flex flex-col h-full bg-background/95 backdrop-blur-xl">
                {/* Drawer Header */}
                <div className="px-6 py-8 border-b border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Filter className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold font-headline text-foreground leading-none">Filtres</h2>
                        <p className="text-xs text-muted-foreground mt-1.5 font-medium">Affiner votre recherche</p>
                      </div>
                    </div>
                    {activeFilters.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { resetFilters(); setMobileFiltersOpen(false); }}
                        className="text-xs h-8 px-2.5 rounded-lg text-primary hover:text-primary hover:bg-primary/10 transition-colors flex items-center gap-1.5 font-bold"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Réinitialiser
                      </Button>
                    )}
                  </div>
                </div>

                {/* Filter Content */}
                <div className="flex-1 overflow-y-auto py-6 px-6 custom-scrollbar">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="search-mobile" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rechercher</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search-mobile"
                          placeholder="Etablissement..."
                          className="pl-9 h-10 border-border focus-visible:ring-primary/20 focus-visible:border-primary rounded-lg text-sm"
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              applySearchQuery();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={applySearchQuery}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2 text-xs"
                        >
                          OK
                        </Button>
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    <Accordion type="multiple" defaultValue={['category', 'city']} className="w-full">
                      <AccordionItem value="category" className="border-none">
                        <AccordionTrigger className={`text-sm py-2 hover:no-underline ${categoryFilter !== 'all' ? 'text-primary font-bold' : 'text-muted-foreground font-semibold'}`}>Catégorie</AccordionTrigger>
                        <AccordionContent className="pt-2">
                          <Select onValueChange={handleCategoryChange} value={categoryFilter}>
                            <SelectTrigger id="category-mobile" className="h-10 border-border focus:ring-ring/20 rounded-lg text-sm bg-muted/50">
                              <SelectValue placeholder="Toutes les catégories" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Toutes les catégories</SelectItem>
                              {[...new Set(categories)].map(category => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </AccordionContent>
                      </AccordionItem>

                      {categoryFilter !== 'all' && subcategories.length > 0 && (
                        <AccordionItem value="subcategory" className="border-none mt-2">
                          <AccordionTrigger className={`text-sm py-2 hover:no-underline ${subcategoryFilter !== 'all' ? 'text-primary font-bold' : 'text-muted-foreground font-semibold'}`}>Sous-catégorie</AccordionTrigger>
                          <AccordionContent className="pt-2">
                            <Select onValueChange={setSubcategoryFilter} value={subcategoryFilter}>
                              <SelectTrigger id="subcategory-mobile" className="h-10 border-border focus:ring-ring/20 rounded-lg text-sm bg-muted/50">
                                <SelectValue placeholder="Toutes" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Toutes</SelectItem>
                                {subcategories.map(sub => (
                                  <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      <AccordionItem value="city" className="border-none mt-2">
                        <AccordionTrigger className={`text-sm py-2 hover:no-underline ${cityFilter !== 'all' ? 'text-primary font-bold' : 'text-muted-foreground font-semibold'}`}>Ville</AccordionTrigger>
                        <AccordionContent className="pt-2">
                          <Select onValueChange={(val) => { setCityFilter(val); setQuartierFilter('all'); }} value={cityFilter}>
                            <SelectTrigger id="city-mobile" className="h-10 border-border focus:ring-primary/20 rounded-lg text-sm bg-muted/50">
                              <SelectValue placeholder="Toutes les villes" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Toutes les villes</SelectItem>
                              {cities.map(city => (
                                <SelectItem key={city} value={city}>{city}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="rating" className="border-none mt-2">
                        <AccordionTrigger className={`text-sm py-2 hover:no-underline ${ratingFilter !== 'all' ? 'text-primary font-bold' : 'text-muted-foreground font-semibold'}`}>Note minimale</AccordionTrigger>
                        <AccordionContent className="pt-2">
                          <RadioGroup value={ratingFilter} onValueChange={setRatingFilter} className="flex flex-col space-y-2.5">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="all" id="rating-all-mobile" className="text-primary border-border" />
                              <Label htmlFor="rating-all-mobile" className="text-sm text-muted-foreground cursor-pointer">Toutes</Label>
                            </div>
                            {[4.5, 4, 3, 2].map(rating => (
                              <div key={rating} className="flex items-center space-x-2">
                                <RadioGroupItem value={rating.toString()} id={`rating-${rating}-mobile`} className="text-primary border-border" />
                                <Label htmlFor={`rating-${rating}-mobile`} className="text-sm text-muted-foreground cursor-pointer flex items-center">
                                  {rating}+ <Star className="w-3 h-3 ml-1 fill-primary text-primary" />
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </AccordionContent>
                      </AccordionItem>

                      {availableBenefits.length > 0 && (
                        <AccordionItem value="benefits" className="border-none mt-2">
                          <AccordionTrigger className={`text-sm py-2 hover:no-underline ${benefitsFilter.length > 0 ? 'text-primary font-bold' : 'text-muted-foreground font-semibold'}`}>Avantages</AccordionTrigger>
                          <AccordionContent className="pt-2 max-h-72 overflow-y-auto px-1 custom-scrollbar">
                            <div className="space-y-4">
                              {BENEFITS.map(group => (
                                <div key={group.group}>
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2 tracking-widest">{group.group}</p>
                                  <div className="space-y-2 ml-1">
                                    {group.amenities.filter((a: string) => availableBenefits.includes(a)).map((amenity: string) => (
                                      <div key={amenity} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`benefit-mobile-${amenity}`}
                                          checked={benefitsFilter.includes(amenity)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setBenefitsFilter([...benefitsFilter, amenity]);
                                            } else {
                                              setBenefitsFilter(benefitsFilter.filter((a: string) => a !== amenity));
                                            }
                                          }}
                                        />
                                        <Label htmlFor={`benefit-mobile-${amenity}`} className="text-sm font-medium cursor-pointer">
                                          {amenity}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>
                  </div>

                  {/* Ad after filters on mobile */}
                  <div className="mt-8">
                    <AdSlot slot="mobile-sidebar-ad" className="min-h-[250px]" />
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-border/50 bg-secondary/10 backdrop-blur-md">
                  <Button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="w-full h-12 rounded-xl text-sm font-bold shadow-xl shadow-primary/20 relative group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-700 group-hover:scale-110 transition-transform duration-500" />
                    <span className="relative flex items-center justify-center gap-2">
                      Voir {totalCount} établissement{totalCount > 1 ? 's' : ''}
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Sidebar - Hidden on mobile */}
        <aside className="hidden md:block md:col-span-1">
          <div className="sticky top-24 bg-background border border-border rounded-xl p-5 shadow-sm space-y-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="search-listing" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rechercher</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-listing"
                    placeholder="Etablissement..."
                    className="pl-9 h-10 border-border focus-visible:ring-primary/20 focus-visible:border-primary rounded-lg text-sm"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applySearchQuery();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={applySearchQuery}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2 text-xs"
                  >
                    OK
                  </Button>
                </div>
              </div>

              <div className="h-px bg-border" />

              <Accordion type="multiple" defaultValue={['category', 'city']} className="w-full">
                <AccordionItem value="category" className="border-none">
                  <AccordionTrigger className={`text-sm py-2 hover:no-underline ${categoryFilter !== 'all' ? 'text-primary font-bold' : 'text-muted-foreground font-semibold'}`}>Catégorie</AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <Select onValueChange={handleCategoryChange} value={categoryFilter}>
                      <SelectTrigger id="category-listing" className="h-10 border-border focus:ring-ring/20 rounded-lg text-sm bg-muted/50">
                        <SelectValue placeholder="Toutes les catégories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les catégories</SelectItem>
                        {[...new Set(categories)].map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </AccordionContent>
                </AccordionItem>

                {categoryFilter !== 'all' && subcategories.length > 0 && (
                  <AccordionItem value="subcategory" className="border-none mt-2">
                    <AccordionTrigger className={`text-sm py-2 hover:no-underline ${subcategoryFilter !== 'all' ? 'text-primary font-bold' : 'text-muted-foreground font-semibold'}`}>Sous-catégorie</AccordionTrigger>
                    <AccordionContent className="pt-2">
                      <Select onValueChange={setSubcategoryFilter} value={subcategoryFilter}>
                        <SelectTrigger id="subcategory-listing" className="h-10 border-border focus:ring-ring/20 rounded-lg text-sm bg-muted/50">
                          <SelectValue placeholder="Toutes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes</SelectItem>
                          {subcategories.map(sub => (
                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </AccordionContent>
                  </AccordionItem>
                )}

                <AccordionItem value="city" className="border-none mt-2">
                  <AccordionTrigger className={`text-sm py-2 hover:no-underline ${cityFilter !== 'all' ? 'text-primary font-bold' : 'text-muted-foreground font-semibold'}`}>Ville</AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <Select onValueChange={(val) => { setCityFilter(val); setQuartierFilter('all'); }} value={cityFilter}>
                      <SelectTrigger id="city-listing" className="h-10 border-border focus:ring-primary/20 rounded-lg text-sm bg-muted/50">
                        <SelectValue placeholder="Toutes les villes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les villes</SelectItem>
                        {cities.map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="rating" className="border-none mt-2">
                  <AccordionTrigger className={`text-sm py-2 hover:no-underline ${ratingFilter !== 'all' ? 'text-primary font-bold' : 'text-muted-foreground font-semibold'}`}>Note minimale</AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <RadioGroup value={ratingFilter} onValueChange={setRatingFilter} className="flex flex-col space-y-2.5">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="rating-all-listing" className="text-primary border-border" />
                        <Label htmlFor="rating-all-listing" className="text-sm text-muted-foreground cursor-pointer">Toutes</Label>
                      </div>
                      {[4.5, 4, 3, 2].map(rating => (
                        <div key={rating} className="flex items-center space-x-2">
                          <RadioGroupItem value={rating.toString()} id={`rating-${rating}-listing`} className="text-primary border-border" />
                          <Label htmlFor={`rating-${rating}-listing`} className="text-sm text-muted-foreground cursor-pointer flex items-center">
                            {rating}+ <Star className="w-3 h-3 ml-1 fill-primary text-primary" />
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </AccordionContent>
                </AccordionItem>

                {availableBenefits.length > 0 && (
                  <AccordionItem value="benefits" className="border-none mt-2">
                    <AccordionTrigger className={`text-sm py-2 hover:no-underline ${benefitsFilter.length > 0 ? 'text-primary font-bold' : 'text-muted-foreground font-semibold'}`}>Avantages</AccordionTrigger>
                    <AccordionContent className="pt-2 max-h-72 overflow-y-auto px-1 custom-scrollbar">
                      <div className="space-y-4">
                        {BENEFITS.map(group => (
                          <div key={group.group}>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2 tracking-widest">{group.group}</p>
                            <div className="space-y-2 ml-1">
                              {group.amenities.filter((a: string) => availableBenefits.includes(a)).map((amenity: string) => (
                                <div key={amenity} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`benefit-listing-${amenity}`}
                                    checked={benefitsFilter.includes(amenity)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setBenefitsFilter([...benefitsFilter, amenity]);
                                      } else {
                                        setBenefitsFilter(benefitsFilter.filter((a: string) => a !== amenity));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`benefit-listing-${amenity}`} className="text-sm font-medium cursor-pointer">
                                    {amenity}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>

            {/* Desktop Sidebar Ad */}
            <div className="pt-4">
              <AdSlot slot="desktop-sidebar-ad" className="min-h-[300px]" />
            </div>
          </div>
        </aside>

        <main className="md:col-span-3">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4 bg-muted/50 p-4 rounded-xl border border-border">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-foreground font-headline">RÉSULTATS</h2>
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 font-bold h-6 border-none">
                {totalCount} {totalCount > 1 ? 'résultats' : 'résultat'}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Trier par:</span>
              <Select onValueChange={(value) => setSortOrder(value as SortOption)} value={sortOrder}>
                <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm border-border focus:ring-indigo-500/20 rounded-lg">
                  <SelectValue placeholder="Trier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Pertinence</SelectItem>
                  <SelectItem value="rating">Note</SelectItem>
                  <SelectItem value="reviews">Avis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {activeFilters.map((filter) => (
                <Badge key={filter.key} variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs font-medium bg-background border border-border text-foreground hover:bg-muted">
                  {filter.label}
                  <button
                    onClick={() => removeFilter(filter.key)}
                    className="ml-1 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {businesses.length > 0 ? (
            <div className="space-y-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {businesses.map((business: Business, index: number) => (
                  <Fragment key={business.id}>
                    <BusinessCard business={business} />
                    {/* Add an ad card after every 6 businesses in the grid */}
                    {(index + 1) % 6 === 0 && (
                      <div key={`ad-${index}`} className="col-span-full py-4">
                        <AdSlot slot="grid-middle-ad" format="rectangle" className="min-h-[100px]" />
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 pt-12 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="gap-2 h-10 px-4 rounded-xl border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20">
                      {currentPage}
                    </div>
                    <span className="text-sm font-bold text-slate-500">/</span>
                    <span className="text-sm font-bold text-slate-500">{totalPages}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="gap-2 h-10 px-4 rounded-xl border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-24 rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50/50">
              <div className="p-6 bg-white rounded-full shadow-xl mb-6">
                <SearchX className="w-12 h-12 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-headline">Aucun établissement trouvé</h3>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                Nous n'avons pas trouvé de résultats pour vos critères actuels. Essayez d'ajuster vos filtres ou de réinitialiser votre recherche.
              </p>
              <Button onClick={resetFilters} variant="primary" className="mt-8 rounded-full px-8">
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
