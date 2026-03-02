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
import { useI18n } from '@/components/providers/i18n-provider';

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
  const { t } = useI18n();

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: t('referralPublicDemandEditPage.toasts.success', 'Success'), description: state.message });
      router.push('/parrainages/mes-demandes-publiques');
      return;
    }
    if (state.status === 'error') {
      toast({ title: t('referralPublicDemandEditPage.toasts.error', 'Error'), description: state.message, variant: 'destructive' });
    }
  }, [state, toast, router, t]);

  const fieldErrors = (state.errors || {}) as Record<string, string[] | undefined>;
  const fieldError = (name: string) => fieldErrors[name]?.[0];
  const expiresAtDefault = item.expires_at ? new Date(item.expires_at).toISOString().slice(0, 16) : '';

  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="demandListingId" value={item.id} />

          <div className="space-y-2">
            <Label htmlFor="title">{t('referralPublicDemandEditPage.form.title', 'Title')}</Label>
            <Input id="title" name="title" required minLength={6} maxLength={140} defaultValue={item.title} />
            {fieldError('title') && <p className="text-xs text-destructive">{fieldError('title')}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetRole">{t('referralPublicDemandEditPage.form.targetRole', 'Target role')}</Label>
              <Input id="targetRole" name="targetRole" required maxLength={120} defaultValue={item.target_role} />
              {fieldError('targetRole') && <p className="text-xs text-destructive">{fieldError('targetRole')}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">{t('referralPublicDemandEditPage.form.cityOptional', 'City (optional)')}</Label>
              <Input id="city" name="city" maxLength={80} defaultValue={item.city || ''} />
              {fieldError('city') && <p className="text-xs text-destructive">{fieldError('city')}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractType">{t('referralPublicDemandEditPage.form.contract', 'Contract')}</Label>
              <select id="contractType" name="contractType" defaultValue={item.contract_type || ''} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">{t('referralPublicDemandEditPage.form.notSpecified', 'Not specified')}</option>
                <option value="cdi">CDI</option>
                <option value="cdd">CDD</option>
                <option value="stage">{t('referralPublicDemandEditPage.form.internship', 'Internship')}</option>
                <option value="freelance">Freelance</option>
                <option value="alternance">{t('referralPublicDemandEditPage.form.apprenticeship', 'Apprenticeship')}</option>
                <option value="autre">{t('referralPublicDemandEditPage.form.other', 'Other')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workMode">{t('referralPublicDemandEditPage.form.workMode', 'Mode')}</Label>
              <select id="workMode" name="workMode" defaultValue={item.work_mode || ''} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">{t('referralPublicDemandEditPage.form.notSpecified', 'Not specified')}</option>
                <option value="onsite">{t('referralPublicDemandEditPage.form.onsite', 'On-site')}</option>
                <option value="hybrid">{t('referralPublicDemandEditPage.form.hybrid', 'Hybrid')}</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seniority">{t('referralPublicDemandEditPage.form.seniority', 'Seniority')}</Label>
              <select id="seniority" name="seniority" defaultValue={item.seniority || ''} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">{t('referralPublicDemandEditPage.form.notSpecified', 'Not specified')}</option>
                <option value="junior">Junior</option>
                <option value="confirme">{t('referralPublicDemandEditPage.form.confirmed', 'Confirmed')}</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
                <option value="manager">Manager</option>
                <option value="autre">{t('referralPublicDemandEditPage.form.other', 'Other')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">{t('referralPublicDemandEditPage.form.publicSummary', 'Public summary')}</Label>
            <Textarea id="summary" name="summary" required minLength={60} maxLength={1000} className="min-h-[120px]" defaultValue={item.summary} />
            {fieldError('summary') && <p className="text-xs text-destructive">{fieldError('summary')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">{t('referralPublicDemandEditPage.form.extraDetailsOptional', 'Additional details (optional)')}</Label>
            <Textarea id="details" name="details" maxLength={3000} className="min-h-[120px]" defaultValue={item.details || ''} />
            {fieldError('details') && <p className="text-xs text-destructive">{fieldError('details')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">{t('referralPublicDemandEditPage.form.expirationOptional', 'Expiration (optional)')}</Label>
            <Input id="expiresAt" name="expiresAt" type="datetime-local" defaultValue={expiresAtDefault} />
            {fieldError('expiresAt') && <p className="text-xs text-destructive">{fieldError('expiresAt')}</p>}
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="rounded-xl">{t('referralPublicDemandEditPage.actions.save', 'Save')}</Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => router.push('/parrainages/mes-demandes-publiques')}>
              {t('referralPublicDemandEditPage.actions.cancel', 'Cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
