'use client';

import { useState, useTransition } from 'react';
import { Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  toggleSalaryAlertSubscription,
  type SalaryAlertScope,
  type SalaryAlertTarget,
} from '@/app/actions/salary-alerts';

type SalaryAlertToggleButtonProps = {
  scope: SalaryAlertScope;
  target: SalaryAlertTarget;
  pathToRevalidate: string;
  initialIsSubscribed: boolean;
  className?: string;
};

export function SalaryAlertToggleButton({
  scope,
  target,
  pathToRevalidate,
  initialIsSubscribed,
  className,
}: SalaryAlertToggleButtonProps) {
  const [isSubscribed, setIsSubscribed] = useState(initialIsSubscribed);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleToggle = () => {
    const next = !isSubscribed;
    setIsSubscribed(next);

    startTransition(async () => {
      const result = await toggleSalaryAlertSubscription(scope, target, pathToRevalidate);
      if (result.status === 'error') {
        setIsSubscribed(!next);
        toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
        return;
      }
      toast({
        title: next ? 'Alerte activee' : 'Alerte desactivee',
        description: next
          ? 'Vous serez notifie en cas de mise a jour salaire.'
          : 'Vous ne recevrez plus de notification pour cette cible.',
      });
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={handleToggle}
      className={cn(
        'gap-2',
        isSubscribed ? 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10' : '',
        className
      )}
    >
      <Bell className={cn('h-4 w-4', isSubscribed ? 'fill-current' : '')} />
      <span>{isSubscribed ? 'Alerte activee' : 'Suivre les mises a jour'}</span>
    </Button>
  );
}

