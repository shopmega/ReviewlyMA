'use client';

import type { ComponentProps, ReactNode } from 'react';
import Link from 'next/link';
import { analytics } from '@/lib/analytics';
import { Button } from '@/components/ui/button';

type Props = {
  href: string;
  ctaId: string;
  placement: string;
  context: string;
  businessId?: string | null;
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
  className?: string;
  children: ReactNode;
};

export function TrackedActionButton({
  href,
  ctaId,
  placement,
  context,
  businessId,
  variant = 'default',
  size = 'default',
  className,
  children,
}: Props) {
  return (
    <Button variant={variant} size={size} asChild className={className}>
      <Link
        href={href}
        onClick={() => {
          analytics.trackCtaClick(ctaId, placement, context, undefined, undefined, businessId || undefined);
        }}
      >
        {children}
      </Link>
    </Button>
  );
}
