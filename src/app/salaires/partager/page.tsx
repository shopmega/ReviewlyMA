import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchAutocomplete } from '@/components/shared/SearchAutocomplete';
import { getCachedBusinesses } from '@/lib/cache';
import { getSiteSettings } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SalaryQuickSubmitCard } from '@/components/salaries/SalaryQuickSubmitCard';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';
import { getServerTranslator } from '@/lib/i18n/server';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return {
    title: t('salarySharePage.metadata.title', 'Share my salary'),
    description: t(
      'salarySharePage.metadata.description',
      'Choose a company and share your salary anonymously.'
    ),
  };
}

export default async function ShareSalaryPage() {
  const { t } = await getServerTranslator();
  const [businessesResult, settings] = await Promise.all([
    getCachedBusinesses({ limit: 24, minimal: true }),
    getSiteSettings(),
  ]);
  const businesses = businessesResult.businesses || [];
  const latestBusinesses = [...businesses]
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <section className="rounded-3xl border bg-gradient-to-br from-sky-50 via-background to-emerald-50 p-6 md:p-10">
        <div className="max-w-3xl space-y-4">
          <Badge variant="outline" className="uppercase tracking-widest text-[10px]">
            {t('salarySharePage.hero.badge', 'Anonymous submission')}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            {t('salarySharePage.hero.title', 'Share my salary')}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            {t(
              'salarySharePage.hero.description',
              'Search your company first, then publish your salary anonymously on its page.'
            )}
          </p>
          <div className="rounded-2xl border bg-background/80 p-3 md:p-4">
            <SearchAutocomplete
              placeholder={t('salarySharePage.search.placeholder', 'Search a company...')}
              className="w-full"
              inputClassName="h-12 text-base"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {t('salarySharePage.search.tipPrefix', 'Tip: open the profile, then go to the')}{' '}
              <strong>{t('salarySharePage.search.tipStrong', 'Salaries')}</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild>
              <Link href="/businesses">{t('salarySharePage.hero.viewBusinesses', 'View all companies')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/suggest">{t('salarySharePage.hero.missingBusiness', "I can't find my company")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <InternalAdsSlot placement="salary_share_top_banner" />

      <section className="grid grid-cols-1 gap-4">
        <SalaryQuickSubmitCard
          roles={settings.salary_roles || []}
          departments={settings.salary_departments || []}
          intervals={settings.salary_intervals || []}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">{t('salarySharePage.latest.title', 'Recent companies')}</h2>
        <p className="text-sm text-muted-foreground">
          {t(
            'salarySharePage.latest.description',
            'You can start with a recent company page, then click the salaries section.'
          )}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {latestBusinesses.map((business) => (
            <Card key={business.id} className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{business.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {business.city || business.location || t('salarySharePage.latest.defaultCountry', 'Morocco')}
                </p>
                <Button asChild size="sm" className="w-full">
                  <Link href={`/businesses/${business.id}?shareSalary=1#salaries`}>
                    {t('salarySharePage.latest.openSalaryCard', 'Open salary section')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
