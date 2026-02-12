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
    'Restaurants & CafÃ©s': <Utensils className="w-6 h-6" />,
    'HÃ´tels & HÃ©bergements': <Bed className="w-6 h-6" />,
    'Salons de BeautÃ©': <Sparkles className="w-6 h-6" />,
    'SantÃ© & Bien-Ãªtre': <Activity className="w-6 h-6" />,
    'Services Auto': <Car className="w-6 h-6" />,
    'Maison & Services': <Wrench className="w-6 h-6" />,
    'Shopping & Boutiques': <ShoppingBag className="w-6 h-6" />,
    'ActivitÃ©s & Loisirs': <Palmtree className="w-6 h-6" />,
};

const colorMap: Record<string, string> = {
    'Restaurants & CafÃ©s': 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30',
    'HÃ´tels & HÃ©bergements': 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
    'Salons de BeautÃ©': 'bg-pink-50 text-pink-600 border-pink-100 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/30',
    'SantÃ© & Bien-Ãªtre': 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    'Services Auto': 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-500/15 dark:text-slate-200 dark:border-slate-500/30',
    'Maison & Services': 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    'Shopping & Boutiques': 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
    'ActivitÃ©s & Loisirs': 'bg-cyan-50 text-cyan-600 border-cyan-100 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30',
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
        <div className="bg-background min-h-screen">
            {/* Hero Header */}
            <section className="bg-card border-b border-border py-16 md:py-24">
                <div className="container mx-auto px-4 text-center space-y-6">
                    <Badge variant="outline" className="px-4 py-1 border-blue-100 text-blue-600 bg-blue-50/50 dark:border-blue-400/40 dark:text-blue-300 dark:bg-blue-500/10 font-bold uppercase tracking-widest text-[10px]">
                        Exploration
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-headline font-bold text-foreground tracking-tight">
                        Parcourir par <span className="text-blue-600">CatÃ©gorie</span>
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-medium leading-relaxed">
                        DÃ©couvrez les meilleures entreprises triÃ©es par activitÃ© pour trouver exactement ce que vous cherchez.
                    </p>
                </div>
            </section>

            {/* Ad Unit */}
            <div className="container mx-auto px-4 pt-8">
                <AdSlot slot="categories-top-ad" className="bg-card/60 border border-border rounded-3xl min-h-[90px]" />
            </div>

            {/* Categories Grid */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {categoriesWithSubcats.map((cat) => {
                            const colorClass = colorMap[cat.name] || 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-500/15 dark:text-slate-200 dark:border-slate-500/30';
                            const icon = cat.icon ? (
                                <span className="text-3xl">{cat.icon}</span>
                            ) : (
                                iconMap[cat.name] || <Search className="w-6 h-6" />
                            );

                            return (
                                <Card key={cat.id} className="group border-border hover:border-blue-400/40 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 rounded-3xl overflow-hidden bg-card">
                                    <CardHeader className="pb-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border ${colorClass} transition-transform group-hover:scale-110 duration-300`}>
                                            {icon}
                                        </div>
                                        <CardTitle className="text-xl font-bold text-foreground line-clamp-1">{cat.name}</CardTitle>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="secondary" className="bg-muted text-muted-foreground border-none font-bold text-[10px] px-2 whitespace-nowrap">
                                                {cat.count} Ã‰TABLISSEMENTS
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="flex flex-wrap gap-1.5 min-h-[80px] content-start">
                                            {cat.subcategories.slice(0, 4).map((sub) => (
                                                <Link
                                                    key={sub.id}
                                                    href={`/businesses?category=${encodeURIComponent(cat.name)}&subcategory=${encodeURIComponent(sub.name)}`}
                                                    className="text-[11px] font-bold text-muted-foreground bg-muted/70 hover:bg-indigo-500/10 hover:text-indigo-400 px-2.5 py-1 rounded-full border border-border hover:border-indigo-400/30 transition-colors"
                                                >
                                                    {sub.name}
                                                </Link>
                                            ))}
                                            {cat.subcategories.length > 4 && (
                                                <span className="text-[10px] font-bold text-muted-foreground py-1 px-1">
                                                    +{cat.subcategories.length - 4}
                                                </span>
                                            )}
                                            {cat.subcategories.length === 0 && (
                                                <span className="text-[10px] font-medium text-muted-foreground italic">Aucune sous-catÃ©gorie</span>
                                            )}
                                        </div>
                                        <Button variant="ghost" className="w-full justify-between rounded-xl font-bold text-sm text-foreground hover:bg-muted group-hover:text-indigo-500 p-0 h-auto py-2 pr-2" asChild>
                                            <Link href={`/categorie/${cat.slug}`}>
                                                <span className="pl-4">Voir tout</span>
                                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center transform transition-transform group-hover:translate-x-1 duration-300">
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
            <section className="py-24 bg-card border-t border-border">
                <div className="container mx-auto px-4 text-center">
                    <div className="max-w-3xl mx-auto space-y-8">
                        <h2 className="text-3xl md:text-5xl font-headline font-bold text-foreground tracking-tight">
                            Vous ne trouvez pas ce que vous cherchez ?
                        </h2>
                        <p className="text-muted-foreground text-lg font-medium">
                            Utilisez notre moteur de recherche avancÃ© pour filtrer par ville, quartier ou commoditÃ©s.
                        </p>
                        <Button size="lg" className="rounded-full px-10 py-7 text-lg font-bold shadow-2xl" asChild>
                            <Link href="/businesses">Recherche AvancÃ©e</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
