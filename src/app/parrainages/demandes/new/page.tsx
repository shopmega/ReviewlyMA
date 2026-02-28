import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DemandListingCreateForm } from './DemandListingCreateForm';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Publier une demande de parrainage | Reviewly MA',
    description: 'Publiez votre demande de parrainage et soyez contacte par des employes qui peuvent vous recommander.',
    alternates: { canonical: '/parrainages/demandes/new' },
  };
}

export default async function NewDemandListingPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect('/login?next=/parrainages/demandes/new');
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">Publier une demande</h1>
        <p className="text-muted-foreground max-w-2xl">
          Cette annonce est publique. N&apos;incluez pas d&apos;email ou de numero de telephone direct dans le texte.
        </p>
      </div>
      <DemandListingCreateForm />
    </div>
  );
}
