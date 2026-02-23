'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createReferralOffer } from '@/app/actions/referrals';
import type { ActionState } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const initialState: ActionState = { status: 'idle', message: '' };

export function OfferCreateForm() {
  const [state, formAction] = useActionState(createReferralOffer, initialState);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Succes', description: state.message });
      if (state.data?.id) {
        router.push(`/parrainages/${state.data.id}`);
      } else {
        router.push('/parrainages');
      }
      return;
    }
    if (state.status === 'error') {
      toast({ title: 'Erreur', description: state.message, variant: 'destructive' });
    }
  }, [state, toast, router]);

  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Entreprise</Label>
              <Input id="companyName" name="companyName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Poste</Label>
              <Input id="jobTitle" name="jobTitle" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input id="city" name="city" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractType">Contrat</Label>
              <Input id="contractType" name="contractType" placeholder="CDI, CDD, Stage..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workMode">Mode</Label>
              <Input id="workMode" name="workMode" placeholder="Presentiel, Hybride..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seniority">Niveau</Label>
              <Input id="seniority" name="seniority" placeholder="Junior, Senior..." />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description de l&apos;offre</Label>
            <Textarea id="description" name="description" required className="min-h-[140px]" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirements">Exigences (optionnel)</Label>
            <Textarea id="requirements" name="requirements" className="min-h-[90px]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slots">Nombre de places</Label>
              <Input id="slots" name="slots" type="number" min="1" max="20" defaultValue="1" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="expiresAt">Expiration (optionnel)</Label>
              <Input id="expiresAt" name="expiresAt" type="datetime-local" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="rounded-xl">Publier mon offre</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
