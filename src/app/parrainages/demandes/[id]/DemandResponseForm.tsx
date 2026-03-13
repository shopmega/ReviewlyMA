'use client';

import { useActionState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  createReferralDemandResponse,
  retractReferralDemandResponse,
} from '@/app/actions/referrals';
import type { ActionState } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/components/providers/i18n-provider';

const INITIAL_STATE: ActionState = { status: 'idle', message: '' };

type ExistingResponse = {
  id: string;
  status: string;
} | null;

type Props = {
  demandListingId: string;
  existingResponse: ExistingResponse;
};

export function DemandResponseForm({ demandListingId, existingResponse }: Props) {
  const [createState, createAction] = useActionState(createReferralDemandResponse, INITIAL_STATE);
  const [retractState, retractAction] = useActionState(retractReferralDemandResponse, INITIAL_STATE);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const createErrors = (createState.errors || {}) as Record<string, string[] | undefined>;
  const createAuthRequired = Boolean(
    createState.data &&
    typeof createState.data === 'object' &&
    'authRequired' in createState.data &&
    (createState.data as { authRequired?: boolean }).authRequired
  );
  const retractAuthRequired = Boolean(
    retractState.data &&
    typeof retractState.data === 'object' &&
    'authRequired' in retractState.data &&
    (retractState.data as { authRequired?: boolean }).authRequired
  );

  useEffect(() => {
    if (createState.status === 'success') {
      toast({
        title: t('referralDemandDetailPage.form.toasts.successTitle', 'Success'),
        description: createState.message,
      });
      router.refresh();
      return;
    }
    if (createState.status === 'error') {
      if (createAuthRequired) {
        const currentQuery = searchParams.toString();
        const nextPath = `${currentQuery ? `${pathname}?${currentQuery}` : pathname}#respond-form`;
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      toast({
        title: t('referralDemandDetailPage.form.toasts.errorTitle', 'Error'),
        description: createState.message,
        variant: 'destructive',
      });
    }
  }, [createState, toast, router, t, createAuthRequired, pathname, searchParams]);

  useEffect(() => {
    if (retractState.status === 'success') {
      toast({
        title: t('referralDemandDetailPage.form.toasts.successTitle', 'Success'),
        description: retractState.message,
      });
      router.refresh();
      return;
    }
    if (retractState.status === 'error') {
      if (retractAuthRequired) {
        const currentQuery = searchParams.toString();
        const nextPath = `${currentQuery ? `${pathname}?${currentQuery}` : pathname}#respond-form`;
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      toast({
        title: t('referralDemandDetailPage.form.toasts.errorTitle', 'Error'),
        description: retractState.message,
        variant: 'destructive',
      });
    }
  }, [retractState, toast, router, t, retractAuthRequired, pathname, searchParams]);

  if (existingResponse?.status === 'active') {
    return (
      <Card className="rounded-2xl" id="respond-form">
        <CardHeader>
          <CardTitle>{t('referralDemandDetailPage.form.active.title', 'Your response')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{t('referralDemandDetailPage.form.active.description', 'You have already offered help for this demand.')}</p>
          <form action={retractAction}>
            <input type="hidden" name="demandResponseId" value={existingResponse.id} />
            <Button type="submit" variant="outline" className="w-full rounded-xl">
              {t('referralDemandDetailPage.form.active.retractCta', 'Withdraw my response')}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl" id="respond-form">
      <CardHeader>
        <CardTitle>{t('referralDemandDetailPage.form.create.title', 'Propose a referral')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createAction} className="space-y-4">
          <input type="hidden" name="demandListingId" value={demandListingId} />
          <div className="space-y-2">
            <Label htmlFor="message">{t('referralDemandDetailPage.form.create.messageLabel', 'Your message')}</Label>
            <Textarea
              id="message"
              name="message"
              required
              minLength={20}
              maxLength={2000}
              className="min-h-[120px]"
              placeholder={t(
                'referralDemandDetailPage.form.create.messagePlaceholder',
                'Describe how you can help this candidate (internal process, referrals, timing...).'
              )}
            />
            {createErrors.message?.[0] ? (
              <p className="text-xs text-destructive">{createErrors.message[0]}</p>
            ) : null}
          </div>
          <Button type="submit" className="w-full rounded-xl">
            {t('referralDemandDetailPage.form.create.submitCta', 'Send my response')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
