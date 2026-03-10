'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const createErrors = (createState.errors || {}) as Record<string, string[] | undefined>;

  useEffect(() => {
    if (createState.status === 'success') {
      toast({ title: 'Succes', description: createState.message });
      router.refresh();
      return;
    }
    if (createState.status === 'error') {
      toast({ title: 'Erreur', description: createState.message, variant: 'destructive' });
    }
  }, [createState, toast, router]);

  useEffect(() => {
    if (retractState.status === 'success') {
      toast({ title: 'Succes', description: retractState.message });
      router.refresh();
      return;
    }
    if (retractState.status === 'error') {
      toast({ title: 'Erreur', description: retractState.message, variant: 'destructive' });
    }
  }, [retractState, toast, router]);

  if (existingResponse?.status === 'active') {
    return (
      <Card className="rounded-2xl" id="respond-form">
        <CardHeader>
          <CardTitle>Votre reponse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Vous avez deja propose votre aide pour cette demande.</p>
          <form action={retractAction}>
            <input type="hidden" name="demandResponseId" value={existingResponse.id} />
            <Button type="submit" variant="outline" className="w-full rounded-xl">
              Retirer ma reponse
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl" id="respond-form">
      <CardHeader>
        <CardTitle>Proposer un parrainage</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createAction} className="space-y-4">
          <input type="hidden" name="demandListingId" value={demandListingId} />
          <div className="space-y-2">
            <Label htmlFor="message">Votre message</Label>
            <Textarea
              id="message"
              name="message"
              required
              minLength={20}
              maxLength={2000}
              className="min-h-[120px]"
              placeholder="Decrivez comment vous pouvez aider ce candidat (process interne, recommandations, timing...)."
            />
            {createErrors.message?.[0] ? (
              <p className="text-xs text-destructive">{createErrors.message[0]}</p>
            ) : null}
          </div>
          <Button type="submit" className="w-full rounded-xl">
            Envoyer ma reponse
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
