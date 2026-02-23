'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { submitSalary } from '@/app/actions/salary';
import type { SalaryEntry, SalaryStats } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Lock, LogIn, Sparkles } from 'lucide-react';

type SalarySectionProps = {
  businessId: string;
  businessCity?: string;
  stats: SalaryStats;
  salaries: SalaryEntry[];
  roles?: string[];
  departments?: string[];
  intervals?: Array<{ id: string; label: string; min: number; max: number }>;
};

function formatMoneyMAD(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '-';
  return `${Math.round(value).toLocaleString('fr-MA')} MAD`;
}

export function SalarySection({
  businessId,
  businessCity,
  stats,
  salaries,
  roles = [],
  departments = [],
  intervals = [],
}: SalarySectionProps) {
  const [state, formAction] = useActionState(submitSalary, { status: 'idle', message: '' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Succes', description: state.message });
      formRef.current?.reset();
      setIsFormOpen(false);
      router.refresh();
      return;
    }
    if (state.status === 'error' && state.message) {
      toast({ title: 'Erreur', description: state.message, variant: 'destructive' });
    }
  }, [state.status, state.message, toast, router]);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const syncAuthState = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error || !data.user) {
        setAuthStatus('unauthenticated');
        return;
      }
      setAuthStatus('authenticated');
    };

    syncAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthStatus(session?.user ? 'authenticated' : 'unauthenticated');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const wantsShareFromQuery = searchParams.get('shareSalary') === '1';
    const wantsShareFromHash = typeof window !== 'undefined' && window.location.hash === '#salaries';
    if (wantsShareFromQuery || wantsShareFromHash) {
      setIsFormOpen(true);
    }
  }, [authStatus, searchParams]);

  const loginHref = `/login?next=${encodeURIComponent(pathname || `/businesses/${businessId}`)}`;

  return (
    <section id="salaries" className="space-y-6">
      <Card className="border border-border/50">
        <CardHeader>
          <CardTitle>Salaires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.count > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Mediane mensuelle</p>
                  <p className="font-bold">{formatMoneyMAD(stats.medianMonthly)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Minimum mensuel</p>
                  <p className="font-bold">{formatMoneyMAD(stats.minMonthly)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Maximum mensuel</p>
                  <p className="font-bold">{formatMoneyMAD(stats.maxMonthly)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Echantillon</p>
                  <p className="font-bold">{stats.count} entrees</p>
                </div>
              </div>

              {stats.roleBreakdown.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Top postes</p>
                  <div className="space-y-2">
                    {stats.roleBreakdown.map((row) => (
                      <div key={row.jobTitle} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                        <span>{row.jobTitle}</span>
                        <span className="font-semibold">
                          {formatMoneyMAD(row.medianMonthly)} ({row.count})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {salaries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Dernieres entrees publiees</p>
                  <div className="space-y-2">
                    {salaries.map((row) => (
                      <div key={row.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{row.job_title}</p>
                          <Badge variant="outline">{row.pay_period === 'yearly' ? 'Annuel' : 'Mensuel'}</Badge>
                        </div>
                        <p className="mt-1 text-sm font-semibold">{formatMoneyMAD(row.salary)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.location || 'Localisation non precisee'} · {new Date(row.created_at).toLocaleDateString('fr-MA')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune donnee salaire publiee pour le moment.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/50 overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Partager un salaire (anonyme)
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Moderation activee avant publication.</p>
            </div>
            {authStatus === 'authenticated' && (
              <Button type="button" variant="outline" onClick={() => setIsFormOpen((prev) => !prev)}>
                {isFormOpen ? 'Masquer' : 'Ajouter'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {authStatus === 'loading' && (
            <div className="space-y-3">
              <div className="h-10 w-full rounded-md bg-muted/40 animate-pulse" />
              <div className="h-10 w-2/3 rounded-md bg-muted/40 animate-pulse" />
            </div>
          )}

          {authStatus === 'unauthenticated' && (
            <div className="rounded-xl border bg-muted/20 p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-full border bg-background p-2">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Connectez-vous pour publier un salaire</p>
                  <p className="text-sm text-muted-foreground">
                    La soumission reste reservee aux utilisateurs connectes pour limiter le spam et garder des donnees de qualite.
                  </p>
                  <div className="pt-1">
                    <Button asChild>
                      <Link href={loginHref} className="inline-flex items-center gap-2">
                        <LogIn className="h-4 w-4" />
                        Se connecter et publier
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {authStatus === 'authenticated' && !isFormOpen && (
            <p className="text-sm text-muted-foreground">
              Cliquez sur <strong>Ajouter</strong> pour soumettre votre salaire.
            </p>
          )}

          {authStatus === 'authenticated' && isFormOpen && (
            <form ref={formRef} action={formAction} className="space-y-4">
              <input type="hidden" name="businessId" value={businessId} />
              <input type="hidden" name="location" value={businessCity || ''} />
              <input type="hidden" name="isCurrent" value="true" />

              <div className="rounded-xl border bg-muted/20 p-4 md:p-5 space-y-4">
                <h4 className="text-sm font-semibold">Informations principales</h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="jobTitle">Poste</Label>
                    {roles.length > 0 ? (
                      <select id="jobTitle" name="jobTitle" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required>
                        <option value="">Selectionner un poste</option>
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input id="jobTitle" name="jobTitle" placeholder="Ex: Developpeur Full Stack" required />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="salary">Salaire</Label>
                    <Input id="salary" name="salary" type="number" min="500" step="1" required />
                    {intervals.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Intervalles autorises: {intervals.map((item) => item.label).join(' | ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 md:p-5 space-y-4">
                <h4 className="text-sm font-semibold">Contexte du poste</h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="payPeriod">Periode</Label>
                    <select
                      id="payPeriod"
                      name="payPeriod"
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      defaultValue="monthly"
                    >
                      <option value="monthly">Mensuel</option>
                      <option value="yearly">Annuel</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="employmentType">Type de contrat</Label>
                    <select
                      id="employmentType"
                      name="employmentType"
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      defaultValue="full_time"
                    >
                      <option value="full_time">Temps plein</option>
                      <option value="part_time">Temps partiel</option>
                      <option value="contract">Contrat</option>
                      <option value="intern">Stage</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="yearsExperience">Annees d'experience</Label>
                    <Input id="yearsExperience" name="yearsExperience" type="number" min="0" max="60" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="seniorityLevel">Seniority (optionnel)</Label>
                    <select id="seniorityLevel" name="seniorityLevel" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
                      <option value="">Auto</option>
                      <option value="junior">Junior</option>
                      <option value="confirme">Confirme</option>
                      <option value="senior">Senior</option>
                      <option value="expert">Expert</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="workModel">Mode de travail (optionnel)</Label>
                    <select id="workModel" name="workModel" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
                      <option value="">Non precise</option>
                      <option value="presentiel">Presentiel</option>
                      <option value="hybride">Hybride</option>
                      <option value="teletravail">Teletravail</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="department">Departement (optionnel)</Label>
                  {departments.length > 0 ? (
                    <select id="department" name="department" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
                      <option value="">Selectionner un departement</option>
                      {departments.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input id="department" name="department" placeholder="Ex: Engineering" />
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 md:p-5 space-y-3">
                <h4 className="text-sm font-semibold">Bonus (optionnel)</h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="bonusPrime" value="true" className="h-4 w-4" />
                    Prime
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="bonusTreiziemeMois" value="true" className="h-4 w-4" />
                    13e mois
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="bonusCommission" value="true" className="h-4 w-4" />
                    Commission
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="bonusAnnuel" value="true" className="h-4 w-4" />
                    Bonus annuel
                  </label>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Votre soumission est anonyme et passera par moderation avant publication.
              </p>
              <Button type="submit" className="w-full sm:w-auto">Soumettre un salaire</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
