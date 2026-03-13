'use client';

import { useActionState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ActionState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const INITIAL_STATE: ActionState = { status: 'idle', message: '' };

type ReferralMutationButtonProps = {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  label: string;
  successTitle?: string;
  errorTitle?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
};

export function ReferralMutationButton({
  action,
  fields,
  label,
  successTitle = 'Succes',
  errorTitle = 'Erreur',
  variant = 'default',
  size = 'sm',
  className,
  disabled = false,
}: ReferralMutationButtonProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const authRequired = Boolean(
    state.data &&
    typeof state.data === 'object' &&
    'authRequired' in state.data &&
    (state.data as { authRequired?: boolean }).authRequired
  );

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: successTitle, description: state.message });
      router.refresh();
      return;
    }

    if (state.status === 'error') {
      if (authRequired) {
        const currentQuery = searchParams.toString();
        const nextPath = currentQuery ? `${pathname}?${currentQuery}` : pathname;
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      toast({
        title: errorTitle,
        description: state.message,
        variant: 'destructive',
      });
    }
  }, [state, toast, router, authRequired, pathname, searchParams, successTitle, errorTitle]);

  return (
    <form action={formAction}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" size={size} variant={variant} className={className} disabled={disabled} isLoading={pending}>
        {label}
      </Button>
    </form>
  );
}
