'use client';

import { useRef, useState } from 'react';
import { Share2, Download, Loader2 } from 'lucide-react';
import type { JobOfferDecisionWorkspace } from '@/lib/types';
import { analytics } from '@/lib/analytics';
import { useI18n } from '@/components/providers/i18n-provider';

type Props = {
  workspace: JobOfferDecisionWorkspace;
  analysisId?: string;
};

const TIER_LABEL: Record<string, string> = {
  accept: '✅ ACCEPT',
  negotiate: '⚠️ NEGOTIATE',
  avoid: '❌ AVOID',
};

const TIER_BG: Record<string, string> = {
  accept: '#d1fae5',
  negotiate: '#fef3c7',
  avoid: '#fee2e2',
};

const TIER_COLOR: Record<string, string> = {
  accept: '#065f46',
  negotiate: '#92400e',
  avoid: '#991b1b',
};

export function ShareableVerdictCard({ workspace, analysisId }: Props) {
  const { t } = useI18n();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { decisionTier, snapshot, salaryGapPercent } = workspace;
  const tierLabel = TIER_LABEL[decisionTier] ?? 'ANALYZE';

  const gapText = salaryGapPercent != null
    ? salaryGapPercent > 0
      ? `+${Math.abs(Math.round(salaryGapPercent))}% above market`
      : `${Math.abs(Math.round(salaryGapPercent))}% below market`
    : 'Salary not disclosed';

  const handleShare = async () => {
    setIsGenerating(true);
    try {
      // Try native Web Share API first (mobile-friendly)
      if (navigator.share) {
        await navigator.share({
          title: `${tierLabel} — ${snapshot.jobTitle}`,
          text: `I analyzed my job offer at ${snapshot.companyName} on ReviewlyMA. Verdict: ${tierLabel}. ${gapText}. Check yours too!`,
          url: analysisId ? `${window.location.origin}/job-offers/${analysisId}` : window.location.href,
        });
        analytics.track('job_offer_shared', {
          analysis_id: analysisId,
          tier: decisionTier,
          method: 'native_share',
        });
      } else {
        // Fallback: copy URL to clipboard
        const url = analysisId ? `${window.location.origin}/job-offers/${analysisId}` : window.location.href;
        await navigator.clipboard.writeText(
          `I analyzed my job offer on ReviewlyMA. Verdict: ${tierLabel} — ${gapText}. Analyze yours: ${url}`
        );
        analytics.track('job_offer_shared', {
          analysis_id: analysisId,
          tier: decisionTier,
          method: 'clipboard',
        });
        alert('Share text copied to clipboard!');
      }
    } catch {
      // user cancelled or API not available
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Dynamically import html2canvas (avoid SSR issues)
      const html2canvasModule = await import('html2canvas').catch(() => null);
      if (!html2canvasModule || !cardRef.current) {
        // Fallback: just trigger share
        await handleShare();
        return;
      }
      const html2canvas = html2canvasModule.default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
      } as any);
      const link = document.createElement('a');
      link.download = `offer-verdict-${decisionTier}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      analytics.track('job_offer_shared', {
        analysis_id: analysisId,
        tier: decisionTier,
        method: 'image_download',
      });
    } catch {
      // fallback silently
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Share buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleShare}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          {t('jobOffers.share.button', 'Share my result')}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {t('jobOffers.share.download', 'Download card')}
        </button>
      </div>

      {/* Off-screen renderable card for html2canvas */}
      <div
        ref={cardRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '400px',
          backgroundColor: TIER_BG[decisionTier] ?? '#f8fafc',
          borderRadius: '20px',
          padding: '28px',
          fontFamily: 'system-ui, sans-serif',
        }}
        aria-hidden="true"
      >
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', color: '#64748b', textTransform: 'uppercase' }}>
          ReviewlyMA · Job Offer Analysis
        </p>
        <p style={{
          marginTop: '12px',
          fontSize: '24px',
          fontWeight: 900,
          color: TIER_COLOR[decisionTier] ?? '#0f172a',
          letterSpacing: '-0.02em',
        }}>
          {tierLabel}
        </p>
        <p style={{ marginTop: '6px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
          {snapshot.jobTitle}
        </p>
        <p style={{ fontSize: '13px', color: '#475569' }}>
          {snapshot.companyName}{snapshot.city ? ` · ${snapshot.city}` : ''}
        </p>
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          backgroundColor: 'rgba(255,255,255,0.7)',
          borderRadius: '12px',
        }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            Salary position
          </p>
          <p style={{ marginTop: '4px', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
            {'█████ MAD / mo'} {/* blurred for privacy */}
          </p>
          <p style={{ fontSize: '12px', color: '#64748b' }}>{gapText}</p>
        </div>
        <p style={{ marginTop: '16px', fontSize: '11px', color: '#94a3b8' }}>
          reviewly.ma · Analyze yours for free
        </p>
      </div>
    </div>
  );
}
