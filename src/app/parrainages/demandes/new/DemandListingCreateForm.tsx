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
import { useI18n } from '@/components/providers/i18n-provider';

const initialState: ActionState = { status: 'idle', message: '' };

export function DemandListingCreateForm() {
  const [state, formAction] = useActionState(createReferralDemandListing, initialState);
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: t('referralDemandCreatePage.toasts.success', 'Success'), description: state.message });
      if (state.data?.id) {
        router.push(`/parrainages/demandes/${state.data.id}`);
      } else {
        router.push('/parrainages/demandes');
      }
      return;
    }
    if (state.status === 'error') {
      toast({ title: t('referralDemandCreatePage.toasts.error', 'Error'), description: state.message, variant: 'destructive' });
    }
  }, [state, toast, router, t]);

  const fieldErrors = (state.errors || {}) as Record<string, string[] | undefined>;
  const fieldError = (name: string) => fieldErrors[name]?.[0];

  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">{t('referralDemandCreatePage.form.title', 'Title')}</Label>
            <Input
              id="title"
              name="title"
              required
              minLength={6}
              maxLength={140}
              placeholder={t('referralDemandCreatePage.form.titlePlaceholder', 'Ex: Looking for referral - Data Analyst in Casablanca')}
            />
            {fieldError('title') && <p className="text-xs text-destructive">{fieldError('title')}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetRole">{t('referralDemandCreatePage.form.targetRole', 'Target role')}</Label>
              <Input id="targetRole" name="targetRole" required maxLength={120} placeholder={t('referralDemandCreatePage.form.targetRolePlaceholder', 'Data Analyst')} />
              {fieldError('targetRole') && <p className="text-xs text-destructive">{fieldError('targetRole')}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">{t('referralDemandCreatePage.form.cityOptional', 'City (optional)')}</Label>
              <Input id="city" name="city" maxLength={80} placeholder={t('referralDemandCreatePage.form.cityPlaceholder', 'Casablanca')} />
              {fieldError('city') && <p className="text-xs text-destructive">{fieldError('city')}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractType">{t('referralDemandCreatePage.form.contract', 'Contract')}</Label>
              <select id="contractType" name="contractType" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">{t('referralDemandCreatePage.form.notSpecified', 'Not specified')}</option>
                <option value="cdi">CDI</option>
                <option value="cdd">CDD</option>
                <option value="stage">{t('referralDemandCreatePage.form.internship', 'Internship')}</option>
                <option value="freelance">Freelance</option>
                <option value="alternance">{t('referralDemandCreatePage.form.apprenticeship', 'Apprenticeship')}</option>
                <option value="autre">{t('referralDemandCreatePage.form.other', 'Other')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workMode">{t('referralDemandCreatePage.form.workMode', 'Mode')}</Label>
              <select id="workMode" name="workMode" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">{t('referralDemandCreatePage.form.notSpecified', 'Not specified')}</option>
                <option value="onsite">{t('referralDemandCreatePage.form.onsite', 'On-site')}</option>
                <option value="hybrid">{t('referralDemandCreatePage.form.hybrid', 'Hybrid')}</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seniority">{t('referralDemandCreatePage.form.seniority', 'Seniority')}</Label>
              <select id="seniority" name="seniority" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">{t('referralDemandCreatePage.form.notSpecified', 'Not specified')}</option>
                <option value="junior">Junior</option>
                <option value="confirme">{t('referralDemandCreatePage.form.confirmed', 'Confirmed')}</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
                <option value="manager">Manager</option>
                <option value="autre">{t('referralDemandCreatePage.form.other', 'Other')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">{t('referralDemandCreatePage.form.publicSummary', 'Public summary')}</Label>
            <Textarea
              id="summary"
              name="summary"
              required
              minLength={60}
              maxLength={1000}
              className="min-h-[120px]"
              placeholder={t(
                'referralDemandCreatePage.form.publicSummaryPlaceholder',
                'Describe your profile, strengths, and target company type.'
              )}
            />
            {fieldError('summary') && <p className="text-xs text-destructive">{fieldError('summary')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">{t('referralDemandCreatePage.form.extraDetailsOptional', 'Additional details (optional)')}</Label>
            <Textarea
              id="details"
              name="details"
              maxLength={3000}
              className="min-h-[120px]"
              placeholder={t(
                'referralDemandCreatePage.form.extraDetailsPlaceholder',
                'Availability, stack, certifications, context...'
              )}
            />
            {fieldError('details') && <p className="text-xs text-destructive">{fieldError('details')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">{t('referralDemandCreatePage.form.expirationOptional', 'Expiration (optional)')}</Label>
            <Input id="expiresAt" name="expiresAt" type="datetime-local" />
            {fieldError('expiresAt') && <p className="text-xs text-destructive">{fieldError('expiresAt')}</p>}
          </div>

          <Button type="submit" className="rounded-xl">{t('referralDemandCreatePage.actions.publish', 'Publish my request')}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
