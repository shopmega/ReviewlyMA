
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BusinessList } from '@/components/shared/BusinessList';
import { getFilteredBusinesses, getAllCategories, getAllBenefits, getSubcategoriesByCategory } from '@/lib/data';
import { getCategoryBySlug } from '@/app/actions/categories';
import { Suspense } from 'react';

interface CategoryPageProps {
    params: Promise<{ categorySlug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: { params: Promise<{ categorySlug: string }> }): Promise<Metadata> {
    const { categorySlug } = await params;
    const category = await getCategoryBySlug(categorySlug);

    if (!category) return { title: 'Catégorie non trouvée' };

    return {
        title: `Top ${category.name} au Maroc | Avis et recommandations`,
        description: `Trouvez les meilleures entreprises dans la catégorie ${category.name} partout au Maroc. Consultez les notes et avis des clients.`,
        alternates: {
            canonical: `/categorie/${categorySlug}`,
        },
    };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
    const { categorySlug } = await params;
    const categoryData = await getCategoryBySlug(categorySlug);

    if (!categoryData) {
        notFound();
    }

    const resolvedSearchParams = await searchParams;
    const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1;
    const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort as any : undefined;

    const [result, categories, allBenefits, initialSubcategories] = await Promise.all([
        getFilteredBusinesses({
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
                        {categoryData.name} <span className="text-primary">au Maroc</span>
                    </h1>
                    <p className="text-slate-600 text-lg max-w-3xl">
                        Découvrez les {result.totalCount} meilleurs établissements en {categoryData.name}. Comparez les services et lisez les avis certifiés.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
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
        </div>
    );
}
