'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
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

type BusinessOption = {
  id: string;
  name: string;
  city: string;
};

export function OfferCreateForm({ businessOptions }: { businessOptions: BusinessOption[] }) {
  const [state, formAction] = useActionState(createReferralOffer, initialState);
  const { toast } = useToast();
  const router = useRouter();
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [manualCompanyName, setManualCompanyName] = useState('');
  const [manualCity, setManualCity] = useState('');

  const selectedBusiness = useMemo(
    () => businessOptions.find((b) => b.id === selectedBusinessId) || null,
    [businessOptions, selectedBusinessId]
  );

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

  const fieldErrors = (state.errors || {}) as Record<string, string[] | undefined>;
  const fieldError = (name: string) => fieldErrors[name]?.[0];

  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="businessId">Entreprise (selection recommandee)</Label>
            <select
              id="businessId"
              name="businessId"
              value={selectedBusinessId}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Autre entreprise (saisie manuelle)</option>
              {businessOptions.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}{business.city ? ` - ${business.city}` : ''}
                </option>
              ))}
            </select>
            {fieldError('businessId') && <p className="text-xs text-destructive">{fieldError('businessId')}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Entreprise</Label>
              <Input
                id="companyName"
                name="companyName"
                required
                value={selectedBusiness?.name ?? manualCompanyName}
                onChange={(e) => setManualCompanyName(e.target.value)}
                readOnly={!!selectedBusiness}
              />
              {selectedBusiness && <p className="text-xs text-muted-foreground">Nom synchronise depuis la fiche entreprise.</p>}
              {fieldError('companyName') && <p className="text-xs text-destructive">{fieldError('companyName')}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Poste</Label>
              <Input id="jobTitle" name="jobTitle" required />
              {fieldError('jobTitle') && <p className="text-xs text-destructive">{fieldError('jobTitle')}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                name="city"
                value={selectedBusiness?.city ?? manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                readOnly={!!selectedBusiness}
              />
              {fieldError('city') && <p className="text-xs text-destructive">{fieldError('city')}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractType">Contrat</Label>
              <select id="contractType" name="contractType" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
                <option value="">Selectionner</option>
                <option value="cdi">CDI</option>
                <option value="cdd">CDD</option>
                <option value="stage">Stage</option>
                <option value="freelance">Freelance</option>
                <option value="alternance">Alternance</option>
                <option value="autre">Autre</option>
              </select>
              {fieldError('contractType') && <p className="text-xs text-destructive">{fieldError('contractType')}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="workMode">Mode</Label>
              <select id="workMode" name="workMode" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
                <option value="">Selectionner</option>
                <option value="onsite">Presentiel</option>
                <option value="hybrid">Hybride</option>
                <option value="remote">Remote</option>
              </select>
              {fieldError('workMode') && <p className="text-xs text-destructive">{fieldError('workMode')}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="seniority">Niveau</Label>
              <select id="seniority" name="seniority" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
                <option value="">Selectionner</option>
                <option value="junior">Junior</option>
                <option value="confirme">Confirme</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
                <option value="manager">Manager</option>
                <option value="autre">Autre</option>
              </select>
              {fieldError('seniority') && <p className="text-xs text-destructive">{fieldError('seniority')}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description de l&apos;offre</Label>
            <Textarea
              id="description"
              name="description"
              required
              className="min-h-[140px]"
              placeholder="Expliquez le contexte, l equipe, et ce que vous attendez du candidat."
            />
            {fieldError('description') && <p className="text-xs text-destructive">{fieldError('description')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirements">Exigences (optionnel)</Label>
            <Textarea id="requirements" name="requirements" className="min-h-[90px]" />
            {fieldError('requirements') && <p className="text-xs text-destructive">{fieldError('requirements')}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slots">Nombre de places</Label>
              <Input id="slots" name="slots" type="number" min="1" max="10" defaultValue="1" />
              {fieldError('slots') && <p className="text-xs text-destructive">{fieldError('slots')}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="expiresAt">Expiration (optionnel)</Label>
              <Input id="expiresAt" name="expiresAt" type="datetime-local" />
              {fieldError('expiresAt') && <p className="text-xs text-destructive">{fieldError('expiresAt')}</p>}
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
