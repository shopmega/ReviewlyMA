'use server';

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

  try {
    const serviceClient = await createAdminClient();

    const { data: settings, error: settingsError } = await serviceClient
      .from('site_settings')
      .select('id, adsense_enabled, adsense_client_id, tier_pro_annual_price')
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
    }

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
