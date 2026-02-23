import { getBusinessById } from '@/lib/data';
import { notFound } from 'next/navigation';
import { ReviewForm } from '@/components/forms/ReviewForm';
import { getServerTranslator } from '@/lib/i18n/server';

type ReviewPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ReviewPage({ params }: ReviewPageProps) {
  const resolvedParams = await params;
  const business = await getBusinessById(resolvedParams.slug);
  const { t, tf } = await getServerTranslator();

  if (!business) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold font-headline mb-2">{tf('reviewPage.title', 'Ecrire un avis pour {name}', { name: business.name })}</h1>
        <p className="text-muted-foreground mb-8">{t('reviewPage.subtitle', 'Votre avis est anonyme et aidera des milliers de personnes a faire des choix eclaires.')}</p>
        <ReviewForm businessId={business.id} businessName={business.name} />
      </div>
    </div>
  );
}
