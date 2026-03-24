'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, MapPin, Sparkles, Store, Users } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function ClaimBlockedState({
  title,
  description,
  helpText,
  backLabel,
  contactLabel,
}: {
  title: string;
  description: string;
  helpText: string;
  backLabel: string;
  contactLabel: string;
}) {
  return (
    <Card className="max-w-lg mx-auto mt-12">
      <CardHeader>
        <CardTitle className="text-center text-destructive">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <Alert className="bg-destructive/10 border-destructive/30">
          <AlertDescription className="text-destructive">{description}</AlertDescription>
        </Alert>
        <p className="text-muted-foreground">{helpText}</p>
        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button variant="outline" asChild>
            <Link href="/claim">{backLabel}</Link>
          </Button>
          <Button asChild>
            <Link href="/contact">{contactLabel}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClaimProgressHeader({
  step,
  backLabel,
  title,
  subtitle,
  steps,
}: {
  step: number;
  backLabel: string;
  title: string;
  subtitle: string;
  steps: Array<{ step: number; label: string; icon: React.ComponentType<{ className?: string }> }>;
}) {
  return (
    <>
      <div className="mb-10 text-center md:text-left">
        <Link href="/claim" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-4 group">
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          {backLabel}
        </Link>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          {title}
        </h1>
        <p className="text-muted-foreground mt-2 text-lg italic">{subtitle}</p>
      </div>

      <div className="relative mb-12 px-2">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 -z-10" />
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 -z-10 transition-all duration-500 ease-in-out"
          style={{ width: `${(step - 1) * 33.33}%` }}
        />
        <div className="flex justify-between">
          {steps.map((item) => (
            <div key={item.step} className="flex flex-col items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 md:w-12 md:h-12 rounded-full border-4 flex items-center justify-center transition-all duration-300 shadow-sm',
                  step > item.step
                    ? 'bg-primary border-primary text-white'
                    : step === item.step
                      ? 'bg-white border-primary text-primary scale-110 ring-4 ring-primary/20'
                      : 'bg-white border-gray-100 text-gray-400',
                )}
              >
                {step > item.step ? <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6" /> : <item.icon className="h-5 w-5 md:h-6 md:w-6" />}
              </div>
              <span
                className={cn(
                  'text-[9px] md:text-xs font-bold uppercase tracking-wider transition-colors text-center max-w-[80px]',
                  step >= item.step ? 'text-primary' : 'text-gray-400',
                )}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function ClaimBenefitsSidebar({
  title,
  badgeTitle,
  badgeDescription,
  controlTitle,
  controlDescription,
  convertTitle,
  convertDescription,
  launchOfferLabel,
  launchOfferDescription,
  helpLabel,
  supportLabel,
  supportCta,
}: {
  title: string;
  badgeTitle: string;
  badgeDescription: string;
  controlTitle: string;
  controlDescription: string;
  convertTitle: string;
  convertDescription: string;
  launchOfferLabel: string;
  launchOfferDescription: string;
  helpLabel: string;
  supportLabel: string;
  supportCta: string;
}) {
  return (
    <div className="lg:col-span-4 space-y-6">
      <Card className="border-primary/20 shadow-lg overflow-hidden sticky top-8">
        <div className="bg-primary/5 p-4 border-b border-primary/10">
          <h3 className="font-bold flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            {title}
          </h3>
        </div>
        <CardContent className="p-6 space-y-6">
          <div className="flex gap-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 h-fit">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-sm">{badgeTitle}</p>
              <p className="text-xs text-muted-foreground">{badgeDescription}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600 h-fit">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-sm">{controlTitle}</p>
              <p className="text-xs text-muted-foreground">{controlDescription}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="p-2 bg-green-50 rounded-lg text-green-600 h-fit">
              <Store className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-sm">{convertTitle}</p>
              <p className="text-xs text-muted-foreground">{convertDescription}</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="bg-blue-900 rounded-xl p-4 text-white shadow-inner">
              <p className="text-[10px] uppercase font-bold tracking-widest text-blue-200 mb-1">{launchOfferLabel}</p>
              <p className="text-sm font-bold">{launchOfferDescription}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 rounded-xl border border-dashed text-center space-y-2">
        <p className="text-[10px] text-muted-foreground">{helpLabel}</p>
        <p className="text-xs font-bold">{supportLabel}</p>
        <Button variant="link" size="sm" asChild>
          <Link href="/contact">{supportCta}</Link>
        </Button>
      </div>
    </div>
  );
}

export function ClaimLoadingFallback({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export const CLAIM_PROGRESS_ICONS = {
  business: Store,
  benefits: Sparkles,
  identity: Users,
  validation: CheckCircle2,
};
