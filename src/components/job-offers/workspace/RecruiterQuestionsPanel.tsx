'use client';

import { useState } from 'react';
import { BriefcaseBusiness, Copy, Check, ClipboardList } from 'lucide-react';
import type { JobOfferDecisionWorkspace } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/components/providers/i18n-provider';

type Props = {
  workspace: JobOfferDecisionWorkspace;
};

function useCopyState() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    } catch {
      // ignore
    }
  };
  return { copiedKey, copy };
}

export function RecruiterQuestionsPanel({ workspace }: Props) {
  const { t } = useI18n();
  const { copiedKey, copy } = useCopyState();
  const [allCopied, setAllCopied] = useState(false);

  const translatedQuestions = workspace.recruiterQuestions.map((q) => t(q));

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(translatedQuestions.join('\n'));
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2" id="actions-step">
      <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="text-xl font-black tracking-tight">
              {t('jobOffers.workspace.actions.recruiterQuestions.title', 'Questions to ask the recruiter')}
            </CardTitle>
            <button
              type="button"
              onClick={handleCopyAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {allCopied
                ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> {t('jobOffers.questions.allCopied', 'All copied!')}</>
                : <><ClipboardList className="h-3.5 w-3.5" /> {t('jobOffers.questions.copyAll', 'Copy all')}</>
              }
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {translatedQuestions.map((question, idx) => (
            <div
              key={idx}
              className="group flex items-start justify-between gap-3 rounded-[1.2rem] border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950"
            >
              <div className="flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  <Badge variant="outline" className="border-sky-200 bg-white text-sky-900">
                    {t('jobOffers.workspace.actions.actionBadge', 'Action')}
                  </Badge>
                </div>
                {question}
              </div>
              <button
                type="button"
                onClick={() => copy(question, String(idx))}
                className="mt-1 shrink-0 rounded-lg p-1.5 text-sky-500 opacity-0 transition hover:bg-sky-100 group-hover:opacity-100"
                aria-label="Copy question"
              >
                {copiedKey === String(idx)
                  ? <Check className="h-3.5 w-3.5 text-emerald-600" />
                  : <Copy className="h-3.5 w-3.5" />
                }
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-black tracking-tight">
            {t('jobOffers.workspace.actions.interviewTopics.title', 'Likely interview topics')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {workspace.interviewTopics.map((topic) => (
            <div key={topic} className="flex items-start gap-3 rounded-[1.2rem] border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700">
              <BriefcaseBusiness className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
              <span>{t(topic)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
