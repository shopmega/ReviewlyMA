import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Health check endpoint
 * Returns application health status for monitoring
 * GET /api/health
 */
export async function GET() {
  const startTime = Date.now();
  const health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    checks: {
      database: 'ok' | 'error';
      responseTime: number;
    };
    version: string;
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'ok',
      responseTime: 0,
    },
    version: process.env.npm_package_version || '0.1.0',
  };

  try {
    // Check database connection
    const supabase = await createClient();
    const { error } = await supabase.from('site_settings').select('id').eq('id', 'main').limit(1).single();

    if (error) {
      health.status = 'degraded';
      health.checks.database = 'error';
    }

    health.checks.responseTime = Date.now() - startTime;

    // If database check failed, mark as degraded (not unhealthy, as app might still work)
    const statusCode = health.status === 'healthy' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.database = 'error';
    health.checks.responseTime = Date.now() - startTime;

    return NextResponse.json(health, { status: 503 });
  }
}



