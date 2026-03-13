import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getCategoryBySlug } from '@/app/actions/categories';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { BusinessList } from '@/components/shared/BusinessList';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';
import {
  getAllBenefits,
  getAllCategories,
  getFilteredBusinesses,
  getSubcategoriesByCategory,
} from '@/lib/data';

interface CategoryPageProps {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ subcategory?: string }>;
}): Promise<Metadata> {
  const { categorySlug } = await params;
  const { subcategory } = await searchParams;
  const category = await getCategoryBySlug(categorySlug);

  if (!category) return { title: 'Categorie non trouvee' };

  const baseTitle = subcategory
    ? `${subcategory} - Meilleurs etablissements ${category.name}`
    : `Top ${category.name} au Maroc`;

  return {
    title: `${baseTitle} | Avis et recommandations`,
    description: `Trouvez les meilleures entreprises ${subcategory ? `de type ${subcategory}` : `dans la categorie ${category.name}`} partout au Maroc. Consultez les notes et avis des clients.`,
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
  const sort = typeof resolvedSearchParams.sort === 'string' ? (resolvedSearchParams.sort as any) : undefined;
  const subcategory =
    typeof resolvedSearchParams.subcategory === 'string' ? resolvedSearchParams.subcategory : undefined;

  const [result, categories, allBenefits, initialSubcategories] = await Promise.all([
    getFilteredBusinesses({
      category: categoryData.name,
      subcategory,
      page,
      sort,
      limit: 9,
      minimal: true,
    }),
    getAllCategories(),
    getAllBenefits(),
    getSubcategoriesByCategory(categoryData.name),
  ]);

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <div className="mb-12 space-y-8">
        <div className="space-y-4">
          <Breadcrumb
            items={[
              { label: 'Categories', href: '/categories' },
              { label: categoryData.name, href: `/categorie/${categorySlug}` },
              ...(subcategory
                ? [
                    {
                      label: subcategory,
                      href: `/categorie/${categorySlug}?subcategory=${encodeURIComponent(subcategory)}`,
                    },
                  ]
                : []),
            ]}
          />

          <h1 className="font-headline text-4xl font-bold tracking-tight md:text-5xl">
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
          <p className="max-w-3xl text-lg leading-relaxed text-slate-600">
            Decouvrez les {result.totalCount} meilleurs etablissements{' '}
            {subcategory ? `de type ${subcategory}` : `en ${categoryData.name}`}. Comparez les
            services, lisez les avis certifies et trouvez l'adresse ideale au Maroc.
          </p>
        </div>

        {initialSubcategories.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Filtrer par specialite
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/categorie/${categorySlug}`}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${!subcategory
                  ? 'border-primary bg-primary text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary'
                  }`}
              >
                Tout voir
              </a>
              {initialSubcategories.map((sub: string) => (
                <a
                  key={sub}
                  href={`/categorie/${categorySlug}?subcategory=${encodeURIComponent(sub)}`}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${subcategory === sub
                    ? 'border-primary bg-primary text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary'
                    }`}
                >
                  {sub}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mb-8">
        <InternalAdsSlot placement="listing_top" />
      </div>

      <Suspense fallback={<div className="flex justify-center py-20">Chargement des resultats...</div>}>
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
        <InternalAdsSlot placement="listing_inline" />
      </div>
    </div>
  );
}
