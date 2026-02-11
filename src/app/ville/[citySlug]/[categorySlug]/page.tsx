
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BusinessList } from '@/components/shared/BusinessList';
import { getFilteredBusinesses, getAllCategories, getAllBenefits, getSubcategoriesByCategory } from '@/lib/data';
import { getCategoryBySlug } from '@/app/actions/categories';
import { getCityFromSlug } from '@/lib/utils';
import { Suspense } from 'react';

interface CombinedPageProps {
    params: Promise<{ citySlug: string; categorySlug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: { params: Promise<{ citySlug: string; categorySlug: string }> }): Promise<Metadata> {
    const { citySlug, categorySlug } = await params;
    const city = getCityFromSlug(citySlug);
    const category = await getCategoryBySlug(categorySlug);

    if (!city || !category) return { title: 'Page non trouvée' };

    // Result count for indexing rules
    const result = await getFilteredBusinesses({
        city,
        category: category.name,
        limit: 1,
        minimal: true
    });

    const robots = result.totalCount >= 10 ? 'index, follow' : 'noindex, follow';

    return {
        title: `${category.name} à ${city} | Top établissements et avis`,
        description: `Trouvez les meilleurs ${category.name} à ${city}. Consultez les classements, les photos et les avis des clients de la communauté.`,
        alternates: {
            canonical: `/ville/${citySlug}/${categorySlug}`,
        },
        robots,
    };
}

export default async function CombinedPage({ params, searchParams }: CombinedPageProps) {
    const { citySlug, categorySlug } = await params;
    const city = getCityFromSlug(citySlug);
    const categoryData = await getCategoryBySlug(categorySlug);

    if (!city || !categoryData) {
        notFound();
    }

    const resolvedSearchParams = await searchParams;
    const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1;
    const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort as any : undefined;

    const [result, categories, allBenefits, initialSubcategories] = await Promise.all([
        getFilteredBusinesses({
            city,
            category: categoryData.name,
            page,
            sort,
            limit: 9,
            minimal: true
        }),
        getAllCategories(),
        getAllBenefits(),
        getSubcategoriesByCategory(categoryData.name)
    ]);

    return (
        <div className="container mx-auto px-4 md:px-6 py-12">
            <div className="mb-12 space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
                        {categoryData.name} à <span className="text-primary">{city}</span>
                    </h1>
                    <p className="text-slate-600 text-lg max-w-3xl">
                        Découvrez les {result.totalCount} meilleurs services de type <span className="font-bold underline decoration-primary/30">{categoryData.name}</span> situés à <span className="font-bold">{city}</span>.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                    <div className="bg-primary/5 border border-primary/10 rounded-full px-4 py-1 text-sm font-medium text-primary">
                        {city}
                    </div>
                    <div className="bg-primary/5 border border-primary/10 rounded-full px-4 py-1 text-sm font-medium text-primary uppercase tracking-wider">
                        {categoryData.name}
                    </div>
                </div>
            </div>

            <Suspense fallback={<div className="flex justify-center py-20">Chargement des résultats...</div>}>
                <BusinessList
                    initialBusinesses={result.businesses}
                    totalCount={result.totalCount}
                    totalPages={result.totalPages}
                    currentPage={result.page}
                    categories={categories}
                    initialSubcategories={initialSubcategories}
                    allBenefits={allBenefits}
                />
            </Suspense>

            {result.totalCount === 0 && (
                <div className="mt-20 text-center space-y-4">
                    <div className="text-5xl">🔍</div>
                    <h2 className="text-2xl font-bold">Aucun résultat trouvé</h2>
                    <p className="text-slate-500">
                        Nous n'avons pas encore d'établissements dans cette catégorie à {city}.
                    </p>
                </div>
            )}
        </div>
    );
}
