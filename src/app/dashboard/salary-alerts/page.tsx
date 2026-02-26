import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell, Building2, Briefcase, Layers } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SalaryAlertToggleButton } from '@/components/salaries/SalaryAlertToggleButton';

type SalaryAlertRow = {
  id: number;
  scope: 'company' | 'role_city' | 'sector_city';
  business_id: string | null;
  role_slug: string | null;
  sector_slug: string | null;
  city_slug: string | null;
  created_at: string;
};

export default async function SalaryAlertsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=' + encodeURIComponent('/dashboard/salary-alerts'));
  }

  const { data: rows, error } = await supabase
    .from('salary_alert_subscriptions')
    .select('id, scope, business_id, role_slug, sector_slug, city_slug, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Mes alertes salaires</h1>
        <p className="text-sm text-destructive">Impossible de charger vos alertes pour le moment.</p>
      </div>
    );
  }

  const subscriptions = (rows || []) as SalaryAlertRow[];
  const businessIds = Array.from(new Set(subscriptions.map((s) => s.business_id).filter(Boolean) as string[]));
  const businessNameMap = new Map<string, string>();

  if (businessIds.length > 0) {
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, name')
      .in('id', businessIds);

    (businesses || []).forEach((business: any) => {
      businessNameMap.set(business.id, business.name);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Mes alertes salaires</h1>
        <p className="text-sm text-muted-foreground">
          Gerer les alertes role/ville, secteur/ville et entreprises suivies.
        </p>
      </div>

      {subscriptions.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-8 text-center space-y-2">
            <p className="font-medium">Aucune alerte active</p>
            <p className="text-sm text-muted-foreground">
              Activez une alerte depuis une page salaire pour recevoir les mises a jour.
            </p>
            <div className="pt-2">
              <Link href="/salaires" className="text-sm font-semibold text-primary hover:underline">
                Explorer les salaires
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {subscriptions.map((sub) => {
            const createdAt = new Date(sub.created_at).toLocaleDateString('fr-MA');
            if (sub.scope === 'company' && sub.business_id) {
              const businessName = businessNameMap.get(sub.business_id) || sub.business_id;
              const pagePath = `/businesses/${sub.business_id}?tab=salaries#salaries`;
              return (
                <Card key={sub.id} className="rounded-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      {businessName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <Badge variant="outline">Entreprise</Badge>
                      <p className="text-xs text-muted-foreground">Activee le {createdAt}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={pagePath} className="text-sm text-primary hover:underline">
                        Ouvrir
                      </Link>
                      <SalaryAlertToggleButton
                        scope="company"
                        target={{ businessId: sub.business_id }}
                        pathToRevalidate="/dashboard/salary-alerts"
                        initialIsSubscribed
                        className="h-9"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            }

            if (sub.scope === 'role_city' && sub.role_slug && sub.city_slug) {
              const pagePath = `/salaires/role/${sub.role_slug}/${sub.city_slug}`;
              return (
                <Card key={sub.id} className="rounded-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      {sub.role_slug} - {sub.city_slug}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <Badge variant="outline">Role + ville</Badge>
                      <p className="text-xs text-muted-foreground">Activee le {createdAt}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={pagePath} className="text-sm text-primary hover:underline">
                        Ouvrir
                      </Link>
                      <SalaryAlertToggleButton
                        scope="role_city"
                        target={{ roleSlug: sub.role_slug, citySlug: sub.city_slug }}
                        pathToRevalidate="/dashboard/salary-alerts"
                        initialIsSubscribed
                        className="h-9"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            }

            if (sub.scope === 'sector_city' && sub.sector_slug && sub.city_slug) {
              const pagePath = `/salaires/secteur/${sub.sector_slug}/${sub.city_slug}`;
              return (
                <Card key={sub.id} className="rounded-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      {sub.sector_slug} - {sub.city_slug}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <Badge variant="outline">Secteur + ville</Badge>
                      <p className="text-xs text-muted-foreground">Activee le {createdAt}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={pagePath} className="text-sm text-primary hover:underline">
                        Ouvrir
                      </Link>
                      <SalaryAlertToggleButton
                        scope="sector_city"
                        target={{ sectorSlug: sub.sector_slug, citySlug: sub.city_slug }}
                        pathToRevalidate="/dashboard/salary-alerts"
                        initialIsSubscribed
                        className="h-9"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return null;
          })}
        </div>
      )}

      <Card className="rounded-2xl border border-primary/20">
        <CardContent className="py-4 text-xs text-muted-foreground flex items-start gap-2">
          <Bell className="h-4 w-4 mt-0.5 text-primary" />
          <span>
            Les notifications in-app sont envoyees lors des nouvelles publications salaires correspondant a vos alertes.
            Le digest hebdomadaire est disponible via cron securise.
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

