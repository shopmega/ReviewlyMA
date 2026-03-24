'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { AlertTriangle, Loader2, Plus, X } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { getStoragePublicUrl } from '@/lib/data';
import { cn, isValidImageUrl } from '@/lib/utils';

export type NewBusinessDraft = {
  name: string;
  category: string;
  city: string;
  address: string;
  description: string;
  isPremium: boolean;
};

type Translate = (key: string, fallback?: string) => string;

export function BusinessLogoAvatar({
  name,
  logoUrl,
  className,
  imageClassName,
  fallbackClassName,
  fallback = null,
}: {
  name: string;
  logoUrl: string | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  fallback?: ReactNode;
}) {
  const resolvedLogoUrl = getStoragePublicUrl(logoUrl);
  const showImage = resolvedLogoUrl && isValidImageUrl(resolvedLogoUrl);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {showImage ? (
        <Image src={resolvedLogoUrl} alt={name} fill className={cn('object-cover', imageClassName)} />
      ) : (
        fallback ?? (
          <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500/10 to-primary/10 text-sm font-black text-primary', fallbackClassName)}>
            {name?.[0]?.toUpperCase() || 'B'}
          </div>
        )
      )}
    </div>
  );
}

export function BusinessVisibilityBadges({
  isSponsored,
  isFeatured,
  compact = false,
  showStandardWhenEmpty = false,
}: {
  isSponsored?: boolean;
  isFeatured: boolean;
  compact?: boolean;
  showStandardWhenEmpty?: boolean;
}) {
  const textSize = compact ? 'text-[8px]' : 'text-[9px]';
  const badgeBase = compact ? 'px-2 py-0.5 rounded-full uppercase tracking-tighter' : 'px-2.5 py-1 rounded-full uppercase tracking-widest';

  if (!isSponsored && !isFeatured && showStandardWhenEmpty) {
    return (
      <Badge variant="outline" className={cn('font-bold text-muted-foreground border-border/30', textSize, badgeBase)}>
        Standard
      </Badge>
    );
  }

  return (
    <>
      {isSponsored ? (
        <Badge className={cn('border-0 bg-gradient-to-r from-violet-600 to-indigo-600 font-black text-white', textSize, badgeBase)}>
          Sponsorise
        </Badge>
      ) : null}
      {isFeatured ? (
        <Badge className={cn('border-0 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 font-black text-white shadow-lg shadow-orange-500/20', textSize, badgeBase, compact ? '' : 'animate-pulse')}>
          A la une
        </Badge>
      ) : null}
    </>
  );
}

