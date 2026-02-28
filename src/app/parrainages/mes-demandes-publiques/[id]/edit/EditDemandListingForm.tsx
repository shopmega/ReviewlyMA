'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateReferralDemandListing } from '@/app/actions/referrals';
import type { ActionState } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const initialState: ActionState = { status: 'idle', message: '' };

type DemandListing = {
  id: string;
  title: string;
  target_role: string;
  city: string | null;
  contract_type: string | null;
  work_mode: string | null;
  seniority: string | null;
  summary: string;
  details: string | null;
  expires_at: string | null;
};

export function EditDemandListingForm({ item }: { item: DemandListing }) {
  const [state, formAction] = useActionState(updateReferralDemandListing, initialState);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Succes', description: state.message });
      router.push('/parrainages/mes-demandes-publiques');
      return;
    }
    if (state.status === 'error') {
      toast({ title: 'Erreur', description: state.message, variant: 'destructive' });
    }
  }, [state, toast, router]);

  const fieldErrors = (state.errors || {}) as Record<string, string[] | undefined>;
  const fieldError = (name: string) => fieldErrors[name]?.[0];
  const expiresAtDefault = item.expires_at ? new Date(item.expires_at).toISOString().slice(0, 16) : '';

  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="demandListingId" value={item.id} />

          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input id="title" name="title" required minLength={6} maxLength={140} defaultValue={item.title} />
            {fieldError('title') && <p className="text-xs text-destructive">{fieldError('title')}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetRole">Poste vise</Label>
              <Input id="targetRole" name="targetRole" required maxLength={120} defaultValue={item.target_role} />
              {fieldError('targetRole') && <p className="text-xs text-destructive">{fieldError('targetRole')}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville (optionnel)</Label>
              <Input id="city" name="city" maxLength={80} defaultValue={item.city || ''} />
              {fieldError('city') && <p className="text-xs text-destructive">{fieldError('city')}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractType">Contrat</Label>
              <select id="contractType" name="contractType" defaultValue={item.contract_type || ''} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
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
              <select id="workMode" name="workMode" defaultValue={item.work_mode || ''} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Non specifie</option>
                <option value="onsite">Presentiel</option>
                <option value="hybrid">Hybride</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seniority">Niveau</Label>
              <select id="seniority" name="seniority" defaultValue={item.seniority || ''} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
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
            <Textarea id="summary" name="summary" required minLength={60} maxLength={1000} className="min-h-[120px]" defaultValue={item.summary} />
            {fieldError('summary') && <p className="text-xs text-destructive">{fieldError('summary')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Details supplementaires (optionnel)</Label>
            <Textarea id="details" name="details" maxLength={3000} className="min-h-[120px]" defaultValue={item.details || ''} />
            {fieldError('details') && <p className="text-xs text-destructive">{fieldError('details')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiration (optionnel)</Label>
            <Input id="expiresAt" name="expiresAt" type="datetime-local" defaultValue={expiresAtDefault} />
            {fieldError('expiresAt') && <p className="text-xs text-destructive">{fieldError('expiresAt')}</p>}
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="rounded-xl">Enregistrer</Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => router.push('/parrainages/mes-demandes-publiques')}>
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
