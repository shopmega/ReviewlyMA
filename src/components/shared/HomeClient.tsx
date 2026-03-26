'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    ArrowRight, Building, Utensils, Search, Star, Users, Car, MapPin,
    Sparkles, Activity, Wrench, ShoppingBag, Palmtree, Bed, ChevronRight,
    Landmark, Headphones, GraduationCap, Zap, Hotel, Home, Factory, ShieldCheck,
    Heart, Briefcase, Laptop, Wifi, Truck, Radio, LucideIcon, ExternalLink
} from 'lucide-react';
import { BusinessCard } from '@/components/shared/BusinessCard';
import Image from 'next/image';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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
    recentAnalyses?: any[]; // Recent anonymized job offer verdicts
}

const isValidCollectionLink = (link: any): link is CollectionLink => {
    return !!link && typeof link === 'object' && typeof link.type === 'string';
};

export function HomeClient({ initialBusinesses, seasonalCollections, siteSettings, categories, featuredBusinesses = [], metrics, recentAnalyses = [] }: HomeClientProps) {
    const { locale, t, tf } = useI18n();
    const ctaExperiment = 'homepage_conversion_cta_v2';
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

    const firstCity = ALL_CITIES[0] || 'Casablanca';
    const secondCity = ALL_CITIES[1] || 'Marrakech';
    const popularSearches = siteSettings?.popular_searches_config || [
        {
            label: tf('home.hero.popularFallback.techInCity', 'Tech companies in {city}', { city: firstCity }),
            href: `/businesses?search=Tech&city=${firstCity}`,
        },
        { label: t('home.hero.popularFallback.consulting', 'Consulting companies'), href: '/businesses?search=Consulting' },
        {
            label: tf('home.hero.popularFallback.banksInCity', 'Banks in {city}', { city: secondCity }),
            href: `/businesses?category=Finance&city=${secondCity}`,
        },
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
    const trackHomeCta = useCallback(
        (ctaId: string, placement: string, extra: Record<string, any> = {}) => {
            analytics.trackCtaClick(
                ctaId,
                placement,
                'homepage',
                'homepage_conversion_funnel',
                ctaExperiment,
                undefined,
                extra
            );
        },
        [ctaExperiment]
    );

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
                                    {t('home.hero.badge', 'Des signaux plus clairs sur les employeurs')}
                                </Badge>

                                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-headline text-foreground leading-[1.08] tracking-tight drop-shadow-sm">
                                    {t('home.hero.titleLine1', 'Comprendre une entreprise')}
                                    <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-sky-600">
                                        {t('home.hero.titleLine2', 'avant d\u2019y entrer.')}
                                    </span>
                                </h1>

                                <p className="text-lg md:text-xl text-muted-foreground font-body max-w-2xl mx-auto leading-relaxed">
                                    {t('home.hero.subtitle', 'Avis, salaires et signaux de parrainage pour evaluer les employeurs marocains.')}
                                </p>
                            </div>

                            {/* Secondary Search + Filters */}
                            <div className="w-full max-w-2xl animate-fade-in-up [animation-delay:400ms] mt-4">
                                <p className="text-center text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-widest opacity-80">
                                    Ou recherchez un employeur
                                </p>
                                <div className="surface-strong flex flex-col md:flex-row items-stretch md:items-center gap-2 p-2 bg-white/80 dark:bg-card/90 backdrop-blur-xl border-border/40 ring-1 ring-black/5">
                                    <div className="flex-1 w-full relative z-10">
                                        <SearchAutocomplete
                                            city={searchCity}
                                            placeholder={t('home.hero.searchPlaceholder', 'Entreprise, poste ou mot-clé...')}
                                            className="w-full"
                                            inputClassName="bg-transparent border-none text-foreground placeholder:text-muted-foreground/50 text-base h-11 px-4 shadow-none focus-visible:ring-0"
                                            showIcon={false}
                                            onQueryChange={setHomeQuery}
                                            onSearch={(q) => {
                                                trackHomeCta('search_submit', 'hero_search_autocomplete', { source: 'autocomplete_enter' });
                                                window.location.href = buildSearchUrl(q);
                                            }}
                                        />
                                    </div>

                                    <Button
                                        onClick={() => {
                                            trackHomeCta('search_submit', 'hero_search_button', { source: 'hero_primary_button' });
                                            window.location.href = buildSearchUrl(homeQuery);
                                        }}
                                        size="lg"
                                        className="w-full md:w-auto h-11 px-6 rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 font-bold transition-all"
                                    >
                                        {t('home.hero.searchCta', 'Rechercher')}
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
                                    <Button asChild size="lg" variant="outline" className="rounded-xl h-11 px-6 font-bold border-primary/30 text-primary hover:bg-primary/5">
                                        <Link href="/review" onClick={() => trackHomeCta('write_review', 'hero_secondary_cta')}>
                                            <Star className="mr-2 h-4 w-4" />
                                            {t('home.hero.writeReview', 'Ecrire un avis')}
                                        </Link>
                                    </Button>
                                    <Link
                                        href="/pro"
                                        onClick={() => trackHomeCta('claim_listing', 'hero_text_link')}
                                        className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        <ShieldCheck className="h-4 w-4" />
                                        {t('home.hero.claimCta', 'Revendiquer une fiche')}
                                    </Link>
                                </div>
                            </div>

                            {/* Popular Tags */}
                            <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3 animate-fade-in-up [animation-delay:400ms] mt-2 md:mt-3 px-4">
                                <span className="text-muted-foreground text-xs md:text-sm font-semibold uppercase tracking-wider">{t('home.popular', 'Populaire:')}</span>
                                {popularSearches.map((search: { label: string; href: string }) => (
                                    <Link
                                        key={search.href}
                                        href={search.href}
                                        className="px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium text-muted-foreground border border-border/70 bg-background/80 transition-all hover:text-primary hover:border-primary/30 hover:-translate-y-0.5"
                                    >
                                        {search.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                );
            case 'decision-pulse':
                return (
                    <section key="decision-pulse" className="container mx-auto px-4 py-14">
                        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 animate-fade-in-up">
                            <Link
                                href="/job-offers"
                                onClick={() => trackHomeCta('analyze_offer', 'hero_card_primary')}
                                className="group relative overflow-hidden surface-strong p-6 md:p-8 bg-white/90 dark:bg-card/95 backdrop-blur-xl border-primary/20 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] shadow-xl hover:shadow-primary/10"
                            >
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Zap className="h-24 w-24 text-primary" />
                                </div>
                                <div className="relative z-10 flex flex-col items-start gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <div className="text-left space-y-1">
                                        <h3 className="text-xl md:text-2xl font-bold">{t('home.hero.scanCta', 'Analyser mon offre')}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            Obtenez un verdict IA sur votre contrat, le salaire et les signaux de risque.
                                        </p>
                                    </div>
                                    <div className="flex items-center text-primary font-bold text-sm tracking-wide group-hover:gap-2 transition-all">
                                        Démarrer le scan <ArrowRight className="ml-1 h-4 w-4" />
                                    </div>
                                </div>
                            </Link>

                            <Link
                                href="/salaires"
                                onClick={() => trackHomeCta('compare_salary', 'hero_card_secondary')}
                                className="group relative overflow-hidden surface-soft p-6 md:p-8 bg-white/70 dark:bg-card/80 backdrop-blur-xl border-border/40 hover:border-primary/30 transition-all duration-300 hover:scale-[1.02] shadow-lg"
                            >
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Activity className="h-24 w-24 text-blue-600" />
                                </div>
                                <div className="relative z-10 flex flex-col items-start gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
                                        <Briefcase className="h-6 w-6" />
                                    </div>
                                    <div className="text-left space-y-1">
                                        <h3 className="text-xl md:text-2xl font-bold">{t('home.hero.compareSalaryCta', 'Comparer mon salaire')}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            Découvrez où vous vous situez sur le marché marocain actuel.
                                        </p>
                                    </div>
                                    <div className="flex items-center text-blue-600 dark:text-blue-400 font-bold text-sm tracking-wide group-hover:gap-2 transition-all">
                                        Voir les benchmarks <ArrowRight className="ml-1 h-4 w-4" />
                                    </div>
                                </div>
                            </Link>
                        </div>
                        
                        {/* Decision Pulse: Recent Verdicts */}
                        {recentAnalyses && recentAnalyses.length > 0 && (
                            <div className="mt-12 animate-fade-in-up [animation-delay:600ms]">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                        Derniers verdicts anonymisés
                                    </h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {recentAnalyses.slice(0, 3).map((analysis, idx) => (
                                        <div key={idx} className="surface-soft p-4 rounded-2xl border border-border/40 flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <Badge variant="outline" className={cn(
                                                    "capitalize",
                                                    analysis.market_position_label === 'ACCEPT' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                    analysis.market_position_label === 'NEGOTIATE' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                    "bg-rose-50 text-rose-700 border-rose-200"
                                                )}>
                                                    Verdict: {(analysis.market_position_label || 'ANALYSE').toLowerCase()}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground uppercase">{analysis.city}</span>
                                            </div>
                                            <p className="text-sm font-semibold line-clamp-1">{analysis.job_title}</p>
                                            <div className="flex items-center justify-between mt-auto">
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <span className="font-bold text-foreground">{analysis.salary_min} - {analysis.salary_max} MAD</span>
                                                    <span>•</span>
                                                    <span>{analysis.seniority_level}</span>
                                                </div>
                                                <Link href="/job-offers" className="text-xs font-bold text-primary hover:underline">
                                                    Scanner la mienne
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
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
            case 'ad-banner-top':
                return (
                    <div key="ad-banner-top" className="container mx-auto px-4 py-8">
                        <AdSlot slot="home-top-banner" className="bg-muted/30 border border-border/50 rounded-2xl min-h-[120px]" />
                    </div>
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
                            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t('home.citySection.subtitle', 'Découvrez les employeurs les mieux notés dans les plus grandes villes du pays.')}</p>
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
                                <Card key={item.step} className="surface-soft">
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
                    <section key="resources" className="py-20 border-t bg-slate-50/50 dark:bg-slate-900/10">
                        <div className="container mx-auto px-4">
                            <div className="max-w-4xl mx-auto space-y-12">
                                <div className="text-center space-y-4">
                                    <Badge variant="outline" className="px-4 py-1.5 border-indigo-200 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-full font-bold uppercase tracking-wider text-[10px]">
                                        {t('home.resources.badge', 'Outils & droits du travail')}
                                    </Badge>
                                    <h2 className="text-3xl md:text-4xl font-bold font-headline leading-tight">
                                        {t('home.resources.titleLine1', 'Tout pour reussir votre')} <span className="text-primary">{t('home.resources.titleLine2', 'carriere au Maroc')}</span>
                                    </h2>
                                    <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                                        {t('home.resources.subtitlePrefix', 'En partenariat avec')} <span className="font-bold text-foreground">{siteSettings?.partner_app_name || "MOR RH"}</span>, {t('home.resources.subtitleSuffix', 'nous mettons a votre disposition des outils gratuits pour mieux gerer votre vie professionnelle.')}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {[
                                        { title: t('home.resources.tool1Title', 'Simulateur de salaire'), desc: t('home.resources.tool1Desc', 'Calculez votre brut en net'), icon: Activity },
                                        { title: t('home.resources.tool2Title', "Calcul d'indemnites"), desc: t('home.resources.tool2Desc', 'Estimez vos droits de depart'), icon: Zap },
                                        { title: t('home.resources.tool3Title', 'Modeles de lettres'), desc: t('home.resources.tool3Desc', 'Demission, reclamation...'), icon: Briefcase },
                                        { title: t('home.resources.tool4Title', 'Droit du travail'), desc: t('home.resources.tool4Desc', 'Consultez le code du travail'), icon: Landmark },
                                    ].map((tool, i) => (
                                        <div key={i} className="surface-soft p-6 rounded-2xl border border-border/40 hover:border-primary/30 transition-all group">
                                            <div className="flex items-center gap-5">
                                                <div className="h-12 w-12 shrink-0 flex items-center justify-center bg-primary/10 rounded-2xl text-primary transition-transform group-hover:scale-110">
                                                    <tool.icon className="w-6 h-6" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="font-bold text-base">{tool.title}</h4>
                                                    <p className="text-sm text-muted-foreground">{tool.desc}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-center">
                                    <Button asChild size="lg" className="cta-primary rounded-2xl h-14 px-8 group">
                                        <a href={siteSettings?.partner_app_url || "https://monrh.vercel.app/"} target="_blank" rel="noopener noreferrer">
                                            Acceder à tous les outils
                                            <ExternalLink className="ml-2 w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </a>
                                    </Button>
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
        { id: 'ad-banner-top', visible: true },
        { id: 'decision-pulse', visible: true },
        { id: 'categories', visible: true },
        { id: 'recently-added', visible: true },
        { id: 'featured', visible: true },
        { id: 'cities', visible: true },
        { id: 'how-it-works', visible: true },
        { id: 'resources', visible: true }
    ];

    const configuredSections = Array.isArray(siteSettings?.home_sections_config)
        ? siteSettings.home_sections_config
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

