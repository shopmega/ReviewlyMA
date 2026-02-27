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
import { useI18n } from '@/components/providers/i18n-provider';

const initialState: ActionState = { status: 'idle', message: '' };

export function RequestReferralForm({ offerId }: { offerId: string }) {
  const [state, formAction] = useActionState(requestReferral, initialState);
  const { toast } = useToast();
  const { t } = useI18n();
  const fieldErrors = (state.errors || {}) as Record<string, string[] | undefined>;
  const fieldError = (name: string) => fieldErrors[name]?.[0];

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: t('common.success', 'Succes'), description: state.message });
      return;
    }
    if (state.status === 'error') {
      toast({ title: t('common.error', 'Erreur'), description: state.message, variant: 'destructive' });
    }
  }, [state, toast, t]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{t('referrals.request.title', 'Demander un parrainage')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="offerId" value={offerId} />
          <div className="space-y-2">
            <Label htmlFor="message">{t('referrals.request.message', 'Votre message')}</Label>
            <Textarea
              id="message"
              name="message"
              required
              minLength={40}
              className="min-h-[120px]"
              placeholder={t('referrals.request.messagePlaceholder', 'Presentez votre profil, experience et motivation (minimum 40 caracteres)...')}
            />
            {fieldError('message') && <p className="text-xs text-destructive">{fieldError('message')}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cvUrl">{t('referrals.request.cvUrl', 'Lien CV (optionnel)')}</Label>
            <Input id="cvUrl" name="cvUrl" placeholder="https://..." />
            {fieldError('cvUrl') && <p className="text-xs text-destructive">{fieldError('cvUrl')}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn (optionnel)</Label>
            <Input id="linkedinUrl" name="linkedinUrl" placeholder="https://www.linkedin.com/in/..." />
            {fieldError('linkedinUrl') && <p className="text-xs text-destructive">{fieldError('linkedinUrl')}</p>}
          </div>
          <label className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
            <input type="checkbox" required className="mt-0.5" />
            Je confirme que je ne paierai jamais pour un parrainage et que je garde les echanges sur Reviewly.
          </label>
          <p className="text-xs text-muted-foreground">
            {t('referrals.request.privacyNote', "Votre demande sera visible uniquement par l'auteur de l'offre.")}
          </p>
          <Button type="submit" className="rounded-xl">{t('referrals.request.submit', 'Envoyer ma demande')}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
