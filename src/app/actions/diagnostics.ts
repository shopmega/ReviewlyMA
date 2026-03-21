'use server';

import { getConfiguredAiProviders, hasConfiguredAiModel } from '@/ai/genkit';
import { extractJobOfferInput } from '@/lib/job-offers/extraction';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin';

type CheckStatus = 'ok' | 'warn' | 'error';

export type DiagnosticCheck = {
  name: string;
  status: CheckStatus;
  message: string;
  details?: string;
};

export type DiagnosticsResult = {
  ok: boolean;
  ranAt: string;
  checks: DiagnosticCheck[];
};

function maskSecret(value?: string | null) {
  if (!value) return 'missing';
  if (value.length <= 8) return 'set';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export async function runAdminDiagnostics(): Promise<DiagnosticsResult> {
  await verifyAdminSession();

  const checks: DiagnosticCheck[] = [];
  const configuredAiProviders = getConfiguredAiProviders();

  const requiredEnv = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ] as const;

  for (const key of requiredEnv) {
    const value = process.env[key];
    checks.push({
      name: `Env: ${key}`,
      status: value ? 'ok' : 'error',
      message: value ? 'Configured' : 'Missing',
      details: value ? maskSecret(value) : undefined,
    });
  }

  const adsenseEnv = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;
  checks.push({
    name: 'Env: NEXT_PUBLIC_ADSENSE_PUB_ID',
    status: adsenseEnv ? 'ok' : 'warn',
    message: adsenseEnv ? 'Configured' : 'Not set (ads components will stay disabled)',
    details: adsenseEnv ? maskSecret(adsenseEnv) : undefined,
  });

  const gaEnvPrimary = process.env.NEXT_PUBLIC_GA_ID;
  const gaEnvLegacy = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  const gaEnv = gaEnvPrimary || gaEnvLegacy;
  checks.push({
    name: 'Env: GA ID',
    status: gaEnv ? 'ok' : 'warn',
    message: gaEnv
      ? `Configured via ${gaEnvPrimary ? 'NEXT_PUBLIC_GA_ID' : 'NEXT_PUBLIC_GOOGLE_ANALYTICS_ID'}`
      : 'Not set in env (GA may still be configured via DB fallback)',
    details: gaEnv ? maskSecret(gaEnv) : undefined,
  });

  const googleAdsEnv = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  checks.push({
    name: 'Env: NEXT_PUBLIC_GOOGLE_ADS_ID',
    status: googleAdsEnv ? 'ok' : 'warn',
    message: googleAdsEnv ? 'Configured' : 'Not set (Google Ads conversion tracking disabled)',
    details: googleAdsEnv ? maskSecret(googleAdsEnv) : undefined,
  });

  const googleAdsConversionVars = [
    'NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_PREMIUM_SUBSCRIBED',
    'NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_BUSINESS_CLAIMED',
    'NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_USER_REGISTERED',
    'NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_REVIEW_SUBMITTED',
  ] as const;

  const configuredConversionVars = googleAdsConversionVars.filter((key) => Boolean(process.env[key]));
  checks.push({
    name: 'Env: Google Ads conversion labels',
    status: configuredConversionVars.length > 0 ? 'ok' : 'warn',
    message:
      configuredConversionVars.length > 0
        ? `${configuredConversionVars.length}/${googleAdsConversionVars.length} label(s) configured`
        : 'No Google Ads conversion labels configured',
    details:
      configuredConversionVars.length > 0
        ? configuredConversionVars.join(', ')
        : undefined,
  });

  const missingConversionVars = googleAdsConversionVars.filter((key) => !process.env[key]);
  for (const key of missingConversionVars) {
    checks.push({
      name: `Env: ${key}`,
      status: 'warn',
      message: 'Missing (event conversion for this action will not fire)',
    });
  }

  checks.push({
    name: 'AI: job offer extraction provider',
    status: hasConfiguredAiModel() ? 'ok' : 'warn',
    message: hasConfiguredAiModel()
      ? `Configured (${configuredAiProviders.map((provider) => provider.label).join(', ')})`
      : 'No AI provider configured; job offer extraction will fall back to heuristics only',
  });

  try {
    const extractionProbe = await extractJobOfferInput({
      sourceType: 'paste',
      sourceText: [
        'Senior Product Manager',
        'Atlas Digital',
        'Casablanca',
        'CDI',
        'Hybrid',
        'Salary: 25000 MAD per month',
        'We are hiring a Senior Product Manager to lead roadmap and discovery.',
        '5 years experience required.',
      ].join('\n'),
      sourceUrl: '',
    });

    const titleSource = extractionProbe.diagnostics.fieldDiagnostics.jobTitle?.source ?? 'none';
    const companySource = extractionProbe.diagnostics.fieldDiagnostics.companyName?.source ?? 'none';
    const usedAi = extractionProbe.diagnostics.usedAi;
    const keyFieldsUsedHeuristicOnly = [titleSource, companySource].every((source) =>
      source === 'heuristic' || source === 'merged'
    );

    let status: CheckStatus = 'ok';
    let message = 'AI extraction is active for the probe sample.';

    if (!hasConfiguredAiModel()) {
      status = 'warn';
      message = 'Probe ran without AI because no provider is configured.';
    } else if (!usedAi) {
      status = 'warn';
      message = 'AI provider is configured but the probe fell back to heuristics.';
    } else if (keyFieldsUsedHeuristicOnly) {
      status = 'warn';
      message = 'AI responded, but critical probe fields still resolved from heuristic fallback.';
    }

    checks.push({
      name: 'AI: job offer extraction runtime probe',
      status,
      message,
      details: [
        `usedAi=${usedAi}`,
        `jobTitleSource=${titleSource}`,
        `companyNameSource=${companySource}`,
        `minimumFieldsMet=${extractionProbe.diagnostics.minimumFieldsMet}`,
      ].join(' | '),
    });
  } catch (error: any) {
    checks.push({
      name: 'AI: job offer extraction runtime probe',
      status: hasConfiguredAiModel() ? 'error' : 'warn',
      message: error?.message || 'Job offer extraction probe failed',
      details: hasConfiguredAiModel()
        ? 'The extractor could not complete a synthetic analysis run.'
        : 'No AI provider configured, and the extractor probe failed before heuristic fallback could complete.',
    });
  }

  try {
    const serviceClient = await createAdminClient();

    const { error: serviceAuthError } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1 });
    checks.push({
      name: 'Service role auth check',
      status: serviceAuthError ? 'error' : 'ok',
      message: serviceAuthError ? serviceAuthError.message : 'Service role key can call auth.admin',
    });

    const { data: settings, error: settingsError } = await serviceClient
      .from('site_settings')
      .select('id, google_analytics_id, facebook_pixel_id, adsense_enabled, adsense_client_id, tier_pro_annual_price')
      .eq('id', 'main')
      .maybeSingle();

    if (settingsError) {
      checks.push({
        name: 'DB: site_settings query',
        status: 'error',
        message: settingsError.message,
      });
    } else {
      checks.push({
        name: 'DB: site_settings query',
        status: 'ok',
        message: settings ? 'OK' : 'Row "main" not found',
      });

      checks.push({
        name: 'Schema: tier_pro_annual_price',
        status: settings && Object.hasOwn(settings, 'tier_pro_annual_price') ? 'ok' : 'error',
        message: settings && Object.hasOwn(settings, 'tier_pro_annual_price') ? 'Present' : 'Missing column in schema cache/migration',
      });

      checks.push({
        name: 'Schema: adsense columns',
        status: settings && Object.hasOwn(settings, 'adsense_enabled') && Object.hasOwn(settings, 'adsense_client_id') ? 'ok' : 'error',
        message: settings && Object.hasOwn(settings, 'adsense_enabled') && Object.hasOwn(settings, 'adsense_client_id') ? 'Present' : 'Missing AdSense columns',
      });

      checks.push({
        name: 'Schema: analytics columns',
        status: settings && Object.hasOwn(settings, 'google_analytics_id') && Object.hasOwn(settings, 'facebook_pixel_id') ? 'ok' : 'error',
        message: settings && Object.hasOwn(settings, 'google_analytics_id') && Object.hasOwn(settings, 'facebook_pixel_id') ? 'Present' : 'Missing analytics columns',
      });

      const dbGaId = settings?.google_analytics_id;
      const effectiveGaId = gaEnv || dbGaId || null;
      checks.push({
        name: 'GA effective configuration',
        status: effectiveGaId ? 'ok' : 'warn',
        message: effectiveGaId
          ? `Configured via ${gaEnv ? 'environment variable' : 'site_settings.google_analytics_id'}`
          : 'Not configured (env + DB empty)',
        details: effectiveGaId ? maskSecret(effectiveGaId) : undefined,
      });
    }

    const { error: paymentExpiresError } = await serviceClient
      .from('premium_payments')
      .select('id, expires_at')
      .limit(1);

    checks.push({
      name: 'Schema: premium_payments.expires_at',
      status: paymentExpiresError ? 'error' : 'ok',
      message: paymentExpiresError ? paymentExpiresError.message : 'Present',
      details: paymentExpiresError && String(paymentExpiresError.message || '').toLowerCase().includes('schema cache')
        ? 'Run schema reload and ensure expires_at migration is applied.'
        : undefined,
    });

    const { error: typoTableError } = await serviceClient
      .from('premium_payements')
      .select('id')
      .limit(1);

    const typoTableExists = !typoTableError;
    checks.push({
      name: 'Schema hygiene: premium_payements typo table',
      status: typoTableExists ? 'warn' : 'ok',
      message: typoTableExists
        ? 'Legacy typo table exists; keep sync migration active or remove safely.'
        : 'Not present',
    });

  } catch (err: any) {
    checks.push({
      name: 'DB initialization',
      status: 'error',
      message: err?.message || 'Unknown DB initialization error',
    });
  }

  const ok = checks.every((c) => c.status !== 'error');
  return {
    ok,
    ranAt: new Date().toISOString(),
    checks,
  };
}
