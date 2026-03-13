'use client';

import { useActionState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { sendReferralMessage } from '@/app/actions/referrals';
import type { ActionState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const INITIAL_STATE: ActionState = { status: 'idle', message: '' };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" isLoading={pending}>
      {label}
    </Button>
  );
}

type ReferralConversationComposerProps = {
  requestId: string;
  placeholder: string;
  submitLabel: string;
};

export function ReferralConversationComposer({
  requestId,
  placeholder,
  submitLabel,
}: ReferralConversationComposerProps) {
  const [state, formAction] = useActionState(sendReferralMessage, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement | null>(null);
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
      toast({ title: 'Succes', description: state.message });
      formRef.current?.reset();
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
        title: 'Erreur',
        description: state.message,
        variant: 'destructive',
      });
    }
  }, [state, toast, router, authRequired, pathname, searchParams]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="requestId" value={requestId} />
      <textarea
        name="message"
        required
        minLength={2}
        className="min-h-[72px] w-full rounded-md border bg-background px-3 py-2 text-sm"
        placeholder={placeholder}
      />
      <div className="flex justify-end">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
