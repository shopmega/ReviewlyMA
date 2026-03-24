'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Loader2,
  Shield,
  ShieldCheck,
  UserX,
  X,
} from 'lucide-react';

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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type ClaimRecord = {
  id: string;
  full_name: string;
  job_title: string | null;
  claimer_type?: string | null;
  claimer_title?: string | null;
  email: string;
  personal_phone?: string;
  phone?: string;
  proof_methods?: string[];
  proof_status?: Record<string, string>;
  message_to_admin?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string | null;
  businesses?: { name: string; logo_url?: string };
  proof_data?: Record<string, any>;
};

export const CLAIM_PROOF_METHODS_CONFIG = [
  { value: 'email', label: 'Email professionnel' },
  { value: 'phone', label: 'Telephone' },
  { value: 'document', label: 'Document officiel' },
  { value: 'video', label: 'Video rapide' },
];

const proofIcons: Record<string, string> = {
  email: 'Email',
  phone: 'Phone',
  document: 'Doc',
  video: 'Video',
};

export function ClaimProofBadges({
  proofMethods,
  proofStatus,
}: {
  proofMethods?: string[];
  proofStatus?: Record<string, string>;
}) {
  if (!proofMethods || proofMethods.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {proofMethods.map((method) => {
        const status = proofStatus?.[method] || 'pending';
        const isVerified = status === 'verified';

        return (
          <div
            key={method}
            className={cn(
              'flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-tighter',
              isVerified
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                : 'border-slate-500/10 bg-slate-500/5 text-slate-500'
            )}
          >
            {proofIcons[method]} {method}
            {isVerified && <Check className="h-2.5 w-2.5" />}
          </div>
        );
      })}
    </div>
  );
}

