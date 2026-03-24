import type { LucideIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type MetricCardProps = {
  title: string;
  value: string;
  icon?: LucideIcon;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  valueClassName?: string;
  iconWrapClassName?: string;
  iconClassName?: string;
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  className,
  headerClassName,
  titleClassName,
  valueClassName,
  iconWrapClassName,
  iconClassName,
}: MetricCardProps) {
  return (
    <Card className={cn('rounded-2xl', className)}>
      <CardHeader className={cn('pb-2', headerClassName)}>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className={cn('inline-flex items-center gap-2 text-sm text-muted-foreground', titleClassName)}>
            {title}
          </CardTitle>
          {Icon ? (
            <div className={cn('rounded-lg p-2', iconWrapClassName)}>
              <Icon className={cn('h-4 w-4', iconClassName)} />
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn('text-3xl font-bold font-headline', valueClassName)}>{value}</div>
      </CardContent>
    </Card>
  );
}
