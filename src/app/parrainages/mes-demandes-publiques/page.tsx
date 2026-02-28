import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { retractReferralDemandListingForm, updateMyReferralDemandListingStatusForm } from '@/app/actions/referrals';

export const dynamic = 'force-dynamic';

type DemandListing = {
  id: string;
  title: string;
  target_role: string;
  city: string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  paused: 'En pause',
  closed: 'Fermee',
};

export default async function MyPublicDemandListingsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect('/login?next=/parrainages/mes-demandes-publiques');
  }

  const { data } = await supabase
    .from('job_referral_demand_listings')
    .select('id, title, target_role, city, status, created_at, expires_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  const items = (data || []) as DemandListing[];

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold font-headline">Mes demandes publiques</h1>
          <p className="text-sm text-muted-foreground">Gerez vos annonces de demande sur le demand board.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/parrainages/demandes">Voir le board</Link>
          </Button>
          <Button asChild>
            <Link href="/parrainages/demandes/new">Publier une demande</Link>
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucune demande publique publiee pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="rounded-2xl border-border/60">
              <CardHeader className="space-y-3 border-b border-border/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <Badge variant="outline">{item.target_role}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{STATUS_LABELS[item.status] || item.status}</Badge>
                  {item.city ? <span className="text-xs text-muted-foreground">{item.city}</span> : null}
                  <span className="text-xs text-muted-foreground">
                    Publiee le {new Date(item.created_at).toLocaleDateString('fr-MA')}
                  </span>
                  {item.expires_at ? (
                    <span className="text-xs text-muted-foreground">
                      Expire le {new Date(item.expires_at).toLocaleDateString('fr-MA')}
                    </span>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="flex flex-wrap gap-2">
                  {['active', 'paused', 'closed'].map((status) => (
                    <form key={status} action={updateMyReferralDemandListingStatusForm}>
                      <input type="hidden" name="demandListingId" value={item.id} />
                      <input type="hidden" name="status" value={status} />
                      <Button type="submit" size="sm" variant={item.status === status ? 'default' : 'outline'}>
                        {STATUS_LABELS[status] || status}
                      </Button>
                    </form>
                  ))}
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/parrainages/demandes/${item.id}`}>Voir la page publique</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/parrainages/mes-demandes-publiques/${item.id}/edit`}>Editer</Link>
                  </Button>
                  <form action={retractReferralDemandListingForm}>
                    <input type="hidden" name="demandListingId" value={item.id} />
                    <Button type="submit" size="sm" variant="destructive">Supprimer</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
