import { getActiveCategories, getSubcategories } from '@/app/actions/categories';
import { getCategoriesWithCounts } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Utensils, Bed, Sparkles, Activity, Car, Wrench, ShoppingBag, Palmtree, ArrowRight, Search, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { AdSlot } from '@/components/shared/AdSlot';

// Categories list is database-backed; avoid build-time pre-render coupling.
export const dynamic = 'force-dynamic';

const iconMap: Record<string, React.ReactNode> = {
    'Restaurants & Cafés': <Utensils className="w-6 h-6" />,
    'Hôtels & Hébergements': <Bed className="w-6 h-6" />,
    'Salons de Beauté': <Sparkles className="w-6 h-6" />,
    'Santé & Bien-être': <Activity className="w-6 h-6" />,
    'Services Auto': <Car className="w-6 h-6" />,
    'Maison & Services': <Wrench className="w-6 h-6" />,
    'Shopping & Boutiques': <ShoppingBag className="w-6 h-6" />,
    'Activités & Loisirs': <Palmtree className="w-6 h-6" />,
};

const colorMap: Record<string, string> = {
    'Restaurants & Cafés': 'bg-orange-50 text-orange-600 border-orange-100',
    'Hôtels & Hébergements': 'bg-blue-50 text-blue-600 border-blue-100',
    'Salons de Beauté': 'bg-pink-50 text-pink-600 border-pink-100',
    'Santé & Bien-être': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Services Auto': 'bg-slate-50 text-slate-600 border-slate-100',
    'Maison & Services': 'bg-amber-50 text-amber-600 border-amber-100',
    'Shopping & Boutiques': 'bg-blue-50 text-blue-600 border-blue-100',
    'Activités & Loisirs': 'bg-cyan-50 text-cyan-600 border-cyan-100',
};

export default async function CategoriesPage() {
    // 1. Get counts from businesses (we still need this for the badges)
    const categoryCounts = await getCategoriesWithCounts();
    const countMap: Record<string, number> = {};
    categoryCounts.forEach(c => countMap[c.name] = c.count);

    // 2. Get dynamic categories from DB
    const categories = await getActiveCategories();

    // 3. Fetch subcategories for all active categories in parallel
    const categoriesWithSubcats = await Promise.all(
        categories.map(async (cat) => ({
            ...cat,
            count: countMap[cat.name] || 0,
            subcategories: await getSubcategories(cat.id)
        }))
    );

    return (
        <div className="bg-slate-50 min-h-screen">
            {/* Hero Header */}
            <section className="bg-white border-b border-slate-200 py-16 md:py-24">
                <div className="container mx-auto px-4 text-center space-y-6">
                    <Badge variant="outline" className="px-4 py-1 border-blue-100 text-blue-600 bg-blue-50/50 font-bold uppercase tracking-widest text-[10px]">
                        Exploration
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-headline font-bold text-slate-900 tracking-tight">
                        Parcourir par <span className="text-blue-600">Catégorie</span>
                    </h1>
                    <p className="text-slate-600 max-w-2xl mx-auto text-lg font-medium leading-relaxed">
                        Découvrez les meilleures entreprises triées par activité pour trouver exactement ce que vous cherchez.
                    </p>
                </div>
            </section>

            {/* Ad Unit */}
            <div className="container mx-auto px-4 pt-8">
                <AdSlot slot="categories-top-ad" className="bg-white/50 border border-slate-200 rounded-3xl min-h-[90px]" />
            </div>

            {/* Categories Grid */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {categoriesWithSubcats.map((cat) => {
                            const colorClass = colorMap[cat.name] || 'bg-slate-50 text-slate-600 border-slate-100';
                            const icon = cat.icon ? (
                                <span className="text-3xl">{cat.icon}</span>
                            ) : (
                                iconMap[cat.name] || <Search className="w-6 h-6" />
                            );

                            return (
                                <Card key={cat.id} className="group border-slate-200 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 rounded-3xl overflow-hidden bg-white">
                                    <CardHeader className="pb-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border ${colorClass} transition-transform group-hover:scale-110 duration-300`}>
                                            {icon}
                                        </div>
                                        <CardTitle className="text-xl font-bold text-slate-900 line-clamp-1">{cat.name}</CardTitle>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="secondary" className="bg-slate-200 text-slate-700 border-none font-bold text-[10px] px-2 whitespace-nowrap">
                                                {cat.count} ÉTABLISSEMENTS
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="flex flex-wrap gap-1.5 min-h-[80px] content-start">
                                            {cat.subcategories.slice(0, 4).map((sub) => (
                                                <Link
                                                    key={sub.id}
                                                    href={`/businesses?category=${encodeURIComponent(cat.name)}&subcategory=${encodeURIComponent(sub.name)}`}
                                                    className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-full border border-slate-200 hover:border-indigo-100 transition-colors"
                                                >
                                                    {sub.name}
                                                </Link>
                                            ))}
                                            {cat.subcategories.length > 4 && (
                                                <span className="text-[10px] font-bold text-slate-600 py-1 px-1">
                                                    +{cat.subcategories.length - 4}
                                                </span>
                                            )}
                                            {cat.subcategories.length === 0 && (
                                                <span className="text-[10px] font-medium text-slate-500 italic">Aucune sous-catégorie</span>
                                            )}
                                        </div>
                                        <Button variant="ghost" className="w-full justify-between rounded-xl font-bold text-sm text-slate-900 hover:bg-slate-50 group-hover:text-indigo-600 p-0 h-auto py-2 pr-2" asChild>
                                            <Link href={`/categorie/${cat.slug}`}>
                                                <span className="pl-4">Voir tout</span>
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center transform transition-transform group-hover:translate-x-1 duration-300">
                                                    <ChevronRight className="w-4 h-4" />
                                                </div>
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-white border-t border-slate-200">
                <div className="container mx-auto px-4 text-center">
                    <div className="max-w-3xl mx-auto space-y-8">
                        <h2 className="text-3xl md:text-5xl font-headline font-bold text-slate-900 tracking-tight">
                            Vous ne trouvez pas ce que vous cherchez ?
                        </h2>
                        <p className="text-slate-600 text-lg font-medium">
                            Utilisez notre moteur de recherche avancé pour filtrer par ville, quartier ou commodités.
                        </p>
                        <Button size="lg" className="rounded-full bg-slate-900 hover:bg-slate-800 text-white px-10 py-7 text-lg font-bold shadow-2xl" asChild>
                            <Link href="/businesses">Recherche Avancée</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
