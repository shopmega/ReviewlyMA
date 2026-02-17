'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, AlertTriangle, Clock, Shield, Loader2, Settings, Eye, Filter, ShieldCheck, MoreHorizontal, UserCheck, UserX, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { updateClaimStatus } from "@/app/actions/claim-admin";
import { bulkUpdateClaims } from "@/app/actions/admin-bulk";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStoragePublicUrl } from "@/lib/data";
import { isValidImageUrl, cn } from "@/lib/utils";

type ClaimData = {
  id: string;
  user_id?: string;
  business_id: string;
  full_name: string;
  job_title: string | null;
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
  reviewed_by?: string | null;
  rejection_reason?: string | null;
  businesses?: { name: string; logo_url?: string };
  proof_data?: Record<string, any>;
};

type Claim = ClaimData;

const PROOF_METHODS_CONFIG = [
  { value: 'email', label: '📧 Email professionnel' },
  { value: 'phone', label: '📱 Téléphone' },
  { value: 'document', label: '📄 Document officiel' },
  { value: 'video', label: '🎥 Vidéo rapide' },
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
      query = query.eq('status', 'pending');
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
      const supabase = createClient();
      const { error } = await supabase
        .from('site_settings')
        .update({ verification_methods: methods })
        .eq('id', 'main');

      if (error) {
        toast({ title: 'Erreur', description: 'Erreur lors de la sauvegarde.', variant: 'destructive' });
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

  const getProofBadges = (proofMethods?: string[], proofStatus?: Record<string, string>) => {
    if (!proofMethods || proofMethods.length === 0) return null;

    const proofIcons: Record<string, string> = {
      email: '📧',
      phone: '📱',
      document: '📄',
      video: '🎥',
    };

    return (
      <div className="flex flex-wrap gap-1">
        {proofMethods.map((method) => {
          const status = proofStatus?.[method] || 'pending';
          const isVerified = status === 'verified';

          return (
            <div key={method} className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-tighter font-bold border",
              isVerified ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-slate-500/5 text-slate-500 border-slate-500/10"
            )}>
              {proofIcons[method]} {method}
              {isVerified && <Check className="h-2.5 w-2.5" />}
            </div>
          );
        })}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 bg-yellow-500/5"><Clock className="mr-1 h-3 w-3" />En attente</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-500 text-white"><Shield className="mr-1 h-3 w-3" />Approuvée</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="bg-rose-500 text-white"><X className="mr-1 h-3 w-3" />Rejetée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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

  const pendingCount = claims.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-bold font-headline tracking-tight text-foreground">
            Modération des <span className="text-primary">revendications</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-lg font-light italic">
            Verification Hub • Authentifiez la propriété des entreprises.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="flex gap-2 bg-muted/30 p-1 rounded-xl border border-border/40 backdrop-blur-sm">
            <Button
              variant={filterStatus === 'pending' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterStatus('pending')}
              className="rounded-lg font-semibold"
            >
              En attente
            </Button>
            <Button
              variant={filterStatus === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterStatus('all')}
              className="rounded-lg font-semibold"
            >
              Tout voir
            </Button>
          </div>

          <Button variant="outline" size="icon" className="rounded-xl border-border/40 hover:bg-primary/10 transition-colors" onClick={() => setShowSettingsModal(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-border/40 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-emerald-400 to-blue-500 opacity-50" />

        <CardHeader className="flex flex-row items-center justify-between border-b border-border/20 py-6">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-headline">Demandes de propriété</CardTitle>
            <CardDescription className="text-muted-foreground">
              {claims.length} dossiers à vérifier
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
                    <TableHead className="text-right pr-6 font-bold text-foreground italic">Détails</TableHead>
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
                        {getProofBadges(claim.proof_methods, claim.proof_status)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground font-light text-sm">
                        {format(new Date(claim.created_at), 'dd MMM', { locale: fr })}
                      </TableCell>
                      <TableCell>{getStatusBadge(claim.status)}</TableCell>
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
                <p className="text-white font-bold text-sm">Prêt pour validation</p>
                <p className="text-emerald-400 text-[10px] uppercase tracking-widest font-bold">Action groupée active</p>
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

      {/* Claim Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl border-border/40 bg-background/95 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl p-0 overflow-y-auto max-h-[90vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>Détails de la revendication</DialogTitle>
            <DialogDescription>Information complète sur la demande de propriété d'établissement</DialogDescription>
          </DialogHeader>
          {selectedClaim && (
            <div className="flex flex-col h-full max-h-[90vh]">
              <div className="p-8 pb-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="relative z-10 flex justify-between items-start">
                  <div className="space-y-2">
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 mb-2">DOSSIER #{selectedClaim.id.substring(0, 8).toUpperCase()}</Badge>
                    <h2 className="text-3xl font-bold font-headline tracking-tighter text-foreground line-clamp-2">
                      {selectedClaim.businesses?.name}
                    </h2>
                    <p className="text-muted-foreground font-light text-lg">
                      Par <span className="font-semibold text-foreground">{selectedClaim.full_name}</span> • {selectedClaim.job_title || 'Propriétaire'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(selectedClaim.status)}
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">
                      Reçu le {format(new Date(selectedClaim.created_at), 'dd MMMM yyyy', { locale: fr })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-8 flex-1 overflow-y-auto min-h-[400px]">
                <Tabs defaultValue="proof" className="w-full">
                  <TabsList className="bg-muted/20 p-1 rounded-2xl border border-border/10 mb-8">
                    <TabsTrigger value="proof" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm px-8">Vérification & Preuves</TabsTrigger>
                    <TabsTrigger value="info" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm px-8">Informations de contact</TabsTrigger>
                    <TabsTrigger value="message" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm px-8">Message & Historique</TabsTrigger>
                  </TabsList>

                  <TabsContent value="proof" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-emerald-500/[0.03] border border-emerald-500/10 rounded-[2rem] p-6 space-y-4">
                        <h4 className="font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                          <ShieldCheck className="h-5 w-5" /> Score de confiance
                        </h4>
                        <div className="space-y-3">
                          {selectedClaim.proof_methods?.map((method) => {
                            const isVerified = selectedClaim.proof_status?.[method] === 'verified';
                            return (
                              <div key={method} className="flex items-center justify-between p-3 bg-background/50 rounded-xl border border-border/10">
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">{PROOF_METHODS_CONFIG.find(m => m.value === method)?.label.split(' ')[0]}</span>
                                  <span className="capitalize font-medium">{method}</span>
                                </div>
                                <Badge variant={isVerified ? "default" : "outline"} className={cn("px-4", isVerified ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "text-yellow-600 border-yellow-500/30")}>
                                  {isVerified ? 'Vérifié' : 'En attente'}
                                </Badge>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-bold text-foreground pl-2">Preuves multimédia</h4>
                        <div className="space-y-4">
                          {selectedClaim.proof_data?.document_uploaded && (
                            <div className="group relative overflow-hidden bg-background border border-border/40 rounded-3xl p-6 transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 cursor-pointer flex flex-col items-center justify-center gap-3 text-center border-dashed">
                              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                <Shield className="h-6 w-6" />
                              </div>
                              <div>
                                <p className="font-bold text-lg">Document Officiel</p>
                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">PDF / IMAGE • CLIQUEZ POUR VOIR</p>
                              </div>
                              <Button
                                variant="link"
                                className="text-primary font-bold"
                                disabled={openingProof === selectedClaim.id}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setOpeningProof(selectedClaim.id);
                                  try {
                                    const response = await fetch(`/api/proofs/${selectedClaim.id}`);
                                    if (!response.ok) throw new Error('Erreur lors de la récupération du fichier');

                                    const result = await response.json();
                                    if (result.signedUrls?.document) {
                                      window.open(result.signedUrls.document, '_blank');
                                    } else {
                                      toast({
                                        title: 'Fichier non trouvé',
                                        description: 'Le lien du document est manquant ou invalide.',
                                        variant: 'destructive'
                                      });
                                    }
                                  } catch (e) {
                                    toast({
                                      title: 'Erreur',
                                      description: 'Impossible d\'ouvrir le justificatif.',
                                      variant: 'destructive'
                                    });
                                  } finally {
                                    setOpeningProof(null);
                                  }
                                }}
                              >
                                {openingProof === selectedClaim.id ? (
                                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Chargement...</>
                                ) : (
                                  <>Ouvrir le justificatif <ExternalLink className="h-4 w-4 ml-1" /></>
                                )}
                              </Button>
                            </div>
                          )}

                          {selectedClaim.proof_data?.video_uploaded && (
                            <div className="group relative overflow-hidden bg-background border border-border/40 rounded-3xl p-6 transition-all hover:border-indigo-400/40 hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer flex flex-col items-center justify-center gap-3 text-center border-dashed border-indigo-200">
                              <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-600">
                                <Shield className="h-6 w-6" />
                              </div>
                              <div>
                                <p className="font-bold text-lg">Vidéo de vérification</p>
                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">MP4 / WEBM • CLIQUEZ POUR VOIR</p>
                              </div>
                              <Button
                                variant="link"
                                className="text-indigo-600 font-bold"
                                disabled={openingProof === selectedClaim.id}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setOpeningProof(selectedClaim.id);
                                  try {
                                    const response = await fetch(`/api/proofs/${selectedClaim.id}`);
                                    if (!response.ok) throw new Error('Erreur lors de la récupération du fichier');

                                    const result = await response.json();
                                    if (result.signedUrls?.video) {
                                      window.open(result.signedUrls.video, '_blank');
                                    } else {
                                      toast({
                                        title: 'Fichier non trouvé',
                                        description: 'Le lien de la vidéo est manquant ou invalide.',
                                        variant: 'destructive'
                                      });
                                    }
                                  } catch (e) {
                                    toast({
                                      title: 'Erreur',
                                      description: 'Impossible d\'ouvrir la vidéo.',
                                      variant: 'destructive'
                                    });
                                  } finally {
                                    setOpeningProof(null);
                                  }
                                }}
                              >
                                {openingProof === selectedClaim.id ? (
                                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Chargement...</>
                                ) : (
                                  <>Voir la vidéo <ExternalLink className="h-4 w-4 ml-1" /></>
                                )}
                              </Button>
                            </div>
                          )}

                          {!selectedClaim.proof_data?.document_uploaded && !selectedClaim.proof_data?.video_uploaded && (
                            <div className="h-32 bg-muted/20 border border-dashed border-border/60 rounded-3xl flex flex-col items-center justify-center text-muted-foreground italic text-sm">
                              Aucun fichier transmis
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="info" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="grid grid-cols-2 gap-8 py-4">
                      <div className="space-y-6">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-1 block">Nom complet</label>
                          <p className="text-xl font-bold">{selectedClaim.full_name}</p>
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-1 block">Poste occupé</label>
                          <p className="text-xl font-bold transition-all hover:text-primary">{selectedClaim.job_title || 'Non spécifié'}</p>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-1 block">Email Direct</label>
                          <p className="text-xl font-bold text-primary underline decoration-primary/30 underline-offset-4">{selectedClaim.email}</p>
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-1 block">Téléphone personnel</label>
                          <p className="text-xl font-bold">{selectedClaim.personal_phone || selectedClaim.phone || 'Non renseigné'}</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="message" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="bg-muted/20 border border-border/10 rounded-[2rem] p-8">
                      <h4 className="font-bold mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-primary" /> Note du demandeur
                      </h4>
                      <p className="text-muted-foreground leading-relaxed italic">
                        "{selectedClaim.message_to_admin || selectedClaim.message || 'Aucun message particulier laissé pour l\'administrateur.'}"
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="p-8 border-t border-border/10 bg-muted/5">
                {selectedClaim.status === 'pending' ? (
                  <div className="flex justify-between items-center w-full gap-4">
                    <Dialog open={rejectingId === selectedClaim.id} onOpenChange={(open) => {
                      if (!open) { setRejectingId(null); setRejectionReason(''); }
                      else { setRejectingId(selectedClaim.id); }
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="text-rose-500 hover:bg-rose-500/10 font-bold rounded-2xl h-14 px-8 group">
                          <UserX className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" /> Refuser la demande
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-[2rem] p-8 max-w-lg overflow-y-auto max-h-[90vh]">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-bold">Raison du refus</DialogTitle>
                          <DialogDescription className="text-lg font-light italic">Le demandeur sera notifié par email.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Textarea
                            placeholder="Précisez la raison (ex: Document flou, email non-professionnel...)"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="min-h-32 rounded-2xl bg-muted/30 border-border/20 p-4 focus:ring-primary/20"
                          />
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                          <Button variant="outline" className="rounded-xl h-12" onClick={() => { setRejectingId(null); setRejectionReason(''); }}>Ignorer</Button>
                          <Button variant="destructive" className="rounded-xl h-12 px-8 font-bold bg-rose-500 hover:bg-rose-600" onClick={() => updateStatus(selectedClaim.id, 'rejected', rejectionReason)} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmer le rejet
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <div className="flex gap-4">
                      <Button variant="outline" className="rounded-2xl h-14 px-8 font-bold text-foreground/70" onClick={() => setShowDetailModal(false)}>
                        Plus tard
                      </Button>
                      <Button className="rounded-2xl h-14 px-12 font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 group relative overflow-hidden"
                        onClick={() => updateStatus(selectedClaim.id, 'approved')} disabled={isSubmitting}>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                        {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5 shadow-emerald-700/50" />}
                        Approuver la propriété
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center p-2">
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 px-8 py-3 rounded-full font-bold">
                      <Check className="mr-2 h-4 w-4" /> CE DOSSIER A ÉTÉ ARCHIVÉ LE {format(new Date(selectedClaim.reviewed_at || selectedClaim.created_at), 'dd/MM/yyyy')}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="rounded-[2rem] p-8 overflow-y-auto max-h-[90vh]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold">Méthodes de vérification</DialogTitle>
            <DialogDescription className="text-lg font-light">
              Déterminez comment les pros prouvent leur identité.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {PROOF_METHODS_CONFIG.map((method) => (
              <div key={method.value} className="flex items-center justify-between p-4 bg-muted/20 border border-border/10 rounded-2xl group hover:bg-muted/30 transition-colors">
                <Label htmlFor={method.value} className="cursor-pointer font-bold flex items-center gap-3 text-lg">
                  {method.label}
                </Label>
                <Checkbox
                  id={method.value}
                  checked={tempProofMethods.includes(method.value)}
                  onCheckedChange={(checked) => {
                    if (checked) { setTempProofMethods([...tempProofMethods, method.value]); }
                    else { setTempProofMethods(tempProofMethods.filter(m => m !== method.value)); }
                  }}
                  className="h-6 w-6 rounded-lg border-primary/40 data-[state=checked]:bg-primary"
                />
              </div>
            ))}
          </div>
          <div className="mt-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 text-sm text-blue-600 dark:text-blue-400 font-medium">
            <p className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Note: Ces changements s'appliqueront instantanément sur le formulaire public.
            </p>
          </div>
          <DialogFooter className="mt-8 gap-3 sm:gap-0">
            <Button variant="ghost" className="rounded-xl h-12 px-6" onClick={() => { setTempProofMethods(activeProofMethods); setShowSettingsModal(false); }}>Annuler</Button>
            <Button className="rounded-xl h-12 px-8 font-bold bg-primary hover:bg-primary/90" onClick={() => saveVerificationSettings(tempProofMethods)} disabled={isSavingSettings}>
              {isSavingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />} Enregistrer les modifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
