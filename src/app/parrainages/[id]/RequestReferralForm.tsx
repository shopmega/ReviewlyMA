'use client';

import { useActionState, useEffect } from 'react';
import { requestReferral } from '@/app/actions/referrals';
import type { ActionState } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const initialState: ActionState = { status: 'idle', message: '' };

export function RequestReferralForm({ offerId }: { offerId: string }) {
  const [state, formAction] = useActionState(requestReferral, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Succes', description: state.message });
      return;
    }
    if (state.status === 'error') {
      toast({ title: 'Erreur', description: state.message, variant: 'destructive' });
    }
  }, [state, toast]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Demander un parrainage</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="offerId" value={offerId} />
          <div className="space-y-2">
            <Label htmlFor="message">Votre message</Label>
            <Textarea
              id="message"
              name="message"
              required
              className="min-h-[120px]"
              placeholder="Presentez votre profil, experience et motivation..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cvUrl">Lien CV (optionnel)</Label>
            <Input id="cvUrl" name="cvUrl" placeholder="https://..." />
          </div>
          <Button type="submit" className="rounded-xl">Envoyer ma demande</Button>
        </form>
      </CardContent>
    </Card>
  );
}
