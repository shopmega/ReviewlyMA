'use client';

import { Ban, Briefcase, Crown, Loader2, Shield, User as UserIcon, UserCog, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Translate = (key: string, fallback?: string) => string;

export function UserRoleBadge({
  role,
  suspended,
  premium,
  t,
}: {
  role: string;
  suspended?: boolean;
  premium?: boolean;
  t: Translate;
}) {
  if (suspended) {
    return (
      <Badge className="rounded-full border-none bg-rose-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-rose-500">
        <XCircle className="mr-1 h-3 w-3" /> {t('adminUsers.status.suspended', 'Suspendu')}
      </Badge>
    );
  }

  if (premium) {
    return (
      <Badge className="animate-pulse rounded-full border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
        <Crown className="mr-1 h-3 w-3 fill-white" /> {t('adminUsers.status.premium', 'Premium')}
      </Badge>
    );
  }

  switch (role) {
    case 'admin':
      return (
        <Badge className="rounded-full border-0 bg-indigo-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
          <Shield className="mr-1 h-3 w-3" /> {t('adminUsers.role.admin', 'Admin')}
        </Badge>
      );
    case 'pro':
      return (
        <Badge className="rounded-full border-0 bg-emerald-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
          <Briefcase className="mr-1 h-3 w-3" /> {t('adminUsers.role.pro', 'Professionnel')}
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="rounded-full border-none bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:bg-slate-800">
          <UserIcon className="mr-1 h-3 w-3" /> {t('adminUsers.role.user', 'Utilisateur')}
        </Badge>
      );
  }
}

type ConfirmDialogState = {
  open: boolean;
  type: 'suspend' | 'role' | 'premium' | null;
  userId: string;
  userName: string;
  currentSuspended?: boolean;
  currentPremium?: boolean;
  newRole?: 'admin' | 'pro' | 'user';
};

type PremiumConfig = {
  tier: 'growth' | 'gold';
  periodMonths: number | null;
};

export function UserAdminConfirmDialog({
  confirmDialog,
  premiumConfig,
  loading,
  onOpenChange,
  onPremiumConfigChange,
  onConfirm,
  getRoleLabel,
  t,
}: {
  confirmDialog: ConfirmDialogState;
  premiumConfig: PremiumConfig;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onPremiumConfigChange: (config: PremiumConfig) => void;
  onConfirm: () => void;
  getRoleLabel: (role: string) => string;
  t: Translate;
}) {
  const title =
    confirmDialog.type === 'suspend'
      ? confirmDialog.currentSuspended
        ? t('adminUsers.dialog.reactivateMember', 'Reactiver le membre')
        : t('adminUsers.dialog.suspendAccess', "Suspendre l'acces")
      : confirmDialog.type === 'premium'
        ? confirmDialog.currentPremium
          ? t('adminUsers.dialog.removePremium', 'Retirer Premium')
          : t('adminUsers.dialog.activatePremiumGift', 'Activer Premium Gift')
        : t('adminUsers.dialog.roleChange', 'Changement de role');

  const description =
    confirmDialog.type === 'suspend'
      ? confirmDialog.currentSuspended
        ? `Voulez-vous reactiver le compte de "${confirmDialog.userName}" ? Il aura de nouveau acces a toutes ses fonctionnalites.`
        : `Voulez-vous suspendre l'acces pour "${confirmDialog.userName}" ? Il ne pourra plus se connecter a la plateforme.`
      : confirmDialog.type === 'premium'
        ? confirmDialog.currentPremium
          ? `Voulez-vous retirer les avantages Premium de "${confirmDialog.userName}" ?`
          : `Choisissez le plan et la periode Premium pour "${confirmDialog.userName}".`
        : `Voulez-vous attribuer le role "${getRoleLabel(confirmDialog.newRole || 'user')}" a "${confirmDialog.userName}" ?`;

  return (
    <Dialog open={confirmDialog.open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-0 bg-white p-8 shadow-2xl dark:bg-slate-950">
        <DialogHeader className="space-y-4">
          <div
            className={cn(
              'mb-2 flex h-20 w-20 items-center justify-center rounded-3xl border transition-colors',
              confirmDialog.type === 'suspend'
                ? 'border-rose-500/20 bg-rose-500/10'
                : 'border-indigo-500/20 bg-indigo-500/10'
            )}
          >
            {confirmDialog.type === 'suspend' ? (
              <Ban className="h-10 w-10 text-rose-500" />
            ) : (
              <UserCog className="h-10 w-10 text-indigo-500" />
            )}
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight">{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="pt-2 font-medium text-slate-600 dark:text-slate-400">{description}</div>
          </DialogDescription>
        </DialogHeader>

        {confirmDialog.type === 'premium' && !confirmDialog.currentPremium ? (
          <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{t('adminUsers.dialog.plan', 'Plan')}</p>
              <Select
                value={premiumConfig.tier}
                onValueChange={(value) =>
                  onPremiumConfigChange({ ...premiumConfig, tier: value as 'growth' | 'gold' })
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t('adminUsers.dialog.choosePlan', 'Choisir un plan')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="growth">{t('adminUsers.dialog.tier.growth', 'Growth')}</SelectItem>
                  <SelectItem value="gold">{t('adminUsers.dialog.tier.gold', 'Gold')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{t('adminUsers.dialog.period', 'Periode')}</p>
              <Select
                value={premiumConfig.periodMonths === null ? 'unlimited' : String(premiumConfig.periodMonths)}
                onValueChange={(value) =>
                  onPremiumConfigChange({
                    ...premiumConfig,
                    periodMonths: value === 'unlimited' ? null : Number(value),
                  })
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t('adminUsers.dialog.choosePeriod', 'Choisir une periode')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="1">{t('adminUsers.dialog.periods.1', '1 mois')}</SelectItem>
                  <SelectItem value="3">{t('adminUsers.dialog.periods.3', '3 mois')}</SelectItem>
                  <SelectItem value="6">{t('adminUsers.dialog.periods.6', '6 mois')}</SelectItem>
                  <SelectItem value="12">{t('adminUsers.dialog.periods.12', '12 mois')}</SelectItem>
                  <SelectItem value="24">{t('adminUsers.dialog.periods.24', '24 mois')}</SelectItem>
                  <SelectItem value="unlimited">{t('adminUsers.dialog.periods.unlimited', 'Illimite')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}

        <DialogFooter className="mt-8 gap-3">
          <Button variant="outline" className="h-12 rounded-2xl border-border/40 px-8 font-bold" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Annuler')}
          </Button>
          <Button
            className={cn(
              'h-12 rounded-2xl px-10 font-black text-white shadow-xl transition-all',
              confirmDialog.type === 'suspend' && !confirmDialog.currentSuspended
                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
                : 'bg-primary hover:bg-primary/90 shadow-primary/20'
            )}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('adminUsers.dialog.confirmAction', "Confirmer l'Action")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
