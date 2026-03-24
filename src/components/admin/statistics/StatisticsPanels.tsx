'use client';

import type { ReactNode } from 'react';
import type { SalaryReportBuilderData, SalaryReportBuilderInput } from '@/app/actions/admin';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingDown, TrendingUp } from 'lucide-react';

type RequiredReportFilters = Required<SalaryReportBuilderInput>;

export const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

export function StatisticsOverviewCard({
  name,
  value,
  newThisMonth,
  growth,
  icon,
  gradient,
}: {
  name: string;
  value: number;
  newThisMonth: number;
  growth: number;
  icon: ReactNode;
  gradient: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute -mr-10 -mt-10 h-32 w-32 rounded-full bg-gradient-to-br ${gradient} right-0 top-0 opacity-10`} />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{name}</CardTitle>
        <div className={`rounded-lg bg-gradient-to-br p-2 text-white ${gradient}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value.toLocaleString('fr-MA')}</div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">+{newThisMonth} ce mois</span>
          {growth !== 0 ? (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${growth > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {growth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {growth > 0 ? '+' : ''}
              {growth}%
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatisticsChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function StatisticsEmptyChartState({ label }: { label: string }) {
  return <div className="flex h-[300px] items-center justify-center text-muted-foreground">{label}</div>;
}

export function SalaryReportBuilderPanel({
  reportFilters,
  customReports,
  loading,
  isPending,
  onReportFiltersChange,
  onGenerate,
  onPreset,
}: {
  reportFilters: RequiredReportFilters;
  customReports: SalaryReportBuilderData | null;
  loading: boolean;
  isPending: boolean;
  onReportFiltersChange: (filters: RequiredReportFilters) => void;
  onGenerate: () => void;
  onPreset: (preset: Partial<SalaryReportBuilderInput>) => void;
}) {
  const updateField = <K extends keyof RequiredReportFilters>(key: K, value: RequiredReportFilters[K]) => {
    onReportFiltersChange({ ...reportFilters, [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Builder salaires</CardTitle>
        <CardDescription>
          Configurez vos filtres (ville, categorie, poste, contrat), la metrique et le seuil d echantillon pour generer un classement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={reportFilters.city}
            onChange={(event) => updateField('city', event.target.value)}
            placeholder="Ville (ex: Casablanca)"
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
          <input
            value={reportFilters.category}
            onChange={(event) => updateField('category', event.target.value)}
            placeholder="Categorie (ex: call center, it...)"
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
          <input
            value={reportFilters.jobTitleKeyword}
            onChange={(event) => updateField('jobTitleKeyword', event.target.value)}
            placeholder="Mot-cle poste (ex: stagiaire, dev...)"
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
          <select
            value={reportFilters.employmentType}
            onChange={(event) => updateField('employmentType', event.target.value as RequiredReportFilters['employmentType'])}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">Contrat: Tous</option>
            <option value="full_time">Temps plein</option>
            <option value="part_time">Temps partiel</option>
            <option value="contract">Contrat</option>
            <option value="intern">Stage</option>
          </select>
          <select
            value={reportFilters.metric}
            onChange={(event) => updateField('metric', event.target.value as RequiredReportFilters['metric'])}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="avg">Metrique: Moyenne</option>
            <option value="median">Metrique: Mediane</option>
            <option value="p90">Metrique: P90</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={1}
              max={100}
              value={reportFilters.minSamples}
              onChange={(event) => updateField('minSamples', Number(event.target.value || 5))}
              placeholder="Min samples"
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
            <input
              type="number"
              min={1}
              max={50}
              value={reportFilters.limit}
              onChange={(event) => updateField('limit', Number(event.target.value || 10))}
              placeholder="Limite"
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={loading || isPending} onClick={onGenerate}>
            {(loading || isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generer rapport
          </Button>
          <Button
            variant="ghost"
            disabled={loading || isPending}
            onClick={() =>
              onPreset({
                city: 'Casablanca',
                category: 'call center',
                jobTitleKeyword: '',
                employmentType: 'all',
                metric: 'avg',
                minSamples: 5,
                limit: 10,
              })
            }
          >
            Preset: Call Center Casablanca
          </Button>
          <Button
            variant="ghost"
            disabled={loading || isPending}
            onClick={() =>
              onPreset({
                city: '',
                category: '',
                jobTitleKeyword: '',
                employmentType: 'intern',
                metric: 'avg',
                minSamples: 5,
                limit: 10,
              })
            }
          >
            Preset: Stagiaires
          </Button>
        </div>

        {customReports ? (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold">Classement entreprises</h3>
              {customReports.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune donnee suffisante pour ces filtres.</p>
              ) : (
                <div className="space-y-2">
                  {customReports.rows.map((row, index) => (
                    <div key={row.businessId} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div>
                        <p className="font-medium">
                          {index + 1}. {row.businessName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.city} | {row.category} | {row.submissionCount} soumissions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{row.metricValue.toLocaleString('fr-MA')} MAD</p>
                        <p className="text-[11px] text-muted-foreground">
                          avg {row.avgMonthlySalary.toLocaleString('fr-MA')} | med {row.medianMonthlySalary.toLocaleString('fr-MA')} | p90 {row.p90MonthlySalary.toLocaleString('fr-MA')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">Genere le {new Date(customReports.generatedAt).toLocaleString('fr-MA')}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
