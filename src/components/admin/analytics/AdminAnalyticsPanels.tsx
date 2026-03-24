'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const analyticsTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '16px',
  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
};

export function AnalyticsSectionCard({
  title,
  description,
  children,
  contentClassName = 'px-0 pb-0 pt-6',
  className = 'border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6',
}: {
  title: string;
  description: string;
  children: ReactNode;
  contentClassName?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg font-bold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

export function AnalyticsSpotlightCard({
  eyebrow,
  value,
  description,
}: {
  eyebrow: string;
  value: string;
  description: string;
}) {
  const numericValue = Number.parseFloat(value.replace('%', '')) || 0;

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150">
        <div className="h-40 w-40 rounded-full border-8 border-white/40" />
      </div>
      <div className="relative z-10 text-center space-y-4">
        <p className="text-indigo-100 font-bold uppercase tracking-widest text-xs">{eyebrow}</p>
        <div className="text-6xl font-black">{value}</div>
        <p className="text-indigo-100 font-medium text-sm">{description}</p>
        <div className="pt-4">
          <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full shadow-[0_0_10px_white]"
              style={{ width: `${Math.min(100, Math.max(0, numericValue))}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function AnalyticsProgressMetricsCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: Array<{ label: string; value: number }>;
}) {
  return (
    <AnalyticsSectionCard title={title} description={description}>
      <div className="space-y-5">
        {items.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
              <span className="font-bold text-slate-900 dark:text-white">{Math.round(item.value)}%</span>
            </div>
            <div className="h-3 bg-secondary/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(item.value, 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </AnalyticsSectionCard>
  );
}

export function AnalyticsTopEmployersCard({
  title,
  description,
  employers,
  emptyMessage,
}: {
  title: string;
  description: string;
  employers: Array<{
    businessId: string;
    name: string;
    approvedOfferCount: number;
    salaryDisclosureRate: number;
    avgTransparencyScore: number;
  }>;
  emptyMessage: string;
}) {
  return (
    <AnalyticsSectionCard title={title} description={description}>
      <div className="space-y-4">
        {employers.length > 0 ? (
          employers.map((employer, index) => (
            <div key={employer.businessId} className="flex items-center justify-between gap-4 p-4 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                  #{index + 1}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{employer.name}</p>
                  <p className="text-xs text-muted-foreground">{employer.approvedOfferCount} approved offers</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{Math.round(employer.salaryDisclosureRate)}% disclosed</p>
                <p className="text-xs text-muted-foreground">{Math.round(employer.avgTransparencyScore)} clarity</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">{emptyMessage}</div>
        )}
      </div>
    </AnalyticsSectionCard>
  );
}

export function AnalyticsQueueHealthCard({
  title,
  description,
  stats,
  buttonLabel,
}: {
  title: string;
  description: string;
  stats: Array<{ label: string; value: number }>;
  buttonLabel: string;
}) {
  return (
    <AnalyticsSectionCard title={title} description={description} contentClassName="px-0 pt-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/20 bg-white/40 dark:bg-slate-800/40 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-2xl font-black">{item.value.toLocaleString('fr-MA')}</p>
          </div>
        ))}
      </div>
      <Button asChild variant="outline" className="rounded-xl font-bold">
        <Link href="/admin/job-offers">{buttonLabel}</Link>
      </Button>
    </AnalyticsSectionCard>
  );
}

export function AnalyticsUnresolvedCompaniesCard({
  title,
  description,
  companies,
  itemDescription,
  emptyMessage,
}: {
  title: string;
  description: string;
  companies: Array<{ name: string; count: number }>;
  itemDescription: string;
  emptyMessage: string;
}) {
  return (
    <AnalyticsSectionCard title={title} description={description}>
      <div className="space-y-4">
        {companies.length > 0 ? (
          companies.map((company, index) => (
            <div key={`${company.name}-${index}`} className="flex items-center justify-between gap-4 p-4 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/20">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white truncate">{company.name}</p>
                <p className="text-xs text-muted-foreground">{itemDescription}</p>
              </div>
              <Badge variant="secondary" className="rounded-lg font-bold">
                {company.count}
              </Badge>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">{emptyMessage}</div>
        )}
      </div>
    </AnalyticsSectionCard>
  );
}

export function AnalyticsRankedQueryList({
  title,
  description,
  queries,
  countLabel,
  emptyMessage,
}: {
  title: string;
  description: string;
  queries: Array<{ name: string; value: number }>;
  countLabel: (count: number) => string;
  emptyMessage: string;
}) {
  return (
    <AnalyticsSectionCard title={title} description={description} contentClassName="px-0 pt-6">
      <div className="space-y-4">
        {queries.length > 0 ? (
          queries.map((query, index) => (
            <div key={`${query.name}-${index}`} className="flex items-center justify-between p-4 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs">
                  #{index + 1}
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-200">{query.name}</span>
              </div>
              <Badge variant="secondary" className="rounded-lg font-bold">
                {countLabel(query.value)}
              </Badge>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-muted-foreground font-medium italic">{emptyMessage}</div>
        )}
      </div>
    </AnalyticsSectionCard>
  );
}
