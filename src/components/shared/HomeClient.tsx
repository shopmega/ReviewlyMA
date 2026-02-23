'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    ArrowRight, Building, Utensils, Search, Star, Users, Car, MapPin,
    Sparkles, Activity, Wrench, ShoppingBag, Palmtree, Bed, ChevronRight,
    Landmark, Headphones, GraduationCap, Zap, Hotel, Home, Factory,
    Heart, Briefcase, Laptop, Wifi, Truck, Radio, LucideIcon, ExternalLink
} from 'lucide-react';
import { BusinessCard } from '@/components/shared/BusinessCard';
import Image from 'next/image';
import { useState, useMemo, useRef, useCallback } from 'react';
import type { Business, SeasonalCollection, CollectionLink } from '@/lib/types';
import type { SiteSettings } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { Badge } from '@/components/ui/badge';
import { ALL_CITIES } from '@/lib/location-discovery';
import { SearchAutocomplete } from '@/components/shared/SearchAutocomplete';
import { cn, slugify } from '@/lib/utils';
import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';
import { AdSlot } from '@/components/shared/AdSlot';
import { useI18n } from '@/components/providers/i18n-provider';

const IconMap: Record<string, LucideIcon> = {
    Landmark, Headphones, ShoppingBag, GraduationCap, Zap, Hotel,
    Home, Factory, Utensils, Heart, Briefcase, Laptop, Wifi, Truck,
    Building, Search, Sparkles, Activity, Wrench, Palmtree, Bed, Radio
};

const IconAliasMap: Record<string, keyof typeof IconMap> = {
    'building-library': 'Landmark',
    headset: 'Headphones',
    'shopping-cart': 'ShoppingBag',
    'graduation-cap': 'GraduationCap',
    zap: 'Zap',
    bed: 'Bed',
    hammer: 'Wrench',
    cpu: 'Laptop',
    truck: 'Truck',
    briefcase: 'Briefcase',
    stethoscope: 'Heart',
    factory: 'Factory',
    'map-pin': 'MapPin',
    radio: 'Radio',
};

const getCategoryIcon = (iconName?: string) => {
    if (!iconName) return Search;
    const normalized = IconAliasMap[iconName] || iconName;
    const Icon = IconMap[normalized];
    return Icon || Search;
};

// This will be replaced by dynamic categories from props
const defaultCategories = [
    { name: 'Banque & Finance', icon: Landmark, slug: 'banque-finance' },
    { name: 'Technologie & IT', icon: Laptop, slug: 'technologie-it' },
    { name: 'Centres d\'Appel & BPO', icon: Headphones, slug: 'centres-appel-bpo' },
    { name: 'Industrie & Chimie', icon: Factory, slug: 'industrie-chimie' },
    { name: 'Distribution', icon: ShoppingBag, slug: 'distribution-commerce' },
    { name: 'Transport & Logistique', icon: Truck, slug: 'transport-logistique' },
    { name: 'Santé & Médical', icon: Heart, slug: 'sante-bien-etre' },
    { name: 'Éducation', icon: GraduationCap, slug: 'education-formation' },
];

const getCollectionHref = (link: CollectionLink) => {
    const params = new URLSearchParams();
    switch (link.type) {
        case 'filter':
            if (link.tag) params.set('tag', link.tag);
            if (link.category) params.set('category', link.category);
            if (link.city) params.set('city', link.city);
            if (link.amenities && link.amenities.length > 0) params.set('amenities', link.amenities.join(','));
            return `/businesses?${params.toString()}`;
        case 'category':
            if (link.category) params.set('category', link.category);
            if (link.city) params.set('city', link.city);
            return `/businesses?${params.toString()}`;
        case 'city':
            if (link.city) params.set('city', link.city);
            return `/businesses?${params.toString()}`;
        case 'custom':
            return link.href;
        default:
            return '/businesses';
    }
}

interface HomeClientProps {
    initialBusinesses: Business[];
    seasonalCollections: SeasonalCollection[];
    siteSettings?: SiteSettings;
    categories?: any[]; // Dynamic categories from DB
    featuredBusinesses?: Business[];
    metrics?: { businessCount: number; reviewCount: number };
}

const isValidCollectionLink = (link: any): link is CollectionLink => {
    return !!link && typeof link === 'object' && typeof link.type === 'string';
};

