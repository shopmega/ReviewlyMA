'use client';

import { useState } from 'react';
import { Copy, Check, Mail, MessageCircle } from 'lucide-react';
import type { JobOfferDecisionWorkspace } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/job-offers/workspace';
import { useI18n } from '@/components/providers/i18n-provider';

type Props = {
  workspace: JobOfferDecisionWorkspace;
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-1.5"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : label}
    </Button>
  );
}

export function NegotiationScriptPanel({ workspace }: Props) {
  const { t } = useI18n();
  const { negotiationScript, decisionTier } = workspace;

  if (!negotiationScript || decisionTier === 'accept') return null;

  const { suggestedMonthlyAsk, suggestedAskLabel, emailTemplate, whatsappTemplate } = negotiationScript;

  return (
    <Card className="rounded-[1.8rem] border-amber-200 bg-amber-50/40 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
              {t('jobOffers.negotiation.sectionLabel', 'Negotiation generator')}
            </p>
            <CardTitle className="mt-1 text-xl font-black tracking-tight">
              {t('jobOffers.negotiation.title', 'Use market data to negotiate')}
            </CardTitle>
          </div>
          {suggestedMonthlyAsk != null && (
            <div className="rounded-[1rem] border border-amber-300 bg-white px-4 py-3 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                {t('jobOffers.negotiation.suggestedAsk', 'Suggested ask')}
              </p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {suggestedAskLabel}
              </p>
            </div>
          )}
        </div>
        <p className="mt-2 text-sm text-amber-800">
          {t('jobOffers.negotiation.description', 'Based on market benchmarks for this role. Personalise before sending.')}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Email template */}
        <div className="rounded-[1.3rem] border border-amber-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-900">
                {t('jobOffers.negotiation.emailFormat', 'Email version')}
              </p>
            </div>
            <CopyButton text={emailTemplate} label={t('jobOffers.negotiation.copyEmail', 'Copy email')} />
          </div>
          <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700 font-sans">
            {emailTemplate}
          </pre>
        </div>

        {/* WhatsApp template */}
        <div className="rounded-[1.3rem] border border-amber-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-900">
                {t('jobOffers.negotiation.whatsappFormat', 'WhatsApp version')}
              </p>
            </div>
            <CopyButton text={whatsappTemplate} label={t('jobOffers.negotiation.copyWhatsapp', 'Copy message')} />
          </div>
          <p className="text-sm leading-6 text-slate-700">
            {whatsappTemplate}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
