'use client';

import { useState } from 'react';
import { CheckCircle2, HandshakeIcon, HelpCircle } from 'lucide-react';
import { analytics } from '@/lib/analytics';
import { useI18n } from '@/components/providers/i18n-provider';

const OUTCOME_STORAGE_KEY = 'job_offer_outcomes';

type OutcomeValue = 'accepted' | 'negotiated' | 'declined';

type OutcomeRecord = {
  analysisId: string;
  outcome: OutcomeValue;
  negotiatedSalary?: number | null;
  recordedAt: string;
};

function getStoredOutcome(analysisId: string): OutcomeValue | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(OUTCOME_STORAGE_KEY);
    if (!raw) return null;
    const records: OutcomeRecord[] = JSON.parse(raw);
    return records.find((r) => r.analysisId === analysisId)?.outcome ?? null;
  } catch {
    return null;
  }
}

function saveOutcome(record: OutcomeRecord) {
  try {
    const raw = localStorage.getItem(OUTCOME_STORAGE_KEY);
    const records: OutcomeRecord[] = raw ? JSON.parse(raw) : [];
    const existing = records.findIndex((r) => r.analysisId === record.analysisId);
    if (existing >= 0) {
      records[existing] = record;
    } else {
      records.push(record);
    }
    localStorage.setItem(OUTCOME_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore storage errors
  }
}

type Props = {
  analysisId: string;
};

export function OutcomeFollowupCard({ analysisId }: Props) {
  const { t } = useI18n();
  const [outcome, setOutcome] = useState<OutcomeValue | null>(() => getStoredOutcome(analysisId));
  const [showNegotiatedInput, setShowNegotiatedInput] = useState(false);
  const [negotiatedSalary, setNegotiatedSalary] = useState('');

  const handleOutcome = (value: OutcomeValue) => {
    setOutcome(value);
    if (value === 'negotiated') {
      setShowNegotiatedInput(true);
    }

    const record: OutcomeRecord = {
      analysisId,
      outcome: value,
      recordedAt: new Date().toISOString(),
    };
    saveOutcome(record);
    analytics.track('job_offer_outcome', { analysis_id: analysisId, decision: value });
  };

  const handleSaveNegotiated = () => {
    const salary = negotiatedSalary ? parseInt(negotiatedSalary, 10) : null;
    const record: OutcomeRecord = {
      analysisId,
      outcome: 'negotiated',
      negotiatedSalary: salary ?? null,
      recordedAt: new Date().toISOString(),
    };
    saveOutcome(record);
    analytics.track('job_offer_outcome', {
      analysis_id: analysisId,
      decision: 'negotiated',
      negotiated_salary: salary,
    });
    setShowNegotiatedInput(false);
  };

  if (outcome && !showNegotiatedInput) {
    return (
      <div className="rounded-[1.8rem] border border-emerald-200 bg-emerald-50/60 p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-semibold text-emerald-900">
            {outcome === 'accepted'
              ? t('jobOffers.outcome.recordedAccepted', 'Recorded: you accepted this offer')
              : outcome === 'negotiated'
              ? t('jobOffers.outcome.recordedNegotiated', 'Recorded: you negotiated this offer')
              : t('jobOffers.outcome.recordedDeclined', 'Recorded: you declined this offer')}
          </p>
        </div>
        <p className="mt-2 text-xs text-emerald-700">
          {t('jobOffers.outcome.thanksNote', 'Thanks — this helps build real outcome data for Morocco.')}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50/60 p-5 space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t('jobOffers.outcome.sectionLabel', 'Outcome tracker')}
        </p>
        <p className="mt-1 text-base font-black tracking-tight text-slate-950">
          {t('jobOffers.outcome.question', 'What did you decide?')}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {t('jobOffers.outcome.description', 'Your anonymous response helps calibrate offers for everyone in Morocco.')}
        </p>
      </div>

      {showNegotiatedInput ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-900">
            {t('jobOffers.outcome.negotiatedSalaryPrompt', 'What salary did you get? (optional)')}
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="e.g. 12500"
              value={negotiatedSalary}
              onChange={(e) => setNegotiatedSalary(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <span className="flex items-center text-sm text-slate-500">MAD/mo</span>
          </div>
          <button
            type="button"
            onClick={handleSaveNegotiated}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {t('jobOffers.outcome.save', 'Save')}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleOutcome('accepted')}
            className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
          >
            <CheckCircle2 className="h-4 w-4" />
            {t('jobOffers.outcome.accepted', 'Yes, I accepted')}
          </button>
          <button
            type="button"
            onClick={() => handleOutcome('negotiated')}
            className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
          >
            <HandshakeIcon className="h-4 w-4" />
            {t('jobOffers.outcome.negotiated', 'I negotiated')}
          </button>
          <button
            type="button"
            onClick={() => handleOutcome('declined')}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <HelpCircle className="h-4 w-4" />
            {t('jobOffers.outcome.declined', 'I declined')}
          </button>
        </div>
      )}
    </div>
  );
}
