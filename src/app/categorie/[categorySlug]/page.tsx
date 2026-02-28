
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BusinessList } from '@/components/shared/BusinessList';
import { getFilteredBusinesses, getAllCategories, getAllBenefits, getSubcategoriesByCategory } from '@/lib/data';
import { getCategoryBySlug } from '@/app/actions/categories';
import { Suspense } from 'react';
import Link from 'next/link';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';

interface CategoryPageProps {
    params: Promise<{ categorySlug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}


export async function generateMetadata({ params, searchParams }: {
    params: Promise<{ categorySlug: string }>,
    searchParams: Promise<{ subcategory?: string }>
}): Promise<Metadata> {
    const { categorySlug } = await params;
    const { subcategory } = await searchParams;
    const category = await getCategoryBySlug(categorySlug);

    if (!category) return { title: 'Catégorie non trouvée' };

    const baseTitle = subcategory
        ? `${subcategory} - Meilleurs établissements ${category.name}`
        : `Top ${category.name} au Maroc`;

    return {
        title: `${baseTitle} | Avis et recommandations`,
        description: `Trouvez les meilleures entreprises ${subcategory ? `de type ${subcategory}` : `dans la catégorie ${category.name}`} partout au Maroc. Consultez les notes et avis des clients.`,
        alternates: {
            canonical: `/categorie/${categorySlug}${subcategory ? `?subcategory=${encodeURIComponent(subcategory)}` : ''}`,
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
    const subcategory = typeof resolvedSearchParams.subcategory === 'string' ? resolvedSearchParams.subcategory : undefined;

    const [result, categories, allBenefits, initialSubcategories] = await Promise.all([
        getFilteredBusinesses({
            category: categoryData.name,
            subcategory,
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
            <div className="mb-12 space-y-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                        <Link href="/categories" className="hover:text-primary transition-colors">Catégories</Link>
                        <span>/</span>
                        <span className={subcategory ? "text-slate-500" : "text-primary font-medium"}>{categoryData.name}</span>
                        {subcategory && (
                            <>
                                <span>/</span>
                                <span className="text-primary font-medium">{subcategory}</span>
                            </>
                        )}
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
                        {subcategory ? (
                            <>
                                <span className="text-primary">{subcategory}</span> en {categoryData.name}
                            </>
                        ) : (
                            <>
                                {categoryData.name} <span className="text-primary">au Maroc</span>
                            </>
                        )}
                    </h1>
                    <p className="text-slate-600 text-lg max-w-3xl leading-relaxed">
                        Découvrez les {result.totalCount} meilleurs établissements {subcategory ? `de type ${subcategory}` : `en ${categoryData.name}`}.
                        Comparez les services, lisez les avis certifiés et trouvez l'adresse idéale au Maroc.
                    </p>
                </div>

                {/* Subcategory Discovery Chips */}
                {initialSubcategories.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Filtrer par spécialité</p>
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href={`/categorie/${categorySlug}`}
                                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${!subcategory
                                    ? "bg-primary text-white border-primary shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-primary hover:text-primary"
                                    }`}
                            >
                                Tout voir
                            </Link>
                            {initialSubcategories.map((sub: string) => (
                                <Link
                                    key={sub}
                                    href={`/categorie/${categorySlug}?subcategory=${encodeURIComponent(sub)}`}
                                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${subcategory === sub
                                        ? "bg-primary text-white border-primary shadow-sm"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-primary hover:text-primary"
                                        }`}
                                >
                                    {sub}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="mb-8">
                <InternalAdsSlot placement="directory_top_banner" />
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
            <div className="mt-10">
                <InternalAdsSlot placement="directory_inline" />
            </div>
        </div>
    );
}
