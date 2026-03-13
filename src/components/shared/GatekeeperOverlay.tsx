'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { SoftAuthDialog } from '@/components/auth/SoftAuthDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type GatekeeperOverlayProps = {
  active: boolean;
  children: React.ReactNode;
  nextPath?: string;
  intent?: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
  contentClassName?: string;
  overlayClassName?: string;
};

export function GatekeeperOverlay({
  active,
  children,
  nextPath,
  intent,
  title,
  description,
  ctaLabel = 'Unlock',
  ctaHref,
  className,
  contentClassName,
  overlayClassName,
}: GatekeeperOverlayProps) {
  const [open, setOpen] = useState(false);
  const canOpenAuthDialog = Boolean(nextPath);

  if (!active) {
    return <div className={className}>{children}</div>;
  }

  return (
    <>
      <div className={cn('relative overflow-hidden', className)}>
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none select-none blur-[3px] opacity-55 saturate-75 transition-all',
            contentClassName
          )}
        >
          {children}
        </div>
        <div
          className={cn(
            'absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-b from-background/20 via-background/50 to-background/80 p-4',
            overlayClassName
          )}
        >
          <Card className="w-full max-w-sm rounded-3xl border-border/70 bg-background/95 shadow-2xl">
            <CardHeader className="space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">{description}</p>
              {ctaHref ? (
                <Button asChild className="w-full rounded-xl">
                  <Link href={ctaHref}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {ctaLabel}
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  className="w-full rounded-xl"
                  onClick={() => setOpen(true)}
                  disabled={!canOpenAuthDialog}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {ctaLabel}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {canOpenAuthDialog && nextPath && (
        <SoftAuthDialog
          open={open}
          onOpenChange={setOpen}
          nextPath={nextPath}
          intent={intent}
          title={title}
          description={description}
        />
      )}
    </>
  );
}
