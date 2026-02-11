'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlayCircle, ShieldCheck, AlertTriangle, XCircle } from 'lucide-react';
import { runAdminDiagnostics, type DiagnosticsResult } from '@/app/actions/diagnostics';

export default function AdminDiagnosticsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runChecks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await runAdminDiagnostics();
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to run diagnostics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Diagnostics</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Manual checks for DB initialization and required keys. Runs only on button click.
        </p>
      </div>

      <Card className="rounded-3xl border-0 shadow-xl bg-white/50 dark:bg-slate-900/50">
        <CardHeader>
          <CardTitle>System Check</CardTitle>
          <CardDescription>No automatic execution on page load.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runChecks} disabled={loading} className="rounded-xl font-bold">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
            Run checks
          </Button>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm font-medium">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className={result.ok ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}>
                  {result.ok ? 'PASS' : 'FAIL'}
                </Badge>
                <span className="text-xs text-muted-foreground">Last run: {new Date(result.ranAt).toLocaleString()}</span>
              </div>

              <div className="space-y-2">
                {result.checks.map((check) => (
                  <div key={check.name} className="flex items-start justify-between gap-4 rounded-xl border border-border/50 p-3">
                    <div className="space-y-1">
                      <p className="text-sm font-bold">{check.name}</p>
                      <p className="text-xs text-muted-foreground">{check.message}</p>
                      {check.details && <p className="text-xs text-muted-foreground/80">{check.details}</p>}
                    </div>
                    <div>
                      {check.status === 'ok' && <ShieldCheck className="h-5 w-5 text-emerald-500" />}
                      {check.status === 'warn' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                      {check.status === 'error' && <XCircle className="h-5 w-5 text-rose-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

