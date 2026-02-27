'use client';

import { useActionState, useEffect } from 'react';
import Link from 'next/link';
import { blockReferralUser, reportReferralOffer, retractReferralOffer } from '@/app/actions/referrals';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ActionState } from '@/lib/types';

const INITIAL_STATE: ActionState = { status: 'idle', message: '' };

type Props = {
  offerId: string;
  ownerId: string;
  isOwner: boolean;
  isAuthenticated: boolean;
};

export function SafetyActions({ offerId, ownerId, isOwner, isAuthenticated }: Props) {
  const [reportState, reportAction] = useActionState(reportReferralOffer, INITIAL_STATE);
  const [blockState, blockAction] = useActionState(blockReferralUser, INITIAL_STATE);
  const [retractState, retractAction] = useActionState(retractReferralOffer, INITIAL_STATE);
  const { toast } = useToast();

  useEffect(() => {
    if (reportState.status !== 'idle') {
      toast({
        title: reportState.status === 'success' ? 'Signalement' : 'Erreur',
        description: reportState.message,
        variant: reportState.status === 'error' ? 'destructive' : undefined,
      });
    }
  }, [reportState, toast]);

  useEffect(() => {
    if (blockState.status !== 'idle') {
      toast({
        title: blockState.status === 'success' ? 'Blocage' : 'Erreur',
        description: blockState.message,
        variant: blockState.status === 'error' ? 'destructive' : undefined,
      });
    }
  }, [blockState, toast]);

  useEffect(() => {
    if (retractState.status !== 'idle') {
      toast({
        title: retractState.status === 'success' ? 'Offre mise a jour' : 'Erreur',
        description: retractState.message,
        variant: retractState.status === 'error' ? 'destructive' : undefined,
      });
    }
  }, [retractState, toast]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">Securite et moderation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Rappel: aucun paiement n&apos;est autorise. Gardez les echanges sur la plateforme.
        </p>

        {!isAuthenticated ? (
          <Button asChild variant="outline" className="w-full rounded-xl">
            <Link href={`/login?next=/parrainages/${offerId}`}>Se connecter pour signaler ou bloquer</Link>
          </Button>
        ) : null}

        {isAuthenticated && !isOwner ? (
          <>
            <form action={reportAction} className="space-y-2">
              <input type="hidden" name="offerId" value={offerId} />
              <label className="text-xs text-muted-foreground" htmlFor="report-reason">Signaler cette offre</label>
              <select
                id="report-reason"
                name="reason"
                required
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                defaultValue="scam"
              >
                <option value="scam">Arnaque suspectee</option>
                <option value="payment_request">Demande d&apos;argent</option>
                <option value="impersonation">Usurpation d&apos;identite</option>
                <option value="off_platform">Canal externe impose</option>
                <option value="spam">Spam</option>
                <option value="other">Autre</option>
              </select>
              <textarea
                name="details"
                className="min-h-[72px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Donnez un contexte utile (optionnel)."
              />
              <Button type="submit" variant="outline" className="w-full rounded-xl">Envoyer le signalement</Button>
            </form>

            <form action={blockAction} className="space-y-2">
              <input type="hidden" name="offerId" value={offerId} />
              <input type="hidden" name="blockedUserId" value={ownerId} />
              <input type="hidden" name="reason" value="blocked_from_offer_detail" />
              <Button type="submit" variant="destructive" className="w-full rounded-xl">Bloquer cet auteur</Button>
            </form>
          </>
        ) : null}

        {isOwner ? (
          <form action={retractAction} className="space-y-2">
            <input type="hidden" name="offerId" value={offerId} />
            <Button type="submit" variant="destructive" className="w-full rounded-xl">Retirer cette offre</Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
