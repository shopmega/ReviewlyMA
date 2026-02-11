import { getFilteredBusinesses } from '@/lib/data';
import { BusinessCard } from '@/components/shared/BusinessCard';
import { Badge } from '@/components/ui/badge';
import { Metadata } from 'next';
import { Sparkles, Calendar, Zap } from 'lucide-react';

// This page depends on live Supabase data; do not pre-render at build time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Nouveaux Établissements au Maroc | Avis.ma',
    description: 'Soyez les premiers à découvrir les dernières adresses ajoutées sur Avis.ma. Restaurants, boutiques et services récemment inscrits dans toutes les villes du Maroc.',
};

export default async function RecentlyAddedPage() {
    const { businesses } = await getFilteredBusinesses({
        limit: 48,
        sort: 'newest'
    });

    return (
        <div className="bg-background min-h-screen">
            <div className="bg-gradient-to-br from-blue-600/10 via-background to-background border-b py-20 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -mr-48 -mt-48" />
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 text-sm uppercase tracking-wider font-bold">Nouveautés</Badge>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold font-headline tracking-tight">
                            Derniers <span className="text-blue-600">Arrivés</span>
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed">
                            Explorez les nouvelles adresses qui viennent de rejoindre la communauté Avis.ma.
                            Donnez votre avis parmi les premiers et aidez ces entreprises à se faire connaître !
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-16">
                <div className="flex items-center justify-between mb-12">
                    <h2 className="text-3xl font-bold font-headline flex items-center gap-3">
                        <Zap className="w-6 h-6 text-primary" />
                        Fraîchement ajoutés
                    </h2>
                    <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-blue-500" /> Trié par date</span>
                        <span>•</span>
                        <span>{businesses.length} résultats</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {businesses.map((business) => (
                        <div key={business.id} className="group transition-all">
                            <BusinessCard business={business} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
