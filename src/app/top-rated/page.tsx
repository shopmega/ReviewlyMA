import { getFilteredBusinesses } from '@/lib/data';
import { BusinessCard } from '@/components/shared/BusinessCard';
import { Badge } from '@/components/ui/badge';
import { Metadata } from 'next';
import { Trophy, Star, TrendingUp } from 'lucide-react';

// This page depends on live Supabase data; do not pre-render at build time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Les Établissements les Mieux Notés du Maroc | Avis.ma',
    description: 'Découvrez la crème de la crème. Notre sélection des entreprises les mieux notées par la communauté Avis.ma à travers tout le Maroc.'
};

export default async function TopRatedPage() {
    const { businesses } = await getFilteredBusinesses({
        limit: 48,
        sort: 'rating',
        rating: 4
    });

    return (
        <div className="bg-background min-h-screen">
            <div className="bg-gradient-to-br from-amber-500/10 via-background to-background border-b py-20 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-48 -mt-48" />
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-500 p-2 rounded-xl shadow-lg shadow-amber-500/20">
                                <Trophy className="w-6 h-6 text-white" />
                            </div>
                            <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 text-sm uppercase tracking-wider font-bold">L'Excellence</Badge>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold font-headline tracking-tight">
                            Les Mieux Notés <span className="text-amber-600">du Maroc</span>
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed">
                            Nous avons rassemblé ici les entreprises qui font l'unanimité.
                            Gastronomie, loisirs, services... Découvrez ce qui se fait de mieux près de chez vous.
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-16">
                <div className="flex items-center justify-between mb-12">
                    <h2 className="text-3xl font-bold font-headline flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-primary" />
                        Classement National
                    </h2>
                    <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-500 fill-current" /> Note &gt; 4.0</span>
                        <span>•</span>
                        <span>{businesses.length} résultats</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {businesses.map((business, idx) => (
                        <div key={business.id} className="relative group">
                            <BusinessCard business={business} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
