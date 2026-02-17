import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Crown, Percent, TrendingUp, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { getSalaryCompanyMetricsByBusiness, getSalaryStatsByBusiness } from '@/lib/data/salaries';

function formatCurrency(value: number | null | undefined, currency = 'MAD') {
  if (value === null || value === undefined) return 'Non defini';

  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Non defini';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export default async function SalaryBenchmarkPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const requestedBusinessId = typeof searchParams.id === 'string' ? searchParams.id : undefined;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login?next=' + encodeURIComponent('/dashboard/salary-benchmark'));
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, tier, business_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profileData) {
    redirect('/dashboard/premium');
  }

  const [claimsResult, assignmentsResult] = await Promise.all([
    supabase.from('business_claims').select('business_id').eq('user_id', user.id).eq('status', 'approved'),
    supabase.from('user_businesses').select('business_id').eq('user_id', user.id),
  ]);

  const allBusinessIds = new Set<string>();
  if (profileData.business_id) allBusinessIds.add(profileData.business_id);
  claimsResult.data?.forEach((item) => allBusinessIds.add(item.business_id));
  assignmentsResult.data?.forEach((item) => allBusinessIds.add(item.business_id));

  let activeBusinessId = requestedBusinessId;
  if (!activeBusinessId || !allBusinessIds.has(activeBusinessId)) {
    activeBusinessId = profileData.business_id || Array.from(allBusinessIds)[0];
  }

  if (!activeBusinessId) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Aucune entreprise liee</CardTitle>
          <CardDescription>
            Vous devez d abord revendiquer une entreprise pour acceder aux benchmarks salariaux.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/pour-les-pros">
              Revendiquer une entreprise
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { data: businessData } = await supabase
    .from('businesses')
    .select('id, name, tier')
    .eq('id', activeBusinessId)
    .maybeSingle();

  if (!businessData) {
    redirect('/dashboard/premium');
  }

  const profileTier = profileData.tier ?? 'standard';
  const businessTier = businessData.tier ?? 'standard';
  const hasGoldAccess = profileTier === 'gold' || businessTier === 'gold';

  if (!hasGoldAccess) {
    redirect('/dashboard/premium');
  }

  const [companyMetrics, salaryStats] = await Promise.all([
    getSalaryCompanyMetricsByBusiness(activeBusinessId),
    getSalaryStatsByBusiness(activeBusinessId),
  ]);

  const salaryCount = companyMetrics?.submission_count ?? salaryStats.count;
  const medianSalary = companyMetrics?.median_monthly_salary ?? salaryStats.medianMonthly;
  const minSalary = companyMetrics?.min_monthly_salary ?? salaryStats.minMonthly;
  const maxSalary = companyMetrics?.max_monthly_salary ?? salaryStats.maxMonthly;
  const currency = salaryStats.currency || 'MAD';

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge className="bg-amber-500 text-white border-none">
              <Crown className="mr-1 h-3 w-3" />
              GOLD
            </Badge>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Feature reservee au plan Gold
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Benchmark salaires</h1>
          <p className="text-muted-foreground">
            Comparez la competitivite salariale de <span className="font-semibold text-foreground">{businessData.name}</span>.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/businesses/${businessData.id}`}>
            Voir la page publique
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Salaire median mensuel</CardDescription>
            <CardTitle>{formatCurrency(medianSalary, currency)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Plage salariale</CardDescription>
            <CardTitle>
              {formatCurrency(minSalary, currency)} - {formatCurrency(maxSalary, currency)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ecart vs moyenne ville</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              {formatPercent(companyMetrics?.pct_above_city_avg)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ecart vs moyenne secteur</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {formatPercent(companyMetrics?.pct_above_sector_avg)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Wallet className="h-5 w-5 text-primary" />
              Vue benchmark
            </CardTitle>
            <CardDescription>Indicateurs globaux pour votre entreprise.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Soumissions publiees</span>
              <span className="font-semibold">{salaryCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Poste le plus declare</span>
              <span className="font-semibold">{companyMetrics?.most_reported_job_title ?? 'Non defini'}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Ville de comparaison</span>
              <span className="font-semibold">{companyMetrics?.city ?? 'Non defini'}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Secteur de comparaison</span>
              <span className="font-semibold">{companyMetrics?.sector_slug ?? 'Non defini'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Top roles reportes</CardTitle>
            <CardDescription>
              Medianes mensuelles basees sur les salaires publies.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {salaryStats.roleBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Pas encore assez de donnees. Encouragez vos equipes a partager leur salaire.
              </p>
            ) : (
              salaryStats.roleBreakdown.map((role) => (
                <div key={role.jobTitle} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{role.jobTitle}</p>
                    <p className="text-xs text-muted-foreground">{role.count} soumissions</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(role.medianMonthly, currency)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
