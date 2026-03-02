import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DemandListingCreateForm } from './DemandListingCreateForm';
import { getServerTranslator } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return {
    title: t('referralDemandCreatePage.metaTitle', 'Publish a referral request | Reviewly MA'),
    description: t(
      'referralDemandCreatePage.metaDescription',
      'Publish your referral request and get contacted by employees who can refer you.'
    ),
    alternates: { canonical: '/parrainages/demandes/new' },
  };
}

export default async function NewDemandListingPage() {
  const { t } = await getServerTranslator();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect('/login?next=/parrainages/demandes/new');
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">{t('referralDemandCreatePage.title', 'Publish a request')}</h1>
        <p className="text-muted-foreground max-w-2xl">
          {t(
            'referralDemandCreatePage.subtitle',
            'This listing is public. Do not include direct email or phone number in the text.'
          )}
        </p>
      </div>
      <DemandListingCreateForm />
    </div>
  );
}