export function HomeClient({ initialBusinesses, seasonalCollections, siteSettings, categories, featuredBusinesses = [], metrics }: HomeClientProps) {
    const { locale, t, tf } = useI18n();
    // Use initialBusinesses from server as default, no need for complex loading state if desired
    const businesses = initialBusinesses;

    // Use dynamic categories if provided, otherwise fallback to defaults
    const commerceCategories = categories && categories.length > 0
        ? categories.map(c => ({
            name: c.name,
            icon: c.icon,
            IconComponent: getCategoryIcon(c.icon),
            slug: c.slug
        }))
        : defaultCategories.map((c) => ({ ...c, icon: null, IconComponent: c.icon }));

    const popularSearches = siteSettings?.popular_searches_config || [
        { label: `Entreprises Tech à ${ALL_CITIES[0] || 'Casablanca'}`, href: `/businesses?search=Tech&city=${ALL_CITIES[0] || 'Casablanca'}` },
        { label: 'Sociétés de consulting', href: '/businesses?search=Consulting' },
        { label: `Banques à ${ALL_CITIES[1] || 'Marrakech'}`, href: `/businesses?category=Finance&city=${ALL_CITIES[1] || 'Marrakech'}` },
    ];

    const [searchCity, setSearchCity] = useState('all');
    const [searchSector, setSearchSector] = useState('all');
    const [salaryRange, setSalaryRange] = useState('all');
    const [homeQuery, setHomeQuery] = useState('');
    const salaryRangeOptions = useMemo(
        () => [
            { value: 'all', label: t('home.salaryRanges.all', 'Tous les salaires') },
            { value: '0-4000', label: t('home.salaryRanges.under4k', 'Moins de 4 000 MAD') },
            { value: '4000-8000', label: t('home.salaryRanges.4to8k', '4 000 - 8 000 MAD') },
            { value: '8000-15000', label: t('home.salaryRanges.8to15k', '8 000 - 15 000 MAD') },
            { value: '15000+', label: t('home.salaryRanges.over15k', '15 000+ MAD') },
        ],
        [t]
    );
    const normalizedSearchCity = searchCity === 'all' ? '' : searchCity;
    const normalizedSearchSector = searchSector === 'all' ? '' : searchSector;
    const trackedImpressionsRef = useRef<Set<string>>(new Set());

    const autoplayPlugin = useRef(
        Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true })
    );
    const collectionsAutoplayPlugin = useRef(
        Autoplay({ delay: 5500, stopOnInteraction: true, stopOnMouseEnter: true })
    );

    const [catApi, setCatApi] = useState<CarouselApi>();
    const [catCurrent, setCatCurrent] = useState(0);
    const [collectionsApi, setCollectionsApi] = useState<CarouselApi>();
    const [collectionsCurrent, setCollectionsCurrent] = useState(0);

    useEffect(() => {
        if (!catApi) return;

        setCatCurrent(catApi.selectedScrollSnap());

        catApi.on('select', () => {
            setCatCurrent(catApi.selectedScrollSnap());
        });
    }, [catApi]);

    useEffect(() => {
        if (!collectionsApi) return;

        setCollectionsCurrent(collectionsApi.selectedScrollSnap());

        collectionsApi.on('select', () => {
            setCollectionsCurrent(collectionsApi.selectedScrollSnap());
        });
    }, [collectionsApi]);


    const buildSearchUrl = useCallback((query: string) => {
        const params = new URLSearchParams();
        const normalizedQuery = query.trim();
        if (normalizedQuery) params.set('search', normalizedQuery);
        if (normalizedSearchCity) params.set('city', normalizedSearchCity);
        if (normalizedSearchSector) params.set('category', normalizedSearchSector);
        if (salaryRange !== 'all') params.set('salary_range', salaryRange);
        const queryString = params.toString();
        return queryString ? `/businesses?${queryString}` : '/businesses';
    }, [normalizedSearchCity, normalizedSearchSector, salaryRange]);

    const { featuredBusinesses: displayFeaturedBusinesses, reviewCount, businessCount, recentBusinesses, completeProfileBusinesses } = useMemo(() => {
        const featured = featuredBusinesses.length > 0
            ? featuredBusinesses
            : businesses.filter(b => b.isFeatured).slice(0, 6);

        const recent = [...businesses]
            .sort((a, b) => {
                const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
                const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
                return bTime - aTime;
            })
            .slice(0, 6);

        const completeProfiles = [...businesses]
            .map((business) => {
                const hasHours = Array.isArray(business.hours) && business.hours.length > 0;
                const hasAddress = Boolean((business.address || business.location || '').trim());
                const hasWebsite = Boolean((business.website || '').trim());
                const hasPhotos =
                    Boolean(business.logo_url) ||
                    (Array.isArray(business.gallery_urls) && business.gallery_urls.length > 0) ||
                    (Array.isArray(business.photos) && business.photos.length > 0);

                const completeness = [hasHours, hasAddress, hasWebsite, hasPhotos].filter(Boolean).length;
                return { business, completeness };
            })
            .filter((item) => item.completeness >= 3)
            .sort((a, b) => b.completeness - a.completeness)
            .slice(0, 6)
            .map((item) => item.business);

        return {
            featuredBusinesses: featured,
            reviewCount: businesses.reduce((acc, c) => {
                const typedReviewCount = Array.isArray(c.reviews) ? c.reviews.length : 0;
                const fallbackReviewCount = typeof (c as any).review_count === 'number' ? (c as any).review_count : 0;
                return acc + (typedReviewCount || fallbackReviewCount);
            }, 0),
            businessCount: businesses.length,
            recentBusinesses: recent,
            completeProfileBusinesses: completeProfiles,
        };
    }, [businesses, featuredBusinesses]);

    useEffect(() => {
        seasonalCollections.forEach((collection, index) => {
            if (trackedImpressionsRef.current.has(collection.id)) return;
            trackedImpressionsRef.current.add(collection.id);
            analytics.trackCarouselImpression(collection.id, collection.title, index);
        });
    }, [seasonalCollections]);


    const stats = [
        { name: t('home.stats.businesses', 'Etablissements'), value: (metrics?.businessCount ?? businessCount).toLocaleString(locale), icon: Building },
        { name: t('home.stats.reviews', 'Avis employes'), value: (metrics?.reviewCount ?? reviewCount).toLocaleString(locale), icon: Star },
    ];

    const renderSection = (id: string) => {
        switch (id) {
            case 'hero':
                return (
                    <section key="hero" className="relative w-full min-h-[60vh] md:min-h-[68vh] py-14 md:py-16 flex flex-col items-center justify-center text-center overflow-hidden bg-background">
                        {/* Premium Background Elements */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            {/* Gradient Orbs */}
                            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '8s' }} />
                            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />

                            {/* Grid Pattern Overlay */}
                            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] dark:opacity-[0.05]" />
                        </div>

                        {/* Hero Content */}
                        <div className="relative z-10 container mx-auto px-4 flex flex-col items-center gap-6 md:gap-8">
                            <div className="space-y-5 md:space-y-6 max-w-4xl animate-fade-in-up">
                                <Badge variant="outline" className="px-5 py-2 border-primary/20 text-primary bg-primary/5 backdrop-blur-md rounded-full transition-all hover:bg-primary/10 hover:border-primary/40 shadow-sm">
                                    {t('home.hero.badge', 'Valeur immediate pour vos decisions de carriere')}
                                </Badge>

                                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-headline text-foreground leading-[1.08] tracking-tight drop-shadow-sm">
                                    {t('home.hero.titleLine1', 'Decouvrez et comparez les entreprises au Maroc')}
                                    <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-sky-600">
                                        {t('home.hero.titleLine2', 'avis reels, salaires et guides ville/salaire.')}
                                    </span>
                                </h1>

                                <p className="text-lg md:text-xl text-muted-foreground font-body max-w-2xl mx-auto leading-relaxed">
                                    {t('home.hero.subtitle', 'Trouvez des informations verifiees sur les entreprises, meme avant vos entretiens.')}
                                </p>
                            </div>

                            {/* Search + Filters */}
                            <div className="w-full max-w-3xl animate-fade-in-up [animation-delay:200ms]">
                                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-2 p-2.5 md:p-2 bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl hover:shadow-primary/5 transition-all duration-500 ring-1 ring-black/5 dark:ring-white/5">
                                    <div className="flex-1 w-full relative z-10">
                                        <SearchAutocomplete
                                            city={searchCity}
                                            placeholder={t('home.hero.searchPlaceholder', 'Entreprise, poste ou mot-cle...')}
                                            className="w-full"
                                            inputClassName="bg-transparent border-none text-foreground placeholder:text-muted-foreground/50 text-base md:text-lg h-11 md:h-12 px-4 shadow-none focus-visible:ring-0"
                                            showIcon={false}
                                            onQueryChange={setHomeQuery}
                                            onSearch={(q) => {
                                                window.location.href = buildSearchUrl(q);
                                            }}
                                        />
                                    </div>

                                    <Button
                                        onClick={() => {
                                            window.location.href = buildSearchUrl(homeQuery);
                                        }}
                                        size="lg"
                                        className="w-full md:w-auto h-11 md:h-12 px-6 md:px-7 rounded-xl bg-gradient-to-r from-primary to-blue-700 hover:from-primary/90 hover:to-blue-700/90 text-white font-bold text-base md:text-lg shadow-lg hover:shadow-primary/25 hover:scale-[1.02] transition-all active:scale-[0.98]"
                                    >
                                        {t('home.hero.searchCta', 'Rechercher une entreprise')}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                                    <Select value={searchCity} onValueChange={setSearchCity}>
                                        <SelectTrigger className="h-11 rounded-xl bg-background/90 border-border/60">
                                            <SelectValue placeholder={t('home.filters.city', 'Ville')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('home.filters.allCities', 'Toutes les villes')}</SelectItem>
                                            {ALL_CITIES.map(city => (
                                                <SelectItem key={city} value={city}>{city}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={searchSector} onValueChange={setSearchSector}>
                                        <SelectTrigger className="h-11 rounded-xl bg-background/90 border-border/60">
                                            <SelectValue placeholder={t('home.filters.sector', 'Secteur')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('home.filters.allSectors', 'Tous les secteurs')}</SelectItem>
                                            {commerceCategories.slice(0, 12).map((category) => (
                                                <SelectItem key={category.slug} value={category.name}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={salaryRange} onValueChange={setSalaryRange}>
                                        <SelectTrigger className="h-11 rounded-xl bg-background/90 border-border/60">
                                            <SelectValue placeholder={t('home.filters.salary', 'Salaire')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {salaryRangeOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 mt-4 justify-center">
                                    <Button
                                        size="lg"
                                        onClick={() => { window.location.href = buildSearchUrl(homeQuery); }}
                                        className="rounded-xl h-11 px-6 font-bold"
                                    >
                                        <MapPin className="mr-2 h-4 w-4" />
                                        {t('home.hero.searchCta', 'Rechercher une entreprise')}
                                    </Button>
                                    <Button asChild size="lg" variant="outline" className="rounded-xl h-11 px-6 font-bold border-primary/30 text-primary hover:bg-primary/5">
                                        <Link href="/review">
                                            <Star className="mr-2 h-4 w-4" />
                                            {t('home.hero.writeReview', 'Ecrire un avis')}
                                        </Link>
                                    </Button>
                                </div>
                            </div>

                            {/* Popular Tags */}
                            <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3 animate-fade-in-up [animation-delay:400ms] mt-2 md:mt-3 px-4">
                                <span className="text-muted-foreground text-xs md:text-sm font-semibold uppercase tracking-wider">{t('home.popular', 'Populaire:')}</span>
                                {popularSearches.map((search: { label: string; href: string }) => (
                                    <Link
                                        key={search.href}
                                        href={search.href}
                                        className="px-3 md:px-4 py-1.5 bg-secondary/50 hover:bg-secondary backdrop-blur-md rounded-full text-xs md:text-sm font-medium text-muted-foreground border border-border/50 transition-all hover:text-primary hover:border-primary/30 hover:-translate-y-0.5"
                                    >
                                        {search.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                );
            case 'recently-added':
                return recentBusinesses.length > 0 ? (
                    <section key="recently-added" className="py-14 container mx-auto px-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold font-headline">{t('home.recent.title', 'Entreprises recemment ajoutees')}</h2>
                                <p className="text-muted-foreground">Des nouvelles fiches a explorer des maintenant.</p>
                            </div>
                            <Button asChild variant="outline" className="rounded-full">
                                <Link href="/recently-added">{t('home.seeAll', 'Voir tout')}</Link>
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recentBusinesses.slice(0, 6).map((business) => (
                                <BusinessCard key={business.id} business={business} />
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'trust-signals':
                return (completeProfileBusinesses.length > 0 || recentBusinesses.length > 0) ? (
                    <section key="trust-signals" className="py-14 container mx-auto px-4">
                        <div className="text-center mb-8 space-y-2">
                            <h2 className="text-2xl md:text-3xl font-bold font-headline">{t('home.completeProfiles.title', 'Top entreprises avec profil complet')}</h2>
                            <p className="text-muted-foreground">Fiches avec informations utiles: horaires, adresse, site web et photos.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(completeProfileBusinesses.length > 0 ? completeProfileBusinesses : recentBusinesses).slice(0, 6).map((business) => {
                                const hasHours = Array.isArray(business.hours) && business.hours.length > 0;
                                const hasAddress = Boolean((business.address || business.location || '').trim());
                                const hasWebsite = Boolean((business.website || '').trim());
                                const hasPhotos =
                                    Boolean(business.logo_url) ||
                                    (Array.isArray(business.gallery_urls) && business.gallery_urls.length > 0) ||
                                    (Array.isArray(business.photos) && business.photos.length > 0);

                                return (
                                    <Card key={business.id} className="rounded-2xl border-border/60 hover:border-primary/30 transition-colors">
                                        <CardContent className="p-5 space-y-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h3 className="font-bold text-lg leading-tight">{business.name}</h3>
                                                    <p className="text-xs text-muted-foreground">{business.city || business.location || 'Maroc'}</p>
                                                </div>
                                                <Building className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {hasHours && <Badge variant="secondary">Horaires</Badge>}
                                                {hasAddress && <Badge variant="secondary">Adresse</Badge>}
                                                {hasWebsite && <Badge variant="secondary">Site web</Badge>}
                                                {hasPhotos && <Badge variant="secondary">Photos</Badge>}
                                            </div>
                                            <Button asChild variant="ghost" className="w-full justify-between">
                                                <Link href={`/businesses/${business.id}`}>
                                                    {t('home.completeProfiles.viewProfile', 'Voir la fiche complete')}
                                                    <ArrowRight className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </section>
                ) : null;
            case 'stats':
                return (
                    <section key="stats" className="container mx-auto px-4 mt-8 md:-mt-16 relative z-20">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                            {stats.map((stat) => (
                                <div key={stat.name} className="glass-card p-6 rounded-2xl shadow-xl flex items-center gap-6 transform hover:-translate-y-1 transition-transform duration-300">
                                    <div className="p-4 bg-primary/10 rounded-full text-primary">
                                        <stat.icon className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold font-headline">{stat.value}</p>
                                        <p className="text-muted-foreground font-medium">{stat.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case 'ad-banner-top':
                return (
                    <div key="ad-banner-top" className="container mx-auto px-4 py-8">
                        <AdSlot slot="home-top-banner" className="bg-muted/30 border border-border/50 rounded-2xl min-h-[120px]" />
                    </div>
                );
            case 'collections':
                return (
                    <section key="collections" className="py-24 container mx-auto px-4">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-3xl md:text-5xl font-bold font-headline">{t('home.exploreBySector', 'Explorez par')} <span className="text-primary">{t('home.sector', 'Secteur')}</span></h2>
                            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t('home.collections.subtitle', 'Plongez dans nos collections thematiques et trouvez la societe parfaite pour votre carriere.')}</p>
                        </div>

                        <Carousel
                            plugins={[collectionsAutoplayPlugin.current]}
                            opts={{ align: "start", loop: true }}
                            className="w-full group"
                            setApi={setCollectionsApi}
                        >
                            <CarouselContent className="-ml-4">
                                {seasonalCollections.map((collection, index) => {
                                    const link: CollectionLink = isValidCollectionLink(collection.link)
                                        ? collection.link
                                        : ({ type: 'custom', href: '/businesses' } as const);
                                    const href = getCollectionHref(link);
                                    return (
                                        <CarouselItem key={collection.id} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                                            <Link
                                                href={href}
                                                className="group relative overflow-hidden rounded-3xl h-[300px] flex flex-col justify-end p-8 border hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
                                                onClick={async () => {
                                                    await analytics.trackCarouselClick(
                                                        collection.id,
                                                        collection.title,
                                                        collection.subtitle,
                                                        link.type,
                                                        href,
                                                        index
                                                    );
                                                }}
                                            >
                                                <Image
                                                    src={collection.imageUrl}
                                                    alt={collection.title}
                                                    fill
                                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                                                <div className="relative z-10 space-y-2">
                                                    <Badge className="border-none mb-2">Collection</Badge>
                                                    <h3 className="text-2xl font-bold text-white font-headline leading-tight">{collection.title}</h3>
                                                    <p className="text-white/95 line-clamp-1">{collection.subtitle}</p>
                                                </div>
                                            </Link>
                                        </CarouselItem>
                                    );
                                })}
                            </CarouselContent>

                            <div className="flex justify-center gap-4 mt-8">
                                <CarouselPrevious className="relative static translate-y-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <CarouselNext className="relative static translate-y-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            <div className="flex justify-center gap-1.5 mt-4">
                                {seasonalCollections.map((collection, index) => (
                                    <button
                                        key={collection.id}
                                        onClick={() => collectionsApi?.scrollTo(index)}
                                        className={cn(
                                            "w-2 h-2 rounded-full transition-all duration-300",
                                            collectionsCurrent === index
                                                ? "bg-primary w-4"
                                                : "bg-primary/20 hover:bg-primary/40"
                                        )}
                                        aria-label={`Go to collection ${index + 1}`}
                                    />
                                ))}
                            </div>
                        </Carousel>
                    </section>
                );
            case 'categories':
                return (
                    <section key="categories" className="py-20 bg-secondary/30">
                        <div className="container mx-auto px-4">
                            <div className="flex justify-between items-end mb-12">
                                <div>
                                    <h2 className="text-3xl md:text-4xl font-bold font-headline mb-2">{t('home.browseByCategory', 'Parcourir par categorie')}</h2>
                                    <p className="text-muted-foreground">{t('home.sectorSection.subtitle', 'Trouvez rapidement les meilleures societes par secteur.')}</p>
                                </div>
                            </div>

                            <Carousel
                                plugins={[autoplayPlugin.current]}
                                opts={{ align: "start", loop: true }}
                                className="w-full group"
                                setApi={setCatApi}
                            >
                                <CarouselContent>
                                    {commerceCategories.map((category, index) => (
                                        <CarouselItem key={index} className="basis-1/2 md:basis-1/3 lg:basis-1/5 pl-4">
                                            <Link
                                                href={`/categorie/${category.slug}`}
                                                className="group/cat block h-full"
                                            >
                                                <div className="glass-card h-full flex flex-col items-center justify-center text-center p-6 gap-4 transition-all duration-300 hover:bg-primary/5 hover:border-primary/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 group/card">
                                                    <div className="p-4 bg-secondary/50 rounded-full text-foreground group-hover/card:scale-110 group-hover/card:bg-primary group-hover/card:text-white transition-all duration-300 shadow-sm">
                                                        {typeof category.icon === 'string' && category.icon.length <= 3 ? (
                                                            <span className="text-2xl leading-none">{category.icon}</span>
                                                        ) : (
                                                            React.createElement(category.IconComponent, { className: "w-8 h-8" })
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-sm md:text-base font-headline text-foreground group-hover/card:text-primary transition-colors">
                                                        {category.name}
                                                    </span>
                                                </div>
                                            </Link>
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>

                                {/* Navigation Arrows */}
                                <div className="flex justify-center gap-4 mt-8">
                                    <CarouselPrevious className="relative static translate-y-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <CarouselNext className="relative static translate-y-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>

                                {/* Pagination Dots */}
                                <div className="flex justify-center gap-1.5 mt-4">
                                    {commerceCategories.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => catApi?.scrollTo(index)}
                                            className={cn(
                                                "w-2 h-2 rounded-full transition-all duration-300",
                                                catCurrent === index
                                                    ? "bg-primary w-4"
                                                    : "bg-primary/20 hover:bg-primary/40"
                                            )}
                                            aria-label={`Go to slide ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            </Carousel>
                        </div>
                    </section>
                );
            case 'cities':
                return (
                    <section key="cities" className="py-24 container mx-auto px-4 border-t">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-3xl md:text-5xl font-bold font-headline">{t('home.exploreByCity', 'Explorer par')} <span className="text-primary">{t('home.city', 'Ville')}</span></h2>
                            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t('home.citySection.subtitle', 'Decouvrez les adresses les mieux notees dans les plus grandes villes du pays.')}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {['Casablanca', 'Rabat', 'Marrakech', 'Tanger'].map(city => (
                                <div key={city} className="glass-card p-8 transition-all duration-300 hover:-translate-y-2 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 group">
                                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 font-headline">
                                        <div className="p-2 rounded-full bg-primary/10 text-primary">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        {city}
                                    </h3>
                                    <div className="space-y-3 mb-8">
                                        {commerceCategories.slice(0, 3).map(cat => (
                                            <Link
                                                key={`${city}-${cat.slug}`}
                                                href={`/ville/${slugify(city)}/${cat.slug}`}
                                                className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-all text-sm font-medium group/link"
                                            >
                                                {cat.name}
                                                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all" />
                                            </Link>
                                        ))}
                                    </div>
                                    <Button variant="ghost" className="w-full rounded-xl text-primary font-bold hover:bg-primary hover:text-white transition-all group/btn" asChild>
                                        <Link href={`/businesses?city=${city}`}>
                                            {tf('home.citySection.exploreCity', 'Explorer {city}', { city })}
                                            <ChevronRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                        </Link>
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="mt-16 flex flex-wrap justify-center gap-4">
                            <Button asChild variant="outline" className="rounded-full h-12 px-8 border-primary/20 text-primary hover:bg-primary/5">
                                <Link href="/top-rated">{t('home.topNational', 'Voir le Top National')}</Link>
                            </Button>
                            <Button asChild variant="outline" className="rounded-full h-12 px-8 border-primary/20 text-primary hover:bg-primary/5">
                                <Link href="/recently-added">{t('home.latestFinds', 'Dernieres decouvertes')}</Link>
                            </Button>
                        </div>
                    </section>
                );
            case 'featured-guides':
                return (
                    <section key="featured-guides" className="py-20 bg-secondary/20">
                        <div className="container mx-auto px-4">
                            <div className="text-center mb-10 space-y-2">
                                <h2 className="text-3xl md:text-4xl font-bold font-headline">{t('home.guides.title', 'Guides a la une')}</h2>
                                <p className="text-muted-foreground">{t('home.guides.subtitle', 'Des ressources pratiques pour orienter votre recherche.')}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <Card className="rounded-2xl border-border/60 hover:border-primary/30 transition-colors">
                                    <CardContent className="p-6 space-y-3">
                                        <Badge variant="outline">{t('home.guides.cityBadge', 'Guides par ville')}</Badge>
                                        <h3 className="font-bold text-lg">{t('home.guides.cityTitle', 'Comparez les villes avant de candidater')}</h3>
                                        <p className="text-sm text-muted-foreground">{t('home.guides.cityDesc', "Explorez les entreprises par ville et reperez rapidement les meilleurs bassins d'emploi.")}</p>
                                        <Button asChild variant="ghost" className="px-0">
                                            <Link href="/villes">{t('home.guides.cityCta', 'Voir les guides ville')} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-2xl border-border/60 hover:border-primary/30 transition-colors">
                                    <CardContent className="p-6 space-y-3">
                                        <Badge variant="outline">{t('home.guides.salaryBadge', 'Salaire par secteur')}</Badge>
                                        <h3 className="font-bold text-lg">{t('home.guides.salaryTitle', 'Situez votre remuneration')}</h3>
                                        <p className="text-sm text-muted-foreground">{t('home.guides.salaryDesc', 'Consultez les reperes salariaux par metier, ville et secteur pour negocier avec confiance.')}</p>
                                        <Button asChild variant="ghost" className="px-0">
                                            <Link href="/salaires">{t('home.guides.salaryCta', 'Voir les guides salaire')} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-2xl border-border/60 hover:border-primary/30 transition-colors">
                                    <CardContent className="p-6 space-y-3">
                                        <Badge variant="outline">{t('home.guides.interviewBadge', 'Avant entretien')}</Badge>
                                        <h3 className="font-bold text-lg">{t('home.guides.interviewTitle', 'Pourquoi consulter les avis avant un entretien')}</h3>
                                        <p className="text-sm text-muted-foreground">{t('home.guides.interviewDesc', 'Comprenez la culture, la gestion et les attentes terrain avant de vous engager.')}</p>
                                        <Button asChild variant="ghost" className="px-0">
                                            <Link href="/about">{t('home.guides.interviewCta', 'Lire le guide')} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </section>
                );
            case 'how-it-works':
                return (
                    <section key="how-it-works" className="py-16 container mx-auto px-4">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline">{t('home.howItWorks.title', 'Comment ca marche')}</h2>
                            <p className="text-muted-foreground mt-2">{t('home.howItWorks.subtitle', 'Parcours simple: chercher, comparer, contribuer.')}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {[
                                { step: '1', title: t('home.howItWorks.step1Title', 'Cherchez une entreprise'), desc: t('home.howItWorks.step1Desc', 'Utilisez les filtres ville, secteur et salaire pour aller droit au but.'), icon: Search },
                                { step: '2', title: t('home.howItWorks.step2Title', 'Comparez fiches et salaires'), desc: t('home.howItWorks.step2Desc', 'Analysez les profils complets et les indicateurs salariaux disponibles.'), icon: Sparkles },
                                { step: '3', title: t('home.howItWorks.step3Title', 'Postez votre avis'), desc: t('home.howItWorks.step3Desc', 'Partagez un retour anonyme pour aider la communaute.'), icon: Star },
                            ].map((item) => (
                                <Card key={item.step} className="rounded-2xl border-border/60">
                                    <CardContent className="p-6 space-y-3">
                                        <Badge variant="secondary">{tf('home.howItWorks.stepBadge', 'Etape {step}', { step: item.step })}</Badge>
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                            <item.icon className="h-5 w-5" />
                                        </div>
                                        <h3 className="font-bold text-lg">{item.title}</h3>
                                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                            <Button asChild className="rounded-xl">
                                <Link href="/businesses">{t('home.howItWorks.searchCta', 'Commencer la recherche')}</Link>
                            </Button>
                            <Button asChild variant="outline" className="rounded-xl">
                                <Link href="/review">{t('home.howItWorks.reviewCta', 'Publier un avis')}</Link>
                            </Button>
                        </div>
                    </section>
                );
            case 'featured':
                return displayFeaturedBusinesses.length > 0 ? (
                    <section key="featured" className="py-24 container mx-auto px-4">
                        <div className="flex justify-between items-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline">{t('home.featured.title', 'A la une')}</h2>
                            <Button asChild variant="outline" className="hidden md:flex rounded-full">
                                <Link href="/businesses?featured=true">{t('home.seeAll', 'Voir tout')} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                        </div>
                        <Carousel
                            opts={{ align: "start", loop: true }}
                            className="w-full group"
                        >
                            <CarouselContent className="-ml-4">
                                {displayFeaturedBusinesses.map((business) => (
                                    <CarouselItem key={business.id} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                                        <div className="h-full py-2">
                                            <BusinessCard business={business} />
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>

                            {/* Navigation Arrows */}
                            <div className="flex justify-center gap-4 mt-8">
                                <CarouselPrevious className="relative static translate-y-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <CarouselNext className="relative static translate-y-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </Carousel>
                        <div className="mt-8 md:hidden text-center">
                            <Button asChild variant="outline" className="w-full rounded-full">
                                <Link href="/businesses?featured=true">{t('home.seeAll', 'Voir tout')} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                        </div>
                    </section>
                ) : null;
            case 'resources':
                return (
                    <section key="resources" className="py-24 bg-gradient-to-b from-background to-indigo-50/30 dark:to-indigo-950/10">
                        <div className="container mx-auto px-4">
                            <div className="flex flex-col lg:flex-row items-center gap-16">
                                <div className="flex-1 space-y-8 text-center lg:text-left">
                                    <Badge variant="outline" className="px-4 py-1.5 border-indigo-200 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-full font-bold uppercase tracking-wider text-[10px]">
                                        {t('home.resources.badge', 'Outils & droits du travail')}
                                    </Badge>
                                    <h2 className="text-4xl md:text-5xl font-bold font-headline leading-tight">
                                        {t('home.resources.titleLine1', 'Tout pour reussir votre')} <br />
                                        <span className="text-primary">{t('home.resources.titleLine2', 'carriere au Maroc')}</span>
                                    </h2>
                                    <p className="text-xl text-muted-foreground leading-relaxed">
                                        {t('home.resources.subtitlePrefix', 'En partenariat avec')} <span className="font-bold text-foreground">{siteSettings?.partner_app_name || "MOR RH"}</span>, {t('home.resources.subtitleSuffix', 'nous mettons a votre disposition des outils gratuits pour mieux gerer votre vie professionnelle.')}
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {[
                                            { title: t('home.resources.tool1Title', 'Simulateur de salaire'), desc: t('home.resources.tool1Desc', 'Calculez votre brut en net'), icon: Activity },
                                            { title: t('home.resources.tool2Title', "Calcul d'indemnites"), desc: t('home.resources.tool2Desc', 'Estimez vos droits de depart'), icon: Zap },
                                            { title: t('home.resources.tool3Title', 'Modeles de lettres'), desc: t('home.resources.tool3Desc', 'Demission, reclamation...'), icon: Briefcase },
                                            { title: t('home.resources.tool4Title', 'Droit du travail'), desc: t('home.resources.tool4Desc', 'Articles et guides experts'), icon: GraduationCap },
                                        ].map((tool, idx) => (
                                            <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-white/5 border border-border shadow-sm hover:shadow-md transition-shadow">
                                                <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600">
                                                    <tool.icon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm">{tool.title}</h4>
                                                    <p className="text-xs text-muted-foreground">{tool.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-4">
                                        <Button asChild size="lg" className="rounded-2xl h-14 px-8 font-bold shadow-lg shadow-primary/20 group">
                                            <a href={siteSettings?.partner_app_url || "https://monrh.vercel.app/"} target="_blank" rel="noopener noreferrer">
                                                {t('home.resources.cta', 'Decouvrir tous les outils')}
                                                <ExternalLink className="ml-2 w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex-1 relative w-full max-w-xl mx-auto lg:mx-0">
                                    <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full transform translate-x-10 translate-y-10" />
                                    <div className="relative glass-card overflow-hidden rounded-[2.5rem] border border-white/20 dark:border-white/10 shadow-2xl">
                                        <div className="aspect-[4/3] bg-slate-900 flex items-center justify-center">
                                            {/* Mocking the UI or an image from Salarie.ma */}
                                            <div className="p-10 space-y-6 w-full">
                                                <div className="h-4 w-1/3 bg-white/20 rounded-full animate-pulse" />
                                                <div className="h-12 w-3/4 bg-primary/40 rounded-2xl animate-pulse" />
                                                <div className="space-y-3">
                                                    <div className="h-3 w-full bg-white/10 rounded-full" />
                                                    <div className="h-3 w-5/6 bg-white/10 rounded-full" />
                                                    <div className="h-3 w-4/6 bg-white/10 rounded-full" />
                                                </div>
                                                <div className="pt-4 grid grid-cols-3 gap-3">
                                                    <div className="h-20 rounded-2xl bg-indigo-500/20 border border-indigo-500/30" />
                                                    <div className="h-20 rounded-2xl bg-primary/20 border border-primary/30" />
                                                    <div className="h-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/30" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Small floating badge */}
                                    <div className="absolute -bottom-6 -left-6 glass border-white/20 p-4 rounded-3xl shadow-xl flex items-center gap-3 animate-bounce shadow-indigo-500/20">
                                        <div className="h-10 w-10 flex items-center justify-center bg-indigo-600 rounded-2xl text-white shadow-lg">
                                            <Star className="w-5 h-5 fill-current" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">{t('home.popular', 'Populaire')}</p>
                                            <p className="text-sm font-bold leading-none">Simulateur CNSS 2024</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                );
            default:
                return null;
        }
    };

    const defaultSectionOrder = [
        { id: 'hero', visible: true },
        { id: 'recently-added', visible: true },
        { id: 'trust-signals', visible: true },
        { id: 'stats', visible: true },
        { id: 'ad-banner-top', visible: true },
        { id: 'collections', visible: true },
        { id: 'categories', visible: true },
        { id: 'cities', visible: true },
        { id: 'featured-guides', visible: true },
        { id: 'how-it-works', visible: true },
        { id: 'resources', visible: true },
        { id: 'featured', visible: true },
    ];

    const configuredSections = Array.isArray(siteSettings?.home_sections_config)
        ? [...siteSettings.home_sections_config]
        : [];

    const configuredById = new Map(
        configuredSections
            .filter((section: any) => section && typeof section.id === 'string')
            .map((section: any) => [section.id, section])
    );

    const sectionOrder = configuredSections.length > 0
        ? [
            ...defaultSectionOrder.map((defaultSection) => configuredById.get(defaultSection.id) ?? defaultSection),
            ...configuredSections.filter((section: any) => !defaultSectionOrder.some((defaultSection) => defaultSection.id === section?.id)),
        ]
        : defaultSectionOrder;

    return (
        <div className="flex flex-col w-full min-h-screen">
            {sectionOrder
                .filter(s => s.visible)
                .map(s => renderSection(s.id))
            }
        </div>
    );
}

