import { getFilteredBusinesses } from '@/lib/data';
import { BusinessCard } from '@/components/shared/BusinessCard';
import { getServerTranslator } from '@/lib/i18n/server';

interface SimilarBusinessesServerProps {
  category: string;
  subcategory?: string;
  city: string;
  currentBusinessId: string;
}

export async function SimilarBusinessesServer({ category, subcategory, city, currentBusinessId }: SimilarBusinessesServerProps) {
  const { tf } = await getServerTranslator();

  let result = await getFilteredBusinesses({
    category,
    subcategory,
    city,
    limit: 8,
  });

  let similar = result.businesses.filter((b) => b.id !== currentBusinessId);

  if (subcategory && similar.length < 3) {
    const { businesses: categoryResults } = await getFilteredBusinesses({
      category,
      city,
      limit: 8,
    });

    categoryResults.forEach((b) => {
      if (b.id !== currentBusinessId && !similar.find((s) => s.id === b.id)) {
        similar.push(b);
      }
    });
  }

  similar = similar.slice(0, 3);

  if (similar.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold font-headline mb-6 flex items-center gap-2">
        <span className="w-1 h-6 bg-primary rounded-full"></span>
        {tf('business.similar.title', 'Etablissements similaires a {city}', { city })}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {similar.map((business) => (
          <div key={business.id} className="h-[380px]">
            <BusinessCard business={business} />
          </div>
        ))}
      </div>
    </section>
  );
}
