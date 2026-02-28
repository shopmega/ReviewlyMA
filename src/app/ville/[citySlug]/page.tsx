
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BusinessList } from '@/components/shared/BusinessList';
import { getFilteredBusinesses, getAllCategories, getAllBenefits } from '@/lib/data';
import { getCityFromSlug, slugify } from '@/lib/utils';
import { Suspense } from 'react';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';

interface CityPageProps {
    params: Promise<{ citySlug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: { params: Promise<{ citySlug: string }> }): Promise<Metadata> {
    const { citySlug } = await params;
    const city = getCityFromSlug(citySlug);

    if (!city) return { title: 'Ville non trouvée' };

    return {
        title: `Meilleures entreprises à ${city} | Avis et classements`,
        description: `Découvrez les entreprises les mieux notées à ${city}. Consultez les avis authentiques et trouvez les meilleurs services locaux.`,
        alternates: {
            canonical: `/ville/${citySlug}`,
        },
    };
}

export default async function CityPage({ params, searchParams }: CityPageProps) {
    const { citySlug } = await params;
    const city = getCityFromSlug(citySlug);

    if (!city) {
        notFound();
    }

    const resolvedSearchParams = await searchParams;
    const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1;
    const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort as any : undefined;

    const [result, categories, allBenefits] = await Promise.all([
        getFilteredBusinesses({
            city,
            page,
            sort,
            limit: 9,
            minimal: true
        }),
        getAllCategories(),
        getAllBenefits()
    ]);

    return (
        <div className="container mx-auto px-4 md:px-6 py-12">
            <div className="mb-12 space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
                        Entreprises à <span className="text-primary">{city}</span>
                    </h1>
                    <p className="text-slate-600 text-lg max-w-3xl">
                        Explorez les {result.totalCount} établissements référencés à {city}. Les meilleurs services et commerces de proximité notés par la communauté.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                    <div className="bg-primary/5 border border-primary/10 rounded-full px-4 py-1 text-sm font-medium text-primary">
                        {city}
                    </div>
                </div>
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
                    allBenefits={allBenefits}
                />
            </Suspense>
            <div className="mt-10">
                <InternalAdsSlot placement="directory_inline" />
            </div>
        </div>
    );
}
