import { BadgeCheck, BriefcaseBusiness, Building2, Eye, MapPin, ShieldAlert, Sparkles, Wallet } from 'lucide-react';
import type { JobOfferDecisionWorkspace } from '@/lib/types';
import {
  formatContractType,
  formatSalary,
  formatWorkModel,
  getFieldConfidenceLabel,
  getFieldStatusLabel,
} from '@/lib/job-offers/workspace';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  workspace: JobOfferDecisionWorkspace;
};

export function DiagnosticsAccordion({ workspace }: Props) {
  return (
    <Card className="rounded-[1.8rem] border-slate-200 shadow-sm" id="details-step">
      <CardHeader>
        <CardTitle className="text-xl font-black tracking-tight">Facts vs diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible defaultValue="details">
          <AccordionItem value="details" className="border-none">
            <AccordionTrigger className="rounded-[1.2rem] border border-slate-200 px-4 text-left text-sm hover:no-underline">
              Expand detected fields and source details
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {buildDetailItems(workspace).map((item) => {
                  const confidence = workspace.extractionDiagnostics?.fieldDiagnostics[item.field]?.confidence;
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="rounded-[1.2rem] border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <Icon className="h-4 w-4 text-slate-500" />
                          {item.label}
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                            {getFieldStatusLabel(confidence)}
                          </Badge>
                          <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                            {getFieldConfidenceLabel(confidence)}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{item.value}</p>
                    </div>
                  );
                })}
              </div>

              {workspace.snapshot.sourceSummary ? (
                <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-700">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Source summary</p>
                  <p className="mt-2">{workspace.snapshot.sourceSummary}</p>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Source URL</p>
                  <p className="mt-2 break-all text-slate-700">{workspace.snapshot.sourceUrl || 'Not provided'}</p>
                </div>
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Document</p>
                  <p className="mt-2 text-slate-700">{workspace.snapshot.documentName || 'Not provided'}</p>
                </div>
              </div>

              {workspace.hiddenSignals.length > 0 ? (
                <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Hidden signals</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                    {workspace.hiddenSignals.map((signal) => (
                      <p key={signal}>{signal}</p>
                    ))}
                  </div>
                </div>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function buildDetailItems(workspace: JobOfferDecisionWorkspace) {
  return [
    { label: 'Company', value: workspace.snapshot.companyName, field: 'companyName' as const, icon: Building2 },
    { label: 'Role title', value: workspace.snapshot.jobTitle, field: 'jobTitle' as const, icon: BriefcaseBusiness },
    { label: 'City', value: workspace.snapshot.city || 'Not detected', field: 'city' as const, icon: MapPin },
    { label: 'Salary', value: formatSalary(workspace.snapshot), field: 'salaryMin' as const, icon: Wallet },
    { label: 'Contract', value: formatContractType(workspace.snapshot.contractType), field: 'contractType' as const, icon: BadgeCheck },
    { label: 'Work model', value: formatWorkModel(workspace.snapshot.workModel), field: 'workModel' as const, icon: Eye },
    { label: 'Seniority', value: workspace.snapshot.seniorityLevel || 'Not specified', field: 'seniorityLevel' as const, icon: Sparkles },
    { label: 'Benefits', value: workspace.snapshot.benefits.length > 0 ? workspace.snapshot.benefits.join(', ') : 'None visible', field: 'benefits' as const, icon: ShieldAlert },
  ];
}
