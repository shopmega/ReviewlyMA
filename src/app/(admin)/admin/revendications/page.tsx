'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Loader2, Settings, Filter, ShieldCheck, MoreHorizontal, UserCheck, UserX } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { updateClaimStatus } from "@/app/actions/claim-admin-resilient";
import { bulkUpdateClaims } from "@/app/actions/admin-bulk";
import { updateSiteSettings } from "@/app/actions/admin";
import Image from "next/image";
import { getStoragePublicUrl } from "@/lib/data";
import { isValidImageUrl, cn } from "@/lib/utils";
import {
  ClaimDetailsDialog,
  ClaimProofBadges,
  ClaimStatusBadge,
  VerificationMethodsDialog,
} from "@/components/admin/claims/ClaimsAdminComponents";

type ClaimData = {
  id: string;
  user_id?: string;
  business_id: string;
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
  claim_state?: 'verification_pending' | 'verified' | 'verification_failed' | 'suspended' | 'revoked' | 'claim_requested' | 'unclaimed' | null;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  rejection_reason?: string | null;
  businesses?: { name: string; logo_url?: string };
  proof_data?: Record<string, any>;
};

type Claim = ClaimData;

const PROOF_METHODS_CONFIG = [
  { value: 'email', label: 'Email professionnel' },
  { value: 'phone', label: 'Telephone' },
  { value: 'document', label: 'Document officiel' },
  { value: 'video', label: 'Video rapide' },
];

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all'>('pending');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeProofMethods, setActiveProofMethods] = useState<string[]>(['email', 'phone', 'document', 'video']);
  const [tempProofMethods, setTempProofMethods] = useState<string[]>(['email', 'phone', 'document', 'video']);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [openingProof, setOpeningProof] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchClaims();
    loadVerificationSettings();
  }, [filterStatus]);

  async function loadVerificationSettings() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('verification_methods')
      .eq('id', 'main')
      .single();

    if (!error && data?.verification_methods) {
      setActiveProofMethods(data.verification_methods);
      setTempProofMethods(data.verification_methods);
    }
  }

  async function fetchClaims() {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from('business_claims')
      .select('*, businesses(name, logo_url), proof_methods, proof_status, proof_data')
      .order('created_at', { ascending: false });

    if (filterStatus === 'pending') {
      query = query.or('claim_state.eq.verification_pending,status.eq.pending');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching claims:', error);
    }
    if (data) {
      setClaims(data as Claim[]);
    }
    setLoading(false);
  }

  async function saveVerificationSettings(methods: string[]) {
    if (methods.length === 0) {
      toast({ title: 'Erreur', description: 'Au moins une méthode doit être active.', variant: 'destructive' });
      return;
    }

    setIsSavingSettings(true);
    try {
      const result = await updateSiteSettings({ verification_methods: methods });

      if (result.status !== 'success') {
        toast({ title: 'Erreur', description: result.message || 'Erreur lors de la sauvegarde.', variant: 'destructive' });
        return;
      }

      setActiveProofMethods(methods);
      toast({ title: 'Succès', description: 'Paramètres de vérification sauvegardés.' });
      setShowSettingsModal(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: 'Erreur', description: 'Une erreur est survenue.', variant: 'destructive' });
    } finally {
      setIsSavingSettings(false);
    }
  }

  const updateStatus = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
    setIsSubmitting(true);

    try {
      const result = await updateClaimStatus(id, status, reason);

      if (result.status === 'success') {
        toast({ title: 'Succès', description: result.message });
        setRejectingId(null);
        setRejectionReason('');
        setShowDetailModal(false);
        fetchClaims();
      } else {
        toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('Error updating claim:', error);
      toast({ title: 'Erreur', description: error.message || 'Une erreur est survenue.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkAction = async (status: 'approved' | 'rejected') => {
    if (selectedIds.length === 0) return;

    setIsSubmitting(true);
    try {
      const result = await bulkUpdateClaims(selectedIds, status);
      if (result.success) {
        toast({
          title: "Action réussie",
          description: result.message,
        });
        setSelectedIds([]);
        fetchClaims();
      } else {
        toast({
          title: "Erreur",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openProofAsset = async (claimId: string, kind: 'document' | 'video') => {
    setOpeningProof(claimId);
    try {
      const response = await fetch(`/api/proofs/${claimId}`);
      if (!response.ok) {
        throw new Error('Erreur lors de la recuperation du fichier');
      }

      const result = await response.json();
      const proofUrl = result.signedUrls?.[kind];
      if (proofUrl) {
        window.open(proofUrl, '_blank');
        return;
      }

      toast({
        title: 'Fichier non trouve',
        description: kind === 'document'
          ? 'Le lien du document est manquant ou invalide.'
          : 'Le lien de la video est manquant ou invalide.',
        variant: 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: kind === 'document'
          ? "Impossible d'ouvrir le justificatif."
          : "Impossible d'ouvrir la video.",
        variant: 'destructive',
      });
    } finally {
      setOpeningProof(null);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === claims.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(claims.map(c => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const pendingCount = claims.filter(
    (c) => c.status === 'pending' || c.claim_state === 'verification_pending'
  ).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-bold font-headline tracking-tight text-foreground">
            Moderation des <span className="text-primary">revendications</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-lg font-light italic">
            Verification Hub - Authentifiez la propriete des entreprises.
          </p>
        </div>

        <div className="flex gap-4">
          <SegmentedControl
            className="rounded-xl bg-muted/30 border-border/40 backdrop-blur-sm"
            buttonClassName="rounded-lg font-semibold"
            items={[
              { key: 'pending', label: 'En attente', active: filterStatus === 'pending', onClick: () => setFilterStatus('pending') },
              { key: 'all', label: 'Tout voir', active: filterStatus === 'all', onClick: () => setFilterStatus('all') },
            ]}
          />

          <Button variant="outline" size="icon" className="rounded-xl border-border/40 hover:bg-primary/10 transition-colors" onClick={() => setShowSettingsModal(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-border/40 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-emerald-400 to-blue-500 opacity-50" />

        <CardHeader className="flex flex-row items-center justify-between border-b border-border/20 py-6">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-headline">Demandes de propriete</CardTitle>
            <CardDescription className="text-muted-foreground">
              {claims.length} dossiers a verifier
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="rounded-xl border-border/40 hover:bg-primary/10 transition-colors" onClick={fetchClaims}>
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="h-12 w-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-muted-foreground font-medium animate-pulse">Chargement des dossiers...</p>
            </div>
          ) : claims.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center border border-dashed border-border/60">
                <ShieldCheck className="h-10 w-10 opacity-30 px-3" />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold text-foreground">Aucune demande !</p>
                <p className="text-sm font-light">La file d'attente est vide.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b border-border/20 hover:bg-muted/30">
                    <TableHead className="w-10 pl-6">
                      <Checkbox
                        checked={selectedIds.length === claims.length && claims.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="rounded-md border-emerald-500/50 data-[state=checked]:bg-emerald-500"
                      />
                    </TableHead>
                    <TableHead className="font-bold text-foreground py-4">Demandeur & Entreprise</TableHead>
                    <TableHead className="hidden md:table-cell font-bold text-foreground">Preuves</TableHead>
                    <TableHead className="hidden lg:table-cell font-bold text-foreground">Date</TableHead>
                    <TableHead className="font-bold text-foreground">Statut</TableHead>
                    <TableHead className="text-right pr-6 font-bold text-foreground italic">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow
                      key={claim.id}
                      className={cn(
                        "group transition-colors duration-200 border-b border-border/10 cursor-pointer",
                        selectedIds.includes(claim.id) ? "bg-emerald-500/5" : "hover:bg-muted/20"
                      )}
                      onClick={() => {
                        setSelectedClaim(claim);
                        setShowDetailModal(true);
                      }}
                    >
                      <TableCell className="pl-6" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(claim.id)}
                          onCheckedChange={() => toggleSelect(claim.id)}
                          className="rounded-md border-border/60 group-hover:border-emerald-500/50 transition-colors"
                        />
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 flex-shrink-0">
                            {(() => {
                              const logoUrl = getStoragePublicUrl(claim.businesses?.logo_url || null);
                              if (logoUrl && isValidImageUrl(logoUrl)) {
                                return (
                                  <Image
                                    src={logoUrl}
                                    alt={claim.businesses?.name || claim.full_name}
                                    fill
                                    className="object-cover rounded-xl border border-border/30"
                                  />
                                );
                              }
                              return (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/10">
                                  {claim.businesses?.name ? claim.businesses.name[0].toUpperCase() : 'B'}
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex flex-col max-w-[200px]">
                            <span className="font-bold text-foreground tracking-tight truncate">{claim.full_name}</span>
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 tracking-tight truncate">{claim.businesses?.name}</span>
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">{claim.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <ClaimProofBadges proofMethods={claim.proof_methods} proofStatus={claim.proof_status} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground font-light text-sm">
                        {format(new Date(claim.created_at), 'dd MMM', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <ClaimStatusBadge status={claim.status} />
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-muted/80 text-muted-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in slide-in-from-bottom-8 duration-300">
          <div className="bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-2xl border border-emerald-500/30 p-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between">
            <div className="flex items-center gap-4 pl-4">
              <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/30 animate-pulse">
                {selectedIds.length}
              </div>
              <div>
                <p className="text-white font-bold text-sm">Pret pour validation</p>
                <p className="text-emerald-400 text-[10px] uppercase tracking-widest font-bold">Action groupee active</p>
              </div>
            </div>

            <div className="flex gap-2 pr-2">
              <Button
                variant="outline"
                className="rounded-2xl border-white/10 hover:bg-white/5 text-white/60 hover:text-white font-bold transition-all px-4 border-0 bg-transparent"
                onClick={() => setSelectedIds([])}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl border-rose-500/20 hover:bg-rose-500/10 text-rose-400 font-bold transition-all px-6"
                onClick={() => handleBulkAction('rejected')}
                disabled={isSubmitting}
              >
                <UserX className="mr-2 h-4 w-4" /> Rejeter
              </Button>
              <Button
                className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold px-8 shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
                onClick={() => handleBulkAction('approved')}
                disabled={isSubmitting}
              >
                <UserCheck className="mr-2 h-4 w-4" /> Approuver
              </Button>
            </div>
          </div>
        </div>
      )}

      <ClaimDetailsDialog
        claim={selectedClaim}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        rejectingId={rejectingId}
        onRejectingIdChange={setRejectingId}
        rejectionReason={rejectionReason}
        onRejectionReasonChange={setRejectionReason}
        onApprove={(claimId) => updateStatus(claimId, 'approved')}
        onReject={(claimId, reason) => updateStatus(claimId, 'rejected', reason)}
        isSubmitting={isSubmitting}
        openingProof={openingProof}
        onOpenProof={openProofAsset}
      />

      <VerificationMethodsDialog
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        tempProofMethods={tempProofMethods}
        activeProofMethods={activeProofMethods}
        onTempProofMethodsChange={setTempProofMethods}
        onSave={() => saveVerificationSettings(tempProofMethods)}
        isSaving={isSavingSettings}
      />
    </div>
  );
}
