'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitSalary } from '@/app/actions/salary';
import type { SalaryEntry, SalaryStats } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type SalarySectionProps = {
  businessId: string;
  stats: SalaryStats;
  salaries: SalaryEntry[];
};

function formatMoneyMAD(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '-';
  return `${Math.round(value).toLocaleString('fr-MA')} MAD`;
}

export function SalarySection({ businessId, stats, salaries }: SalarySectionProps) {
  const [state, formAction] = useActionState(submitSalary, { status: 'idle', message: '' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const router = useRouter();
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

      <Card className="border border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Partager un salaire (anonyme)</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Formulaire anonyme, moderation avant publication.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => setIsFormOpen((prev) => !prev)}>
              {isFormOpen ? 'Masquer' : 'Ajouter'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!isFormOpen ? (
            <p className="text-sm text-muted-foreground">
              Cliquez sur <strong>Ajouter</strong> pour soumettre votre salaire.
            </p>
          ) : (
            <form ref={formRef} action={formAction} className="space-y-4">
              <input type="hidden" name="businessId" value={businessId} />
              <input type="hidden" name="isCurrent" value="true" />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="jobTitle">Poste</Label>
                  <Input id="jobTitle" name="jobTitle" placeholder="Ex: Developpeur Full Stack" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="salary">Salaire</Label>
                  <Input id="salary" name="salary" type="number" min="500" step="1" required />
                </div>
              </div>

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
                  <Label htmlFor="location">Ville / localisation (optionnel)</Label>
                  <Input id="location" name="location" placeholder="Ex: Casablanca" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="department">Departement (optionnel)</Label>
                  <Input id="department" name="department" placeholder="Ex: Engineering" />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Votre soumission est anonyme et passera par moderation avant publication.
              </p>
              <Button type="submit">Soumettre un salaire</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