export function ClaimStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="border-yellow-500/50 bg-yellow-500/5 text-yellow-600">
          <Shield className="mr-1 h-3 w-3" />
          En attente
        </Badge>
      );
    case 'approved':
      return (
        <Badge className="bg-emerald-500 text-white">
          <Shield className="mr-1 h-3 w-3" />
          Approuvee
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="destructive" className="bg-rose-500 text-white">
          <X className="mr-1 h-3 w-3" />
          Rejetee
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function VerificationMethodsDialog({
  open,
  onOpenChange,
  tempProofMethods,
  activeProofMethods,
  onTempProofMethodsChange,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tempProofMethods: string[];
  activeProofMethods: string[];
  onTempProofMethodsChange: (methods: string[]) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2rem] p-8">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold">Methodes de verification</DialogTitle>
          <DialogDescription className="text-lg font-light">
            Determinez comment les pros prouvent leur identite.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {CLAIM_PROOF_METHODS_CONFIG.map((method) => (
            <div
              key={method.value}
              className="group flex items-center justify-between rounded-2xl border border-border/10 bg-muted/20 p-4 transition-colors hover:bg-muted/30"
            >
              <Label htmlFor={method.value} className="flex cursor-pointer items-center gap-3 text-lg font-bold">
                {method.label}
              </Label>
              <Checkbox
                id={method.value}
                checked={tempProofMethods.includes(method.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onTempProofMethodsChange([...tempProofMethods, method.value]);
                    return;
                  }

                  onTempProofMethodsChange(tempProofMethods.filter((item) => item !== method.value));
                }}
                className="h-6 w-6 rounded-lg border-primary/40 data-[state=checked]:bg-primary"
              />
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4 text-sm font-medium text-blue-600 dark:text-blue-400">
          <p className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Note: Ces changements s'appliqueront instantanement sur le formulaire public.
          </p>
        </div>
        <DialogFooter className="mt-8 gap-3 sm:gap-0">
          <Button
            variant="ghost"
            className="h-12 rounded-xl px-6"
            onClick={() => {
              onTempProofMethodsChange(activeProofMethods);
              onOpenChange(false);
            }}
          >
            Annuler
          </Button>
          <Button
            className="h-12 rounded-xl bg-primary px-8 font-bold hover:bg-primary/90"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Enregistrer les modifications
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClaimDetailsDialog({
  claim,
  open,
  onOpenChange,
  rejectingId,
  onRejectingIdChange,
  rejectionReason,
  onRejectionReasonChange,
  onApprove,
  onReject,
  isSubmitting,
  openingProof,
  onOpenProof,
}: {
  claim: ClaimRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rejectingId: string | null;
  onRejectingIdChange: (id: string | null) => void;
  rejectionReason: string;
  onRejectionReasonChange: (value: string) => void;
  onApprove: (claimId: string) => void;
  onReject: (claimId: string, reason: string) => void;
  isSubmitting: boolean;
  openingProof: string | null;
  onOpenProof: (claimId: string, kind: 'document' | 'video') => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-border/40 bg-background/95 p-0 shadow-2xl backdrop-blur-3xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Details de la revendication</DialogTitle>
          <DialogDescription>Information complete sur la demande de propriete d'etablissement</DialogDescription>
        </DialogHeader>
        {claim && (
          <div className="flex h-full max-h-[90vh] flex-col">
            <div className="relative overflow-hidden p-8 pb-4">
              <div className="absolute right-0 top-0 -mr-32 -mt-32 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
              <div className="relative z-10 flex items-start justify-between">
                <div className="space-y-2">
                  <Badge className="mb-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                    DOSSIER #{claim.id.substring(0, 8).toUpperCase()}
                  </Badge>
                  <h2 className="line-clamp-2 text-3xl font-bold tracking-tighter text-foreground">
                    {claim.businesses?.name}
                  </h2>
                  <p className="text-lg font-light text-muted-foreground">
                    Par <span className="font-semibold text-foreground">{claim.full_name}</span> - {claim.job_title || 'Proprietaire'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <ClaimStatusBadge status={claim.status} />
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Recu le {format(new Date(claim.created_at), 'dd MMMM yyyy', { locale: fr })}
                  </div>
                </div>
              </div>
            </div>

            <div className="min-h-[400px] flex-1 overflow-y-auto px-8">
              <Tabs defaultValue="proof" className="w-full">
                <TabsList className="mb-8 rounded-2xl border border-border/10 bg-muted/20 p-1">
                  <TabsTrigger value="proof" className="rounded-xl px-8 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    Verification & preuves
                  </TabsTrigger>
                  <TabsTrigger value="info" className="rounded-xl px-8 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    Informations de contact
                  </TabsTrigger>
                  <TabsTrigger value="message" className="rounded-xl px-8 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    Message & historique
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="proof" className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4 rounded-[2rem] border border-emerald-500/10 bg-emerald-500/[0.03] p-6">
                      <h4 className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                        <ShieldCheck className="h-5 w-5" />
                        Score de confiance
                      </h4>
                      <div className="space-y-3">
                        {claim.proof_methods?.map((method) => {
                          const isVerified = claim.proof_status?.[method] === 'verified';

                          return (
                            <div key={method} className="flex items-center justify-between rounded-xl border border-border/10 bg-background/50 p-3">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">
                                  {CLAIM_PROOF_METHODS_CONFIG.find((item) => item.value === method)?.label.split(' ')[0]}
                                </span>
                                <span className="font-medium capitalize">{method}</span>
                              </div>
                              <Badge
                                variant={isVerified ? 'default' : 'outline'}
                                className={cn(
                                  'px-4',
                                  isVerified
                                    ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20'
                                    : 'border-yellow-500/30 text-yellow-600'
                                )}
                              >
                                {isVerified ? 'Verifie' : 'En attente'}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="pl-2 font-bold text-foreground">Preuves multimedia</h4>
                      <div className="space-y-4">
                        {claim.proof_data?.document_uploaded && (
                          <div className="group relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-dashed border-border/40 bg-background p-6 text-center transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Shield className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-lg font-bold">Document officiel</p>
                              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">PDF / IMAGE - CLIQUEZ POUR VOIR</p>
                            </div>
                            <Button
                              variant="link"
                              className="font-bold text-primary"
                              disabled={openingProof === claim.id}
                              onClick={() => onOpenProof(claim.id, 'document')}
                            >
                              {openingProof === claim.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Chargement...
                                </>
                              ) : (
                                <>
                                  Ouvrir le justificatif <ExternalLink className="ml-1 h-4 w-4" />
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {claim.proof_data?.video_uploaded && (
                          <div className="group relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-dashed border-indigo-200 bg-background p-6 text-center transition-all hover:border-indigo-400/40 hover:shadow-xl hover:shadow-indigo-500/5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600">
                              <Shield className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-lg font-bold">Video de verification</p>
                              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">MP4 / WEBM - CLIQUEZ POUR VOIR</p>
                            </div>
                            <Button
                              variant="link"
                              className="font-bold text-indigo-600"
                              disabled={openingProof === claim.id}
                              onClick={() => onOpenProof(claim.id, 'video')}
                            >
                              {openingProof === claim.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Chargement...
                                </>
                              ) : (
                                <>
                                  Voir la video <ExternalLink className="ml-1 h-4 w-4" />
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {!claim.proof_data?.document_uploaded && !claim.proof_data?.video_uploaded && (
                          <div className="flex h-32 flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-muted/20 text-sm italic text-muted-foreground">
                            Aucun fichier transmis
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="info" className="space-y-6">
                  <div className="grid grid-cols-2 gap-8 py-4">
                    <div className="space-y-6">
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Nom complet</label>
                        <p className="text-xl font-bold">{claim.full_name}</p>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Poste occupe</label>
                        <p className="text-xl font-bold transition-all hover:text-primary">{claim.job_title || 'Non specifie'}</p>
                        {(claim.claimer_type || claim.claimer_title) && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Type: {claim.claimer_type || 'Non precise'}
                            {claim.claimer_title ? ` - ${claim.claimer_title}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Email direct</label>
                        <p className="text-xl font-bold text-primary underline decoration-primary/30 underline-offset-4">{claim.email}</p>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Telephone personnel</label>
                        <p className="text-xl font-bold">{claim.personal_phone || claim.phone || 'Non renseigne'}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="message" className="space-y-6">
                  <div className="rounded-[2rem] border border-border/10 bg-muted/20 p-8">
                    <h4 className="mb-4 flex items-center gap-2 font-bold">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      Note du demandeur
                    </h4>
                    <p className="leading-relaxed text-muted-foreground italic">
                      "{claim.message_to_admin || claim.message || "Aucun message particulier laisse pour l'administrateur."}"
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="border-t border-border/10 bg-muted/5 p-8">
              {claim.status === 'pending' ? (
                <div className="flex w-full items-center justify-between gap-4">
                  <Dialog
                    open={rejectingId === claim.id}
                    onOpenChange={(nextOpen) => {
                      if (!nextOpen) {
                        onRejectingIdChange(null);
                        onRejectionReasonChange('');
                        return;
                      }

                      onRejectingIdChange(claim.id);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="group h-14 rounded-2xl px-8 font-bold text-rose-500 hover:bg-rose-500/10">
                        <UserX className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                        Refuser la demande
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-[2rem] p-8">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Raison du refus</DialogTitle>
                        <DialogDescription className="text-lg font-light italic">Le demandeur sera notifie par email.</DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Textarea
                          placeholder="Precisez la raison (ex: document flou, email non professionnel...)"
                          value={rejectionReason}
                          onChange={(event) => onRejectionReasonChange(event.target.value)}
                          className="min-h-32 rounded-2xl border-border/20 bg-muted/30 p-4 focus:ring-primary/20"
                        />
                      </div>
                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                          variant="outline"
                          className="h-12 rounded-xl"
                          onClick={() => {
                            onRejectingIdChange(null);
                            onRejectionReasonChange('');
                          }}
                        >
                          Ignorer
                        </Button>
                        <Button
                          variant="destructive"
                          className="h-12 rounded-xl bg-rose-500 px-8 font-bold hover:bg-rose-600"
                          onClick={() => onReject(claim.id, rejectionReason)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Confirmer le rejet
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <div className="flex gap-4">
                    <Button variant="outline" className="h-14 rounded-2xl px-8 font-bold text-foreground/70" onClick={() => onOpenChange(false)}>
                      Plus tard
                    </Button>
                    <Button
                      className="group relative h-14 overflow-hidden rounded-2xl bg-emerald-500 px-12 font-bold text-white shadow-xl shadow-emerald-500/20 hover:bg-emerald-600"
                      onClick={() => onApprove(claim.id)}
                      disabled={isSubmitting}
                    >
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <ShieldCheck className="mr-2 h-5 w-5 shadow-emerald-700/50" />
                      )}
                      Approuver la propriete
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center p-2">
                  <Badge className="rounded-full border-blue-500/20 bg-blue-500/10 px-8 py-3 font-bold text-blue-600">
                    <Check className="mr-2 h-4 w-4" />
                    CE DOSSIER A ETE ARCHIVE LE {format(new Date(claim.reviewed_at || claim.created_at), 'dd/MM/yyyy')}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
