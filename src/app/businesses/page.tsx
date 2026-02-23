import { BusinessList } from '@/components/shared/BusinessList';
import { getFilteredBusinesses, getAllCategories, getAllBenefits } from '@/lib/data';
import { Suspense } from 'react';

import { Metadata } from 'next';
import { slugify } from '@/lib/utils';
import { getCategoryByName } from '@/app/actions/categories';
import { getServerTranslator } from '@/lib/i18n/server';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const city = typeof resolvedParams.city === 'string' ? resolvedParams.city : undefined;
  const category = typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined;

  let canonical = '/businesses';

  if (city && !category) {
    const citySlug = slugify(city);
    canonical = `/ville/${citySlug}`;
  } else if (!city && category) {
    const categoryData = await getCategoryByName(category);
    if (categoryData) {
      canonical = `/categorie/${categoryData.slug}`;
    }
  } else if (city && category) {
    const citySlug = slugify(city);
    const categoryData = await getCategoryByName(category);
    if (categoryData) {
      canonical = `/ville/${citySlug}/${categoryData.slug}`;
    }
  }

  return {
    alternates: {
      canonical,
    },
  };
}

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { t } = await getServerTranslator();
  const resolvedSearchParams = await searchParams;
  const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1;
  const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : undefined;
  const category = typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined;
  const subcategory = typeof resolvedSearchParams.subcategory === 'string' ? resolvedSearchParams.subcategory : undefined;
  const type = typeof resolvedSearchParams.type === 'string' ? resolvedSearchParams.type : undefined;
  const city = typeof resolvedSearchParams.city === 'string' ? resolvedSearchParams.city : undefined;
  const quartier = typeof resolvedSearchParams.quartier === 'string' ? resolvedSearchParams.quartier : undefined;
  const rating = typeof resolvedSearchParams.rating === 'string' ? parseFloat(resolvedSearchParams.rating) : undefined;
  const companySize = typeof resolvedSearchParams.companySize === 'string' ? resolvedSearchParams.companySize : undefined;
  const sort = typeof resolvedSearchParams.sort === 'string' ? (resolvedSearchParams.sort as any) : undefined;
  const amenitiesParam = typeof resolvedSearchParams.amenities === 'string' ? resolvedSearchParams.amenities : undefined;
  const benefitsParam = typeof resolvedSearchParams.benefits === 'string' ? resolvedSearchParams.benefits : undefined;
  const amenities = amenitiesParam ? amenitiesParam.split(',') : benefitsParam ? benefitsParam.split(',') : undefined;
  const tag = typeof resolvedSearchParams.tag === 'string' ? resolvedSearchParams.tag : undefined;
  const featured = resolvedSearchParams.featured === 'true';

  const [result, categories, allBenefits, initialSubcategories] = await Promise.all([
    getFilteredBusinesses({
      page,
      search,
      category,
      subcategory,
      type,
      city,
      quartier,
      rating,
      companySize,
      sort,
      amenities,
      tag,
      featured,
      limit: 9,
      minimal: true,
    }),
    getAllCategories(),
    getAllBenefits(),
    category ? import('@/lib/data').then((m) => m.getSubcategoriesByCategory(category)) : Promise.resolve([]),
  ]);

  if (search) {
    const { logSearch } = await import('@/app/actions/search');
    logSearch(search, city, result.totalCount);
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="mb-8 space-y-4">
        <h1 className="text-4xl font-bold font-headline">
          {featured ? t('listingPage.featuredTitle', 'Etablissements a la une') : t('listingPage.allTitle', 'Tous les etablissements')}
        </h1>
        <p className="text-slate-600 text-lg">
          {featured
            ? t('listingPage.featuredSubtitle', "Decouvrez notre selection d'entreprises premium et recommandees.")
            : t('listingPage.allSubtitle', "Parcourez et filtrez des milliers d'etablissements pour trouver celui qui vous convient.")}
        </p>
      </div>
      <Suspense fallback={<div>{t('common.loading', 'Chargement...')}</div>}>
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
