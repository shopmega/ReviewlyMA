'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertCircle, Play, RotateCcw, ExternalLink } from 'lucide-react';

export default function GATestingPageClient() {
  const [checks, setChecks] = useState({
    envVar: false,
    gtagFunction: false,
    dataLayer: false,
    scriptLoaded: false,
    eventsWorking: false,
  });

  const [gaId, setGaId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const addTestResult = (message: string) => {
    setTestResults((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const runAllTests = () => {
    setIsTesting(true);
    setTestResults([]);

    setChecks({
      envVar: false,
      gtagFunction: false,
      dataLayer: false,
      scriptLoaded: false,
      eventsWorking: false,
    });

    const envGaId =
      process.env.NEXT_PUBLIC_GA_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
    setGaId(envGaId || null);
    const envCheck = !!envGaId;
    setChecks((prev) => ({ ...prev, envVar: envCheck }));
    addTestResult(
      envCheck
        ? `Environment Variable: Found GA ID ${envGaId}`
        : 'Environment Variable: NEXT_PUBLIC_GA_ID / NEXT_PUBLIC_GOOGLE_ANALYTICS_ID not found'
    );

    setTimeout(() => {
      const gtagAvailable = typeof (window as any).gtag !== 'undefined';
      setChecks((prev) => ({ ...prev, gtagFunction: gtagAvailable }));
      addTestResult(gtagAvailable ? 'gtag function: Available' : 'gtag function: Not available');

      const dataLayerExists = !!(window as any).dataLayer;
      setChecks((prev) => ({ ...prev, dataLayer: dataLayerExists }));
      addTestResult(
        dataLayerExists
          ? `dataLayer: Exists with ${((window as any).dataLayer || []).length} items`
          : 'dataLayer: Does not exist'
      );

      const gaScripts = document.querySelectorAll('script[src*="googletagmanager.com"]');
      const scriptCheck = gaScripts.length > 0;
      setChecks((prev) => ({ ...prev, scriptLoaded: scriptCheck }));
      if (scriptCheck) {
        addTestResult(`GA Scripts: Found ${gaScripts.length} script(s)`);
      } else {
        addTestResult('GA Scripts: No Google Analytics scripts found');
      }

      if (gtagAvailable) {
        try {
          (window as any).gtag('event', 'test_event', {
            test_parameter: 'test_value',
            timestamp: new Date().toISOString(),
          });
          setChecks((prev) => ({ ...prev, eventsWorking: true }));
          addTestResult('Event Tracking: Successfully sent test event');
        } catch (error) {
          setChecks((prev) => ({ ...prev, eventsWorking: false }));
          addTestResult(`Event Tracking: Failed to send event - ${error}`);
        }
      } else {
        addTestResult('Event Tracking: Cannot test - gtag not available');
      }

      setIsTesting(false);
    }, 1000);
  };

  useEffect(() => {
    runAllTests();
  }, []);

  const getStatusBadge = (passed: boolean) => {
    if (passed) {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Passed
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-4xl">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Google Analytics Testing Dashboard</h1>
        <p className="text-muted-foreground">Comprehensive testing suite for GA4 implementation verification</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Implementation Status
          </CardTitle>
          <CardDescription>Overall health check of Google Analytics integration</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <span className="font-medium">Environment Config</span>
            {getStatusBadge(checks.envVar)}
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <span className="font-medium">gtag Function</span>
            {getStatusBadge(checks.gtagFunction)}
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <span className="font-medium">Data Layer</span>
            {getStatusBadge(checks.dataLayer)}
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <span className="font-medium">Script Loading</span>
            {getStatusBadge(checks.scriptLoaded)}
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <span className="font-medium">Event Tracking</span>
            {getStatusBadge(checks.eventsWorking)}
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <span className="font-medium">Overall Health</span>
            {getStatusBadge(Object.values(checks).every(Boolean))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4 justify-center">
        <Button onClick={runAllTests} disabled={isTesting} className="px-8 py-6 text-lg">
          {isTesting ? (
            <>
              <RotateCcw className="w-5 h-5 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Run All Tests
            </>
          )}
        </Button>

        <Button variant="outline" asChild className="px-8 py-6 text-lg">
          <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-5 h-5 mr-2" />
            Open GA Dashboard
          </a>
        </Button>
      </div>

      {gaId && (
        <Card>
          <CardHeader>
            <CardTitle>Current GA Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="font-mono text-lg font-bold">
                Measurement ID: <span className="text-primary">{gaId}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Test Results &amp; Debug Output</CardTitle>
          <CardDescription>Detailed logs from all verification tests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.length > 0 ? (
              testResults.map((result, index) => (
                <div key={index} className="mb-1 last:mb-0">
                  {result}
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">Click "Run All Tests" to start verification...</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-bold text-lg mb-2">Common Issues:</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>Missing Environment Variable:</strong> Add NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX (or legacy
                NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) to .env.local
              </li>
              <li>
                <strong>Wrong GA Property Type:</strong> Must use GA4 (G-XXXXXXXXXX), not Universal Analytics
                (UA-XXXXXXXXX)
              </li>
              <li>
                <strong>Domain Not Whitelisted:</strong> Check GA property settings for allowed domains
              </li>
              <li>
                <strong>Ad Blockers:</strong> Test in incognito/private browsing mode
              </li>
              <li>
                <strong>Data Processing Delay:</strong> Real-time data appears instantly, standard reports take 24-48
                hours
              </li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-bold text-lg mb-2">Quick Fixes:</h3>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Verify GA4 Measurement ID format (starts with G-)</li>
              <li>Check .env.local contains NEXT_PUBLIC_GA_ID (or NEXT_PUBLIC_GOOGLE_ANALYTICS_ID)</li>
              <li>Restart development server after adding environment variables</li>
              <li>Test in private browsing mode to bypass ad blockers</li>
              <li>Enable Enhanced Measurement in GA4 property settings</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
