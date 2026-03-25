import type { JobOfferDecisionWorkspace } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/components/providers/i18n-provider';

type Props = {
  workspace: JobOfferDecisionWorkspace;
};

export function MissingInfoPanel({ workspace }: Props) {
  const { t } = useI18n();

  return (
    <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-black tracking-tight">{t('jobOffers.workspace.gaps.panelTitle', 'Missing information')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {workspace.missingInformation.length > 0 ? workspace.missingInformation.map((gap) => (
          <div key={gap.title} className="rounded-[1.2rem] border border-amber-200 bg-amber-50/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-900">{t(gap.title)}</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{t(gap.insight)}</p>
            <p className="mt-3 text-sm font-semibold text-slate-950">{t(gap.action)}</p>
          </div>
        )) : (
          <div className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50/70 p-4 text-sm leading-6 text-emerald-950">
            {t('jobOffers.workspace.gaps.allVisible', 'The main decision-critical fields are visible. Use the follow-up actions to confirm package details and manager fit.')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
