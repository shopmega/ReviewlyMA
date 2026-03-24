'use client';

import { Check, Clock, CreditCard, Loader2, ShieldCheck, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Translate = (key: string, fallback?: string) => string;

export type ManualPaymentDraft = {
  userEmail: string;
  amount: string;
  reference: string;
  method: string;
  duration: string;
  tier: 'growth' | 'gold';
  notes: string;
};

export function PaymentStatusBadge({
  status,
  t,
}: {
  status: string;
  t: Translate;
}) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="animate-pulse rounded-full border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-amber-600">
          <Clock className="mr-1 h-3 w-3" /> {t('adminPayments.status.pending', 'En attente')}
        </Badge>
      );
    case 'verified':
      return (
        <Badge className="rounded-full border-0 bg-emerald-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20">
          <Check className="mr-1 h-3 w-3" /> {t('adminPayments.status.verified', 'Verifie')}
        </Badge>
      );
    case 'rejected':
      return (
        <Badge className="rounded-full border-0 bg-rose-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white">
          <X className="mr-1 h-3 w-3" /> {t('adminPayments.status.rejected', 'Rejete')}
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest">
          {status}
        </Badge>
      );
  }
}

export function ManualPaymentDialog({
  open,
  draft,
  loading,
  onOpenChange,
  onDraftChange,
  onSubmit,
  t,
}: {
  open: boolean;
  draft: ManualPaymentDraft;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: ManualPaymentDraft) => void;
  onSubmit: () => void;
  t: Translate;
}) {
  const updateField = <K extends keyof ManualPaymentDraft>(key: K, value: ManualPaymentDraft[K]) => {
    onDraftChange({ ...draft, [key]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-[2.5rem] border-0 bg-white p-8 shadow-2xl dark:bg-slate-950">
        <DialogHeader className="space-y-4">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight">{t('adminPayments.manual.title', 'Activation Manuelle')}</DialogTitle>
          <DialogDescription className="font-medium text-slate-600 dark:text-slate-400">
            {t('adminPayments.manual.desc', 'Enregistrez un paiement recu hors-ligne pour activer un compte gold.')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t('adminPayments.manual.ownerEmail', 'Email du Proprietaire')}
            </Label>
            <Input
              placeholder={t('adminPayments.manual.ownerEmailPlaceholder', 'exemple@entreprise.com')}
              className="h-12 rounded-xl border-border/10 bg-slate-50 font-bold focus:ring-primary/20"
              value={draft.userEmail}
              onChange={(event) => updateField('userEmail', event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {t('adminPayments.manual.amountLabel', 'Montant (MAD)')}
              </Label>
              <Input
                type="number"
                className="h-12 rounded-xl border-border/10 bg-slate-50 font-black tabular-nums focus:ring-primary/20"
                value={draft.amount}
                onChange={(event) => updateField('amount', event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {t('adminPayments.manual.durationLabel', 'Duree Pack')}
              </Label>
              <Select value={draft.duration} onValueChange={(value) => updateField('duration', value)}>
                <SelectTrigger className="h-12 rounded-xl border-border/10 bg-slate-50">
                  <SelectValue placeholder={t('adminPayments.manual.choose', 'Choisir')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="1">{t('adminPayments.manual.duration.1', '1 Mois')}</SelectItem>
                  <SelectItem value="6">{t('adminPayments.manual.duration.6', '6 Mois')}</SelectItem>
                  <SelectItem value="12">{t('adminPayments.manual.duration.12', '12 Mois (1 an)')}</SelectItem>
                  <SelectItem value="24">{t('adminPayments.manual.duration.24', '24 Mois (2 ans)')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t('adminPayments.manual.planTypeLabel', "Type d'abonnement")}
            </Label>
            <Select value={draft.tier} onValueChange={(value) => updateField('tier', value as 'growth' | 'gold')}>
              <SelectTrigger className="h-12 rounded-xl border-border/10 bg-slate-50">
                <SelectValue placeholder={t('adminPayments.manual.choosePlan', 'Choisir un plan')} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="growth">{t('adminPayments.manual.planGrowth', 'Business GROWTH (99/mo)')}</SelectItem>
                <SelectItem value="gold">{t('adminPayments.manual.planGold', 'Business GOLD (299/mo)')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t('adminPayments.manual.referenceLabel', 'Reference Transaction')}
            </Label>
            <Input
              placeholder={t('adminPayments.manual.referencePlaceholder', 'Ex: VIR-55421-MAROC')}
              className="h-12 rounded-xl border-border/10 bg-slate-50 font-mono focus:ring-primary/20"
              value={draft.reference}
              onChange={(event) => updateField('reference', event.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="mt-8 gap-3">
          <Button variant="ghost" className="h-12 rounded-2xl px-8 font-bold" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Annuler')}
          </Button>
          <Button
            className="h-12 rounded-2xl bg-primary px-10 font-black text-white shadow-xl shadow-primary/20 hover:bg-primary/90"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            {t('adminPayments.manual.confirmActivation', "Activer l'abonnement")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RejectPaymentDialog({
  open,
  reason,
  loading,
  onOpenChange,
  onReasonChange,
  onConfirm,
  trigger,
  t,
}: {
  open: boolean;
  reason: string;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  trigger: React.ReactNode;
  t: Translate;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2rem] p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">{t('adminPayments.rejectDialog.title', 'Refus de transaction')}</DialogTitle>
          <DialogDescription className="font-medium text-slate-600">
            {t('adminPayments.rejectDialog.desc', "Pourquoi ce virement n'est-il pas valide ?")}
          </DialogDescription>
        </DialogHeader>
        <div className="py-6">
          <Textarea
            placeholder={t('adminPayments.rejectDialog.placeholder', 'Ex: Reference introuvable, montant inferieur...')}
            className="min-h-32 rounded-2xl border-border/10 bg-slate-50 p-4 font-bold"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" className="h-12 rounded-xl" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Annuler')}
          </Button>
          <Button
            className="h-12 rounded-xl bg-rose-500 px-8 font-black text-white shadow-xl shadow-rose-500/20 hover:bg-rose-600"
            onClick={onConfirm}
            disabled={loading || !reason}
          >
            {t('adminPayments.rejectDialog.confirm', 'Confirmer le Refus')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
