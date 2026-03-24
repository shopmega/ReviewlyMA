'use client';

import type { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type AppEmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  align?: 'left' | 'center';
};

export function AppEmptyState({
  icon,
  title,
  description,
  action,
  className,
  contentClassName,
  align = 'center',
}: AppEmptyStateProps) {
  const centered = align === 'center';

  return (
    <Card className={cn('border-dashed bg-card/40', className)}>
      <CardHeader className={cn(centered ? 'items-center text-center' : '')}>
        {icon ? <div className={cn('mb-2 inline-flex rounded-full bg-muted p-4', centered ? '' : 'w-fit')}>{icon}</div> : null}
        <CardTitle className={cn('font-headline', centered ? 'text-xl' : 'text-lg')}>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {action ? <CardContent className={cn(centered ? 'flex justify-center pt-0' : 'pt-0', contentClassName)}>{action}</CardContent> : null}
    </Card>
  );
}
