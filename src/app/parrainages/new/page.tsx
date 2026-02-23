import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OfferCreateForm } from './OfferCreateForm';
import { getReferralEligibility } from '@/app/actions/referrals';
import { getCachedBusinesses } from '@/lib/cache';
import { CheckCircle2 } from 'lucide-react';
import { getServerTranslator } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function NewParrainagePage() {
  const { t } = await getServerTranslator();
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
      <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-sky-50 via-background to-emerald-50 p-6 md:p-8">
        <div className="space-y-3">
          <Badge variant="outline" className="w-fit">{t('referrals.new.badge', 'Publication')}</Badge>
          <h1 className="text-3xl md:text-4xl font-bold font-headline">{t('referrals.new.title', 'Publier une offre de parrainage')}</h1>
          <p className="text-muted-foreground max-w-3xl">
            {t('referrals.new.subtitle', "Reliez votre offre a une fiche entreprise, decrivez le poste et recevez des demandes de candidats depuis la page de l'offre.")}
          </p>
        </div>
      </section>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">{t('referrals.new.conditionsTitle', 'Conditions de publication')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant={eligibility?.is_email_verified ? 'default' : 'secondary'}>
              {eligibility?.is_email_verified ? t('referrals.new.emailVerified', 'Email verifie') : t('referrals.new.emailNotVerified', 'Email non verifie')}
            </Badge>
            <Badge variant={eligibility?.has_published_review ? 'default' : 'secondary'}>
              {eligibility?.has_published_review ? t('referrals.new.reviewOk', 'Avis publie: OK') : t('referrals.new.reviewRequired', 'Avis publie: requis')}
            </Badge>
            <Badge variant={eligibility?.has_published_salary ? 'default' : 'secondary'}>
              {eligibility?.has_published_salary ? t('referrals.new.salaryOk', 'Salaire publie: OK') : t('referrals.new.salaryRequired', 'Salaire publie: requis')}
            </Badge>
          </div>
          {!eligible && (
            <div className="rounded-xl border border-amber-300/50 bg-amber-50/60 p-4 text-sm">
              {t('referrals.new.eligibilityHint', 'Vous devez verifier votre email et publier au moins un avis ou un salaire avant de publier une offre.')}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline"><Link href="/review">{t('referrals.new.publishReview', 'Publier un avis')}</Link></Button>
                <Button asChild size="sm" variant="outline"><Link href="/salaires/partager">{t('referrals.new.shareSalary', 'Partager un salaire')}</Link></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {eligible && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <OfferCreateForm businessOptions={businessOptions} />
          </div>
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="text-base">{t('referrals.new.bestPractices', 'Bonnes pratiques')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="inline-flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                {t('referrals.new.tip1', 'Mentionnez clairement le role, les prerequis et le mode de travail.')}
              </p>
              <p className="inline-flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                {t('referrals.new.tip2', "Fixez une date d'expiration pour eviter les candidatures hors delai.")}
              </p>
              <p className="inline-flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                {t('referrals.new.tip3', 'Les candidats vous envoient un message introductif et, si souhaite, un lien CV.')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
