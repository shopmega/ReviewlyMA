import { getFilteredBusinesses } from '@/lib/data';
import { parseSeoSlug, generateSeoTitle, generateSeoDescription } from '@/lib/seo-utils';
import { BusinessCard } from '@/components/shared/BusinessCard';
import { Badge } from '@/components/ui/badge';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Trophy, Star, MapPin } from 'lucide-react';
import { getCategoryBySlug } from '@/app/actions/categories';

interface SEOPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SEOPageProps): Promise<Metadata> {
    const { slug } = await params;
    const parsed = parseSeoSlug(slug);
    if (!parsed) return { title: 'Non trouvé' };

    const categoryData = await getCategoryBySlug(parsed.category);
    const categoryName = categoryData?.name || parsed.category;

    const { businesses } = await getFilteredBusinesses({
        category: categoryName,
        city: parsed.city,
        limit: 1,
    });

    const title = generateSeoTitle(categoryName, parsed.city);
    const description = generateSeoDescription(categoryName, parsed.city, businesses.length || 10);

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
        },
    };
}

export default async function BestOfPage({ params }: SEOPageProps) {
    const { slug } = await params;

    if (!slug) {
        notFound();
    }

    const parsed = parseSeoSlug(slug);

    if (!parsed) {
        notFound();
    }

    const categoryData = await getCategoryBySlug(parsed.category);
    const categoryName = categoryData?.name || parsed.category;

    const { businesses, totalCount } = await getFilteredBusinesses({
        category: categoryName,
        city: parsed.city,
        limit: 20,
        sort: 'rating'
    });

    if (businesses.length === 0) {
        // If no exact category match, we could try to find similar or just show city results
        // For now, let's keep it simple
    }

    return (
        <div className="bg-background min-h-screen">
            {/* Search Result Header / Hero */}
            <div className="bg-gradient-to-b from-primary/5 to-background border-b pt-12 pb-16">
                <div className="container mx-auto px-4">
                    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                        <Link href="/" className="hover:text-primary">Accueil</Link>
                        <ChevronRight className="w-3 h-3" />
                        <Link href="/explore" className="hover:text-primary">Explorer</Link>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-foreground font-medium capitalize">{parsed.city}</span>
                    </nav>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-6 h-6 text-amber-500" />
                                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Classement 2026</Badge>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
                                Les Meilleurs <span className="text-primary">{categoryName}</span> à {parsed.city}
                            </h1>
                            <p className="text-xl text-muted-foreground max-w-2xl">
                                Basé sur {totalCount} entreprises et des milliers d'avis de la communauté marocaine.
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <div className="bg-card p-4 rounded-2xl shadow-sm border flex items-center gap-3">
                                <div className="bg-emerald-500/10 p-2 rounded-xl">
                                    <Star className="w-5 h-5 text-emerald-600 fill-current" />
                                </div>
                                <div>
                                    <div className="text-xl font-bold">4.5+</div>
                                    <div className="text-xs text-muted-foreground">Note moyenne</div>
                                </div>
                            </div>
                            <div className="bg-card p-4 rounded-2xl shadow-sm border flex items-center gap-3">
                                <div className="bg-blue-500/10 p-2 rounded-xl">
                                    <MapPin className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <div className="text-xl font-bold">{totalCount}</div>
                                    <div className="text-xs text-muted-foreground">Adresses</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    {/* List side */}
                    <div className="lg:col-span-3 space-y-8">
                        {businesses.length === 0 ? (
                            <div className="text-center py-24 bg-muted/30 rounded-3xl border-2 border-dashed">
                                <h3 className="text-2xl font-bold mb-2">Aucune entreprise trouvée</h3>
                                <p className="text-muted-foreground">Nous n'avons pas encore d'adresses pour cette catégorie précise à {parsed.city}.</p>
                                <Button asChild className="mt-8 rounded-full" variant="outline">
                                    <Link href="/">Voir tout à {parsed.city}</Link>
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {businesses.map((business, idx) => (
                                        <div key={business.id} className="relative">
                                            {idx < 3 && (
                                                <div className="absolute -top-3 -left-3 z-10 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-bold shadow-lg border-2 border-white rotate-[-10deg]">
                                                    #{idx + 1}
                                                </div>
                                            )}
                                            <BusinessCard business={business} />
                                        </div>
                                    ))}
                                </div>

                                {/* SEO Text Footer */}
                                <div className="prose prose-slate max-w-none mt-20 p-8 bg-muted/20 rounded-3xl border">
                                    <h2 className="text-2xl font-bold mb-4">Comment nous classons les {parsed.category} à {parsed.city} ?</h2>
                                    <p>
                                        Notre classement est basé sur un algorithme pondéré qui prend en compte la note moyenne, le nombre d'avis récents, la complétude du profil et le statut de vérification.
                                        Nous privilégions les entreprises qui interagissent activement avec leurs employés et qui maintiennent des informations à jour.
                                    </p>
                                    <p>
                                        Si vous êtes propriétaire d'une entreprise à {parsed.city} et que vous souhaitez figurer dans ce classement, assurez-vous de revendiquer votre fiche et de récolter des avis positifs de vos employés.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Sidebar / Filters */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-6">
                            <Card className="border-none shadow-lg overflow-hidden">
                                <div className="bg-primary p-4 text-white font-bold flex items-center gap-2">
                                    <Star className="w-5 h-5 fill-current" />
                                    Top Villes pour {parsed.category}
                                </div>
                                <CardContent className="p-4">
                                    <div className="space-y-2">
                                        {['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Agadir'].map(city => (
                                            <Link
                                                key={city}
                                                href={`/best-${parsed.category.toLowerCase()}-in-${city.toLowerCase()}`}
                                                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-sm"
                                            >
                                                {city}
                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                            </Link>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-6">
                                <h3 className="font-bold text-xl mb-4">Vous êtes pro ?</h3>
                                <p className="text-sm text-indigo-100 mb-6 leading-relaxed">
                                    Augmentez votre visibilité à {parsed.city} en passant au statut Premium.
                                </p>
                                <Button className="w-full bg-white text-indigo-600 hover:bg-indigo-50 border-none rounded-xl font-bold" asChild>
                                    <Link href="/pour-les-pros">En savoir plus</Link>
                                </Button>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
