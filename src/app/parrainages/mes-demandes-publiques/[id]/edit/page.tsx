import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EditDemandListingForm } from './EditDemandListingForm';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export default async function EditPublicDemandListingPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect(`/login?next=/parrainages/mes-demandes-publiques/${id}/edit`);
  }

  const { data } = await supabase
    .from('job_referral_demand_listings')
    .select('id, title, target_role, city, contract_type, work_mode, seniority, summary, details, expires_at')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (!data) notFound();

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">Modifier ma demande publique</h1>
        <p className="text-sm text-muted-foreground">Mettez a jour votre demande tout en gardant un contenu conforme.</p>
      </div>
      <EditDemandListingForm item={data} />
    </div>
  );
}
