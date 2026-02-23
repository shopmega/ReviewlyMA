import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OfferCreateForm } from './OfferCreateForm';
import { getReferralEligibility } from '@/app/actions/referrals';
import { getCachedBusinesses } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export default async function NewParrainagePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect('/login?next=/parrainages/new');
  }

  const eligibility = await getReferralEligibility();
  const eligible = !!eligibility?.is_eligible;
  const businessesResult = eligible ? await getCachedBusinesses({ limit: 200, minimal: true }) : { businesses: [] };
  const businessOptions = (businessesResult.businesses || [])
    .filter((b: any) => b?.id && b?.name)
    .map((b: any) => ({ id: String(b.id), name: String(b.name), city: b.city ? String(b.city) : '' }));

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold font-headline">Publier une offre de parrainage</h1>
        <p className="text-muted-foreground">
          Partagez une opportunite de referral dans votre entreprise pour aider d&apos;autres candidats.
        </p>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Conditions de publication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant={eligibility?.is_email_verified ? 'default' : 'secondary'}>
              {eligibility?.is_email_verified ? 'Email verifie' : 'Email non verifie'}
            </Badge>
            <Badge variant={eligibility?.has_published_review ? 'default' : 'secondary'}>
              {eligibility?.has_published_review ? 'Avis publie: OK' : 'Avis publie: requis'}
            </Badge>
            <Badge variant={eligibility?.has_published_salary ? 'default' : 'secondary'}>
              {eligibility?.has_published_salary ? 'Salaire publie: OK' : 'Salaire publie: requis'}
            </Badge>
          </div>
          {!eligible && (
            <div className="rounded-xl border border-amber-300/50 bg-amber-50/60 p-4 text-sm">
              Vous devez verifier votre email et publier au moins un avis ou un salaire avant de publier une offre.
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline"><Link href="/review">Publier un avis</Link></Button>
                <Button asChild size="sm" variant="outline"><Link href="/salaires/partager">Partager un salaire</Link></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {eligible && <OfferCreateForm businessOptions={businessOptions} />}
    </div>
  );
}