export function DeleteBusinessDialog({
  open,
  businessName,
  loading,
  onOpenChange,
  onConfirm,
  t,
}: {
  open: boolean;
  businessName: string;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  t: Translate;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-0 bg-white p-8 shadow-2xl dark:bg-slate-950">
        <DialogHeader className="space-y-4">
          <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-3xl border border-rose-500/20 bg-rose-500/10">
            <AlertTriangle className="h-10 w-10 text-rose-500" />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight">Confirmation de bannissement</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-4 pt-2 font-medium text-slate-600 dark:text-slate-400">
              <p>
                {t('adminBusinesses.deleteDialog.confirmText', 'Etes-vous sur de vouloir bannir')} <strong>"{businessName}"</strong> ?{' '}
                {t('adminBusinesses.deleteDialog.irreversible', 'Cette action est definitive.')}
              </p>
              <div className="space-y-2 rounded-3xl border border-border/10 bg-slate-50 p-6 dark:bg-slate-900">
                <p className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-rose-500">
                  {t('adminBusinesses.deleteDialog.deletedData', 'Donnees supprimees :')}
                </p>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2 text-muted-foreground"><X className="h-3 w-3 text-rose-500" /> {t('adminBusinesses.deleteDialog.deletedItems.reviewsHistory', 'Historique des avis')}</li>
                  <li className="flex items-center gap-2 text-muted-foreground"><X className="h-3 w-3 text-rose-500" /> {t('adminBusinesses.deleteDialog.deletedItems.updatesPhotos', 'Mises a jour & Photos')}</li>
                  <li className="flex items-center gap-2 text-muted-foreground"><X className="h-3 w-3 text-rose-500" /> {t('adminBusinesses.deleteDialog.deletedItems.relatedClaims', 'Revendications liees')}</li>
                  <li className="flex items-center gap-2 text-muted-foreground"><X className="h-3 w-3 text-rose-500" /> {t('adminBusinesses.deleteDialog.deletedItems.ownerAccess', 'Acces proprietaire')}</li>
                </ul>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-8 gap-3">
          <Button variant="outline" className="h-12 rounded-2xl border-border/40 px-8 font-bold" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Annuler')}
          </Button>
          <Button
            className="h-12 rounded-2xl bg-rose-500 px-10 font-black text-white shadow-xl shadow-rose-500/20 hover:bg-rose-600"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Bannir definitivement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreateBusinessDialog({
  open,
  draft,
  loading,
  onOpenChange,
  onDraftChange,
  onSubmit,
  t,
}: {
  open: boolean;
  draft: NewBusinessDraft;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: NewBusinessDraft) => void;
  onSubmit: () => void;
  t: Translate;
}) {
  const updateField = <K extends keyof NewBusinessDraft>(key: K, value: NewBusinessDraft[K]) => {
    onDraftChange({ ...draft, [key]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[2.5rem] border-0 bg-white p-8 shadow-2xl dark:bg-slate-950">
        <DialogHeader className="space-y-4">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Plus className="h-8 w-8" />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight">
            {t('adminBusinesses.createDialog.titlePrefix', 'Ajouter un')} <span className="text-primary italic">{t('adminBusinesses.createDialog.titleAccent', 'Etablissement')}</span>
          </DialogTitle>
          <DialogDescription className="font-medium">
            {t('adminBusinesses.createDialog.desc', 'Saisissez les informations de base pour creer une nouvelle fiche.')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 py-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name" className="ml-1 text-[10px] font-black uppercase tracking-widest">{t('adminBusinesses.createDialog.fields.name', "Nom de l'entreprise")} *</Label>
            <Input id="name" placeholder={t('adminBusinesses.createDialog.placeholders.name', 'Ex: Cafe de Paris')} className="rounded-xl" value={draft.name} onChange={(event) => updateField('name', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category" className="ml-1 text-[10px] font-black uppercase tracking-widest">{t('adminBusinesses.createDialog.fields.category', 'Categorie')} *</Label>
            <Input id="category" placeholder={t('adminBusinesses.createDialog.placeholders.category', 'Ex: Restaurant')} className="rounded-xl" value={draft.category} onChange={(event) => updateField('category', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city" className="ml-1 text-[10px] font-black uppercase tracking-widest">{t('adminBusinesses.createDialog.fields.city', 'Ville')} *</Label>
            <Input id="city" placeholder={t('adminBusinesses.createDialog.placeholders.city', 'Ex: Casablanca')} className="rounded-xl" value={draft.city} onChange={(event) => updateField('city', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address" className="ml-1 text-[10px] font-black uppercase tracking-widest">{t('adminBusinesses.createDialog.fields.address', 'Adresse')} *</Label>
            <Input id="address" placeholder={t('adminBusinesses.createDialog.placeholders.address', 'Ex: 123 Rue de la Liberte')} className="rounded-xl" value={draft.address} onChange={(event) => updateField('address', event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="desc" className="ml-1 text-[10px] font-black uppercase tracking-widest">{t('adminBusinesses.createDialog.fields.description', 'Description')}</Label>
            <Textarea id="desc" placeholder={t('adminBusinesses.createDialog.placeholders.description', 'Courte description...')} className="min-h-[100px] rounded-xl" value={draft.description} onChange={(event) => updateField('description', event.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-muted/30 p-4 md:col-span-2">
            <div>
              <Label className="block text-sm font-black">{t('adminBusinesses.createDialog.premiumLabel', 'Statut Premium')}</Label>
              <p className="text-xs font-medium text-muted-foreground">{t('adminBusinesses.createDialog.premiumDesc', 'Activer directement les avantages Premium.')}</p>
            </div>
            <Switch checked={draft.isPremium} onCheckedChange={(checked) => updateField('isPremium', checked)} />
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="ghost" className="h-12 rounded-xl px-6 font-bold" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Annuler')}
          </Button>
          <Button className="h-12 rounded-xl bg-primary px-10 font-black text-white shadow-lg shadow-primary/20 hover:bg-primary/90" onClick={onSubmit} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Creer la fiche
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
