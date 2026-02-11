
import { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Building2, TrendingUp, ChevronRight, Search } from 'lucide-react';
import { ALL_CITIES, CITIES } from '@/lib/location-discovery';
import { Badge } from '@/components/ui/badge';
import { slugify } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getBusinesses } from '@/lib/data/businesses';

export const metadata: Metadata = {
    title: 'Parcourir par Ville | Platform',
    description: 'Découvrez les meilleures entreprises et services dans toutes les villes du Maroc. Consultez les avis par quartier à Casablanca, Rabat, Marrakech et plus.'
};

export default async function CitiesPage() {
    // We could fetch some counts here if we had an efficient way, 
    // but for now let's focus on the UI and global city list.

    return (
        <div className="bg-background min-h-screen">
            {/* Hero Section */}
            <section className="relative py-24 overflow-hidden border-b">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -mr-64 -mt-64" />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl space-y-6">
                        <Badge variant="outline" className="px-4 py-1 text-primary border-primary/20 bg-primary/5 rounded-full font-bold uppercase tracking-widest text-xs">
                            Guide Géographique
                        </Badge>
                        <h1 className="text-5xl md:text-7xl font-bold font-headline tracking-tight leading-[1.1]">
                            Explorez le Maroc <br />
                            <span className="text-primary italic">Ville par Ville</span>
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                            De Tanger à Lagouira, retrouvez les adresses les mieux notées et les avis de la communauté pour chaque quartier.
                        </p>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-20">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">

                    {/* Sidebar / Quick Links */}
                    <aside className="lg:col-span-1 space-y-8">
                        <div className="glass-card p-6 rounded-2xl border border-border/50 sticky top-28">
                            <h3 className="text-lg font-bold font-headline mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                Villes Populaires
                            </h3>
                            <div className="space-y-2">
                                {ALL_CITIES.slice(0, 6).map(city => (
                                    <Link
                                        key={city}
                                        href={`#${city.toLowerCase()}`}
                                        className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-all group"
                                    >
                                        <span className="font-medium group-hover:text-primary transition-colors">{city}</span>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                ))}
                            </div>

                            <div className="mt-8 pt-6 border-t border-border/50">
                                <Button className="w-full rounded-xl gap-2 h-12 shadow-lg hover:shadow-primary/20" asChild>
                                    <Link href="/top-rated">
                                        <TrendingUp className="w-4 h-4" />
                                        Top National
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </aside>

                    {/* Cities Grid */}
                    <div className="lg:col-span-3 space-y-16">
                        {ALL_CITIES.map((city) => (
                            <section key={city} id={city.toLowerCase()} className="scroll-mt-28 group">
                                <div className="flex items-end justify-between mb-8 border-b pb-4">
                                    <div className="space-y-1">
                                        <h2 className="text-4xl font-bold font-headline group-hover:text-primary transition-colors flex items-center gap-3">
                                            <MapPin className="w-8 h-8 text-primary/50 group-hover:text-primary transition-all" />
                                            {city}
                                        </h2>
                                        <p className="text-muted-foreground font-medium">
                                            Découvrez {CITIES[city].length} quartiers principaux
                                        </p>
                                    </div>
                                    <Button variant="ghost" className="rounded-xl group-hover:bg-primary/5 group-hover:text-primary" asChild>
                                        <Link href={`/ville/${slugify(city)}`}>
                                            Tout voir à {city}
                                            <ChevronRight className="ml-2 w-4 h-4" />
                                        </Link>
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {CITIES[city].map((quartier) => (
                                        <Link
                                            key={quartier}
                                            href={`/businesses?city=${city}&quartier=${quartier}`}
                                            className="glass-card p-4 rounded-xl border border-border/30 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all text-center group/item overflow-hidden relative"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                            <span className="relative z-10 font-medium text-sm text-foreground group-hover/item:text-primary transition-colors">
                                                {quartier}
                                            </span>
                                        </Link>
                                    ))}

                                    {/* Category Shortcuts for City */}
                                    <div className="col-span-full mt-4 flex flex-wrap gap-2">
                                        <Link href={`/ville/${slugify(city)}/banque-finance`}>
                                            <Badge variant="secondary" className="bg-secondary/50 hover:bg-secondary cursor-pointer py-1.5 px-4 rounded-full border border-border/50 transition-all font-medium text-xs">
                                                🏦 Finance
                                            </Badge>
                                        </Link>
                                        <Link href={`/ville/${slugify(city)}/technologie-it`}>
                                            <Badge variant="secondary" className="bg-secondary/50 hover:bg-secondary cursor-pointer py-1.5 px-4 rounded-full border border-border/50 transition-all font-medium text-xs">
                                                💻 Technologie
                                            </Badge>
                                        </Link>
                                        <Link href={`/ville/${slugify(city)}/industrie-chimie`}>
                                            <Badge variant="secondary" className="bg-secondary/50 hover:bg-secondary cursor-pointer py-1.5 px-4 rounded-full border border-border/50 transition-all font-medium text-xs">
                                                🏭 Industrie
                                            </Badge>
                                        </Link>
                                        <Link href={`/ville/${slugify(city)}/transport-logistique`}>
                                            <Badge variant="secondary" className="bg-secondary/50 hover:bg-secondary cursor-pointer py-1.5 px-4 rounded-full border border-border/50 transition-all font-medium text-xs">
                                                📦 Logistique
                                            </Badge>
                                        </Link>
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer CTA */}
            <section className="py-24 bg-primary/5 border-t">
                <div className="container mx-auto px-4 text-center space-y-8">
                    <h2 className="text-3xl md:text-5xl font-bold font-headline">Vous ne trouvez pas votre ville ?</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Aidez-nous à grandir en suggérant de nouveaux établissements dans votre région.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Button size="lg" className="rounded-2xl px-10 h-14 text-lg font-bold shadow-2xl shadow-primary/20" asChild>
                            <Link href="/suggest">Suggérer un lieu</Link>
                        </Button>
                        <Button size="lg" variant="outline" className="rounded-2xl px-10 h-14 text-lg font-bold border-primary/20 hover:bg-white" asChild>
                            <Link href="/contact">Nous contacter</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
