import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type PageIntroProps = {
  badge?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function PageIntro({
  badge,
  title,
  description,
  actions,
  meta,
  children,
  className,
}: PageIntroProps) {
  return (
    <section className={cn('rounded-2xl border border-border bg-card p-6 md:p-8', className)}>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          {typeof badge === 'string' ? <Badge variant="outline" className="w-fit">{badge}</Badge> : badge}
          <h1 className="text-3xl md:text-4xl font-bold font-headline">{title}</h1>
          {description ? <p className="max-w-3xl text-muted-foreground">{description}</p> : null}
          {meta}
          {children}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
