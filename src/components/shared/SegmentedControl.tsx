'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SegmentedControlItem = {
  key: string;
  label: string;
  active: boolean;
  href?: string;
  onClick?: () => void;
};

type SegmentedControlProps = {
  items: SegmentedControlItem[];
  className?: string;
  buttonClassName?: string;
  size?: 'sm' | 'default';
  activeVariant?: 'default' | 'outline';
  inactiveVariant?: 'ghost' | 'outline';
};

export function SegmentedControl({
  items,
  className,
  buttonClassName,
  size = 'sm',
  activeVariant = 'default',
  inactiveVariant = 'ghost',
}: SegmentedControlProps) {
  return (
    <div className={cn('flex flex-wrap rounded-lg border border-border/60 p-1', className)}>
      {items.map((item) => {
        const variant = item.active ? activeVariant : inactiveVariant;

        if (item.href) {
          return (
            <Button key={item.key} asChild size={size} variant={variant} className={cn('h-8', buttonClassName)}>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          );
        }

        return (
          <Button
            key={item.key}
            type="button"
            size={size}
            variant={variant}
            className={cn('h-8', buttonClassName)}
            onClick={item.onClick}
          >
            {item.label}
          </Button>
        );
      })}
    </div>
  );
}
