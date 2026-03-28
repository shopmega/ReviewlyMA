import Link from 'next/link';
import { verifyAdminSession } from '@/lib/supabase/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AdminReferralOffersPage() {
  await verifyAdminSession();

  return (
    <div className="space-y-6">
      <div>
        <Badge className="bg-amber-500/10 text-amber-700 border-none font-bold px-3 py-1 uppercase tracking-wider text-[10px]">
          Module en retrait
        </Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Parrainages</h1>
        <p className="mt-1 text-muted-foreground">
          Le module de parrainages est en cours de decommission. Les nouvelles operations sont bloquees et cette surface admin n&apos;est plus un poste de travail actif.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Etat de retrait</CardTitle>
          <CardDescription>Les workflows referral ne doivent plus etre utilises pour de nouvelles actions produit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Creation d&apos;offres, demandes, interactions et signalements: desactivee.</p>
          <p>Surface admin: conservee uniquement comme point d&apos;atterrissage de retrait, pas comme console operationnelle.</p>
          <p>Travail restant: decider l&apos;archivage, la retention et la suppression finale des donnees historiques referral.</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild variant="outline">
              <Link href="/admin/moderation">Retour a la moderation</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/audit">Voir le journal d&apos;audit</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
