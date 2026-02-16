'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ArrowRight, Building, Utensils, Search, Star, Users, Car, MapPin,
    Sparkles, Activity, Wrench, ShoppingBag, Palmtree, Bed, ChevronRight,
    Landmark, Headphones, GraduationCap, Zap, Hotel, Home, Factory,
    Heart, Briefcase, Laptop, Wifi, Truck, Radio, LucideIcon
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

    const [searchCity, setSearchCity] = useState('Toutes les villes');
    const [homeQuery, setHomeQuery] = useState('');
    const normalizedSearchCity = searchCity === 'Toutes les villes' ? '' : searchCity;
    const trackedImpressionsRef = useRef<Set<string>>(new Set());

    const autoplayPlugin = useRef(
        Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true })
    );

    const [catApi, setCatApi] = useState<CarouselApi>();
    const [catCurrent, setCatCurrent] = useState(0);

    useEffect(() => {
        if (!catApi) return;

        setCatCurrent(catApi.selectedScrollSnap());

        catApi.on('select', () => {
            setCatCurrent(catApi.selectedScrollSnap());
        });
    }, [catApi]);


    const { featuredBusinesses: displayFeaturedBusinesses, reviewCount, businessCount } = useMemo(() => {
        const featured = featuredBusinesses.length > 0
            ? featuredBusinesses
            : businesses.filter(b => b.isFeatured).slice(0, 6);

        return {
            featuredBusinesses: featured,
            reviewCount: businesses.reduce((acc, c) => {
                const typedReviewCount = Array.isArray(c.reviews) ? c.reviews.length : 0;
                const fallbackReviewCount = typeof (c as any).review_count === 'number' ? (c as any).review_count : 0;
                return acc + (typedReviewCount || fallbackReviewCount);
            }, 0),
            businessCount: businesses.length,
        };
    }, [businesses, featuredBusinesses]);

    useEffect(() => {
        const visibleCollections = seasonalCollections.slice(0, 6);
        visibleCollections.forEach((collection, index) => {
            if (trackedImpressionsRef.current.has(collection.id)) return;
            trackedImpressionsRef.current.add(collection.id);
            analytics.trackCarouselImpression(collection.id, collection.title, index);
        });
    }, [seasonalCollections]);


    const stats = [
        { name: 'Établissements', value: (metrics?.businessCount ?? businessCount).toLocaleString('fr-MA'), icon: Building },
        { name: 'Avis employés', value: (metrics?.reviewCount ?? reviewCount).toLocaleString('fr-MA'), icon: Star },
    ];

    const renderSection = (id: string) => {
        switch (id) {
            case 'hero':
                return (
                    <section key="hero" className="relative w-full min-h-[85vh] flex flex-col items-center justify-center text-center overflow-hidden bg-background">
                        {/* Premium Background Elements */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            {/* Gradient Orbs */}
                            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '8s' }} />
                            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />

                            {/* Grid Pattern Overlay */}
                            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] dark:opacity-[0.05]" />
                        </div>

                        {/* Hero Content */}
                        <div className="relative z-10 container mx-auto px-4 flex flex-col items-center gap-10">
                            <div className="space-y-8 max-w-5xl animate-fade-in-up">
                                <Badge variant="outline" className="px-5 py-2 border-primary/20 text-primary bg-primary/5 backdrop-blur-md rounded-full transition-all hover:bg-primary/10 hover:border-primary/40 shadow-sm">
                                    ✨ La référence des avis professionnels au Maroc
                                </Badge>

                                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold font-headline text-foreground leading-[1.05] tracking-tight drop-shadow-sm">
                                    Découvrez votre <br className="hidden md:block" />
                                    <span className="relative inline-block mt-2">
                                        <span className="absolute inset-0 bg-gradient-to-r from-primary via-blue-500 to-sky-500 blur-2xl opacity-20 transform translate-y-4"></span>
                                        <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-sky-600 selection:text-white">Next Opportunity</span>
                                    </span>
                                </h1>

                                <p className="text-xl md:text-2xl text-muted-foreground font-body max-w-3xl mx-auto leading-relaxed">
                                    Explorez des milliers d'entreprises, consultez les salaires et lisez des avis authentiques pour prendre les meilleures décisions de carrière.
                                </p>
                            </div>

                            {/* Premium Search Bar */}
                            <div className="w-full max-w-4xl animate-fade-in-up [animation-delay:200ms]">
                                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-2 p-3 md:p-2 bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl hover:shadow-primary/5 transition-all duration-500 ring-1 ring-black/5 dark:ring-white/5">
                                    <div className="flex-1 w-full relative z-10">
                                        <SearchAutocomplete
                                            city={searchCity}
                                            placeholder="Entreprise, poste ou mot-clé..."
                                            className="w-full"
                                            inputClassName="bg-transparent border-none text-foreground placeholder:text-muted-foreground/50 text-base md:text-lg h-12 md:h-14 px-4 shadow-none focus-visible:ring-0"
                                            showIcon={false}
                                            onQueryChange={setHomeQuery}
                                            onSearch={(q) => {
                                                const params = new URLSearchParams();
                                                params.set('search', q);
                                                if (normalizedSearchCity) params.set('city', normalizedSearchCity);
                                                window.location.href = `/businesses?${params.toString()}`;
                                            }}
                                        />
                                    </div>

                                    <div className="hidden md:block w-px h-10 bg-border/50 mx-2" />

                                    <div className="w-full md:w-64 flex items-center h-12 md:h-14 px-2 bg-transparent rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                        <MapPin className="h-5 w-5 text-primary ml-2 mr-2 shrink-0" />
                                        <input type="hidden" name="city" value={searchCity} />
                                        <Select value={searchCity} onValueChange={setSearchCity}>
                                            <SelectTrigger className="w-full bg-transparent border-none text-foreground text-base md:text-lg shadow-none focus:ring-0 px-0 h-full">
                                                <SelectValue placeholder="Toutes les villes" />
                                            </SelectTrigger>
                                            <SelectContent className="glass border-white/10">
                                                <SelectItem value="Toutes les villes" className="cursor-pointer focus:bg-primary/10 transition-colors font-medium">Toutes les villes</SelectItem>
                                                {ALL_CITIES.map(city => (
                                                    <SelectItem key={city} value={city} className="cursor-pointer focus:bg-primary/10 transition-colors">{city}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Button
                                        onClick={() => {
                                            const params = new URLSearchParams();
                                            params.set('search', homeQuery);
                                            if (normalizedSearchCity) params.set('city', normalizedSearchCity);
                                            window.location.href = `/businesses?${params.toString()}`;
                                        }}
                                        size="lg"
                                        className="w-full md:w-auto h-12 md:h-14 px-8 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-bold text-base md:text-lg shadow-lg hover:shadow-primary/25 hover:scale-[1.02] transition-all active:scale-[0.98]"
                                    >
                                        Rechercher
                                    </Button>
                                </div>
                            </div>

                            {/* Popular Tags */}
                            <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3 animate-fade-in-up [animation-delay:400ms] mt-4 px-4">
                                <span className="text-muted-foreground text-xs md:text-sm font-semibold uppercase tracking-wider">Populaire:</span>
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
                            <h2 className="text-3xl md:text-5xl font-bold font-headline">Explorez par <span className="text-primary">Secteur</span></h2>
                            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Plongez dans nos collections thématiques et trouvez la société parfaite pour votre carrière.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {seasonalCollections.slice(0, 6).map((collection, index) => {
                                const link: CollectionLink = isValidCollectionLink(collection.link)
                                    ? collection.link
                                    : ({ type: 'custom', href: '/businesses' } as const);
                                const href = getCollectionHref(link);
                                return (
                                    <Link
                                        href={href}
                                        key={collection.id}
                                        className={`group relative overflow-hidden rounded-3xl h-[300px] flex flex-col justify-end p-8 border hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 ${index === 0 ? 'lg:col-span-2' : ''}`}
                                        onClick={async () => {
                                            // Track carousel click analytics
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
                                );
                            })}
                        </div>
                    </section>
                );
            case 'categories':
                return (
                    <section key="categories" className="py-20 bg-secondary/30">
                        <div className="container mx-auto px-4">
                            <div className="flex justify-between items-end mb-12">
                                <div>
                                    <h2 className="text-3xl md:text-4xl font-bold font-headline mb-2">Parcourir par Catégorie</h2>
                                    <p className="text-muted-foreground">Trouvez rapidement les meilleures sociétés par secteur.</p>
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
                            <h2 className="text-3xl md:text-5xl font-bold font-headline">Explorer par <span className="text-primary">Ville</span></h2>
                            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Découvrez les adresses les mieux notées dans les plus grandes villes du pays.</p>
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
                                            Explorer {city}
                                            <ChevronRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                        </Link>
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="mt-16 flex flex-wrap justify-center gap-4">
                            <Button asChild variant="outline" className="rounded-full h-12 px-8 border-primary/20 text-primary hover:bg-primary/5">
                                <Link href="/top-rated">Voir le Top National</Link>
                            </Button>
                            <Button asChild variant="outline" className="rounded-full h-12 px-8 border-primary/20 text-primary hover:bg-primary/5">
                                <Link href="/recently-added">Dernières découvertes</Link>
                            </Button>
                        </div>
                    </section>
                );
            case 'featured':
                return displayFeaturedBusinesses.length > 0 ? (
                    <section key="featured" className="py-24 container mx-auto px-4">
                        <div className="flex justify-between items-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline">À la Une</h2>
                            <Button asChild variant="outline" className="hidden md:flex rounded-full">
                                <Link href="/businesses?featured=true">Tout voir <ArrowRight className="ml-2 h-4 w-4" /></Link>
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
                                <Link href="/businesses?featured=true">Tout voir <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                        </div>
                    </section>
                ) : null;
            default:
                return null;
        }
    };

    const sectionOrder = siteSettings?.home_sections_config || [
        { id: 'hero', visible: true },
        { id: 'stats', visible: true },
        { id: 'ad-banner-top', visible: true },
        { id: 'collections', visible: true },
        { id: 'categories', visible: true },
        { id: 'cities', visible: true },
        { id: 'featured', visible: true },
    ];

    return (
        <div className="flex flex-col w-full min-h-screen">
            {sectionOrder
                .filter(s => s.visible)
                .map(s => renderSection(s.id))
            }
        </div>
    );
}
