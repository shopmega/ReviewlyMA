import { BadgeCheck, BriefcaseBusiness, Building2, Eye, MapPin, ShieldAlert, Sparkles, Wallet } from 'lucide-react';
import type { JobOfferDecisionWorkspace, JobOfferExtractionDiagnostics } from '@/lib/types';
import {
  formatContractType,
  formatSalary,
  formatWorkModel,
  getFieldConfidenceLabel,
  getFieldStatusLabel,
} from '@/lib/job-offers/workspace';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/components/providers/i18n-provider';

type Props = {
  workspace: JobOfferDecisionWorkspace;
};

const FIELD_ORDER: Array<{
  label: string;
  field: keyof NonNullable<JobOfferExtractionDiagnostics['fieldDiagnostics']>;
  value: (workspace: JobOfferDecisionWorkspace, t: (k: string, f?: string) => string) => string;
  icon: typeof Building2;
}> = [
  { label: 'jobOffers.workspace.facts.fields.company', field: 'companyName', value: (workspace) => workspace.snapshot.companyName, icon: Building2 },
  { label: 'jobOffers.workspace.facts.fields.role', field: 'jobTitle', value: (workspace, t) => t(workspace.snapshot.jobTitle), icon: BriefcaseBusiness },
  { label: 'jobOffers.workspace.facts.fields.city', field: 'city', value: (workspace, t) => workspace.snapshot.city || t('jobOffers.workspace.facts.fallbacks.notDetected', 'Not detected'), icon: MapPin },
  { label: 'jobOffers.workspace.facts.fields.salary', field: 'salaryMin', value: (workspace, t) => t(formatSalary(workspace.snapshot)), icon: Wallet },
  { label: 'jobOffers.workspace.facts.fields.contract', field: 'contractType', value: (workspace, t) => t(formatContractType(workspace.snapshot.contractType)), icon: BadgeCheck },
  { label: 'jobOffers.workspace.facts.fields.workModel', field: 'workModel', value: (workspace, t) => t(formatWorkModel(workspace.snapshot.workModel)), icon: Eye },
  { label: 'jobOffers.workspace.facts.fields.seniority', field: 'seniorityLevel', value: (workspace, t) => workspace.snapshot.seniorityLevel || t('jobOffers.workspace.facts.fallbacks.notSpecified', 'Not specified'), icon: Sparkles },
  { label: 'jobOffers.workspace.facts.fields.benefits', field: 'benefits', value: (workspace, t) => workspace.snapshot.benefits.length > 0 ? workspace.snapshot.benefits.join(', ') : t('jobOffers.workspace.facts.fallbacks.noneVisible', 'None visible'), icon: ShieldAlert },
];

export function OfferFactsGrid({ workspace }: Props) {
  const { t } = useI18n();

  return (
    <Card className="rounded-[1.8rem] border-slate-200 shadow-sm" id="offer-facts">
      <CardHeader>
        <CardTitle className="text-xl font-black tracking-tight">{t('jobOffers.workspace.facts.title', 'Offer facts')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {FIELD_ORDER.map((item) => {
            const Icon = item.icon;
            const confidence = workspace.extractionDiagnostics?.fieldDiagnostics[item.field]?.confidence;

            return (
              <div key={item.label} className="rounded-[1.2rem] border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Icon className="h-4 w-4 text-slate-500" />
                    {t(item.label)}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge variant="outline" className={getStatusTone(confidence)}>
                      {t(getFieldStatusLabel(confidence))}
                    </Badge>
                    <Badge variant="outline" className={getConfidenceTone(confidence)}>
                      {t(getFieldConfidenceLabel(confidence))}
                    </Badge>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.value(workspace, t)}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusTone(confidence?: string) {
  if (confidence === 'high') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (confidence === 'medium') return 'border-sky-200 bg-sky-50 text-sky-900';
  if (confidence === 'low') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function getConfidenceTone(confidence?: string) {
  if (confidence === 'high') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (confidence === 'medium') return 'border-sky-200 bg-sky-50 text-sky-900';
  if (confidence === 'low') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-slate-200 bg-white text-slate-700';
}
