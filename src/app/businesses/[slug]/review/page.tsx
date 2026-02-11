import { getBusinessById } from '@/lib/data';
import { notFound } from 'next/navigation';
import { ReviewForm } from '@/components/forms/ReviewForm';
import type { Business } from '@/lib/types';

type ReviewPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ReviewPage({ params }: ReviewPageProps) {
  const resolvedParams = await params;
  const business = await getBusinessById(resolvedParams.slug);

  if (!business) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold font-headline mb-2">Écrire un avis pour {business.name}</h1>
        <p className="text-muted-foreground mb-8">Votre avis est anonyme et aidera des milliers de personnes à faire des choix éclairés.</p>
        <ReviewForm businessId={business.id} businessName={business.name} />
      </div>
    </div>
  );
}
