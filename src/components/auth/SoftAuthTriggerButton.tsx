'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SoftAuthDialog } from '@/components/auth/SoftAuthDialog';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

type SoftAuthTriggerButtonProps = {
  label: string;
  nextPath: string;
  intent: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  title?: string;
  description?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>;

export function SoftAuthTriggerButton({
  label,
  nextPath,
  intent,
  variant = 'default',
  size = 'default',
  className,
  title,
  description,
  ...buttonProps
}: SoftAuthTriggerButtonProps) {
  const [open, setOpen] = useState(false);
  const handleClick: NonNullable<ButtonHTMLAttributes<HTMLButtonElement>['onClick']> = (event) => {
    buttonProps.onClick?.(event);
    if (!event.defaultPrevented) {
      setOpen(true);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        {...buttonProps}
        onClick={handleClick}
      >
        {label}
      </Button>
      <SoftAuthDialog
        open={open}
        onOpenChange={setOpen}
        nextPath={nextPath}
        intent={intent}
        title={title}
        description={description}
      />
    </>
  );
}
