'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createReferralDemandListing } from '@/app/actions/referrals';
import type { ActionState } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const initialState: ActionState = { status: 'idle', message: '' };

export function DemandListingCreateForm() {
  const [state, formAction] = useActionState(createReferralDemandListing, initialState);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Succes', description: state.message });
      if (state.data?.id) {
        router.push(`/parrainages/demandes/${state.data.id}`);
      } else {
        router.push('/parrainages/demandes');
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
            <Label htmlFor="title">Titre</Label>
            <Input id="title" name="title" required minLength={6} maxLength={140} placeholder="Ex: Recherche parrainage Data Analyst a Casablanca" />
            {fieldError('title') && <p className="text-xs text-destructive">{fieldError('title')}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetRole">Poste vise</Label>
              <Input id="targetRole" name="targetRole" required maxLength={120} placeholder="Data Analyst" />
              {fieldError('targetRole') && <p className="text-xs text-destructive">{fieldError('targetRole')}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville (optionnel)</Label>
              <Input id="city" name="city" maxLength={80} placeholder="Casablanca" />
              {fieldError('city') && <p className="text-xs text-destructive">{fieldError('city')}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractType">Contrat</Label>
              <select id="contractType" name="contractType" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Non specifie</option>
                <option value="cdi">CDI</option>
                <option value="cdd">CDD</option>
                <option value="stage">Stage</option>
                <option value="freelance">Freelance</option>
                <option value="alternance">Alternance</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workMode">Mode</Label>
              <select id="workMode" name="workMode" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Non specifie</option>
                <option value="onsite">Presentiel</option>
                <option value="hybrid">Hybride</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seniority">Niveau</Label>
              <select id="seniority" name="seniority" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Non specifie</option>
                <option value="junior">Junior</option>
                <option value="confirme">Confirme</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
                <option value="manager">Manager</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Resume public</Label>
            <Textarea id="summary" name="summary" required minLength={60} maxLength={1000} className="min-h-[120px]" placeholder="Decrivez votre profil, vos points forts et le type d'entreprise vise." />
            {fieldError('summary') && <p className="text-xs text-destructive">{fieldError('summary')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Details supplementaires (optionnel)</Label>
            <Textarea id="details" name="details" maxLength={3000} className="min-h-[120px]" placeholder="Disponibilite, stack, certifications, contexte..." />
            {fieldError('details') && <p className="text-xs text-destructive">{fieldError('details')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiration (optionnel)</Label>
            <Input id="expiresAt" name="expiresAt" type="datetime-local" />
            {fieldError('expiresAt') && <p className="text-xs text-destructive">{fieldError('expiresAt')}</p>}
          </div>

          <Button type="submit" className="rounded-xl">Publier ma demande</Button>
        </form>
      </CardContent>
    </Card>
  );
}
