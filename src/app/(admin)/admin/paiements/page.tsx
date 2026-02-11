'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  AlertTriangle,
  Clock,
  CreditCard,
  Loader2,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Plus,
  ArrowUpRight,
  History,
  MoreVertical,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Calendar,
  Wallet
} from "lucide-react";
import { useState, useEffect } from "react";
import { format, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { fetchPremiumPayments, verifyOfflinePayment, rejectOfflinePayment, addManualPayment } from "@/app/actions/admin";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Payment = {
  id: string;
  user_id: string;
  business_id: string | null;
  payment_reference: string;
  payment_method: string;
  amount_usd: number | null;
  currency: string;
  status: 'pending' | 'verified' | 'rejected' | 'refunded';
  notes: string | null;
  target_tier: 'growth' | 'gold' | null;
  created_at: string;
  expires_at: string | null;
  profiles: { email: string; full_name: string | null };
  businesses: { name: string } | null;
};

export default function PaiementsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Manual Payment State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualData, setManualData] = useState({
    userEmail: '',
    amount: '500',
    reference: '',
    method: 'transfer',
    duration: '12', // months
    tier: 'gold' as 'growth' | 'gold',
    notes: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setLoading(true);
    const result = await fetchPremiumPayments();
    if (result.status === 'success') {
      setPayments(result.data as Payment[]);
    } else {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
    }
    setLoading(false);
  }

  const handleVerify = async (id: string) => {
    setIsSubmitting(true);
    const result = await verifyOfflinePayment(id);
    if (result.status === 'success') {
      toast({ title: 'Bonne nouvelle !', description: 'Paiement vérifié et statut Premium activé.' });
      loadPayments();
    } else {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason) {
      toast({ title: 'Attention', description: 'Veuillez fournir une raison pour le rejet.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const result = await rejectOfflinePayment(id, rejectionReason);
    if (result.status === 'success') {
      toast({ title: 'Action effectuée', description: 'Paiement rejeté.' });
      setRejectingId(null);
      setRejectionReason('');
      loadPayments();
    } else {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleAddManual = async () => {
    if (!manualData.userEmail || !manualData.reference) {
      toast({ title: 'Champs manquants', description: 'Email et Référence sont obligatoires.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const expirationDate = addMonths(new Date(), parseInt(manualData.duration)).toISOString();

    const result = await addManualPayment({
      userEmail: manualData.userEmail,
      amount: parseFloat(manualData.amount),
      reference: manualData.reference,
      method: manualData.method,
      expirationDate,
      tier: manualData.tier,
      notes: manualData.notes
    });

    if (result.status === 'success') {
      toast({ title: 'Succès', description: 'Abonnement manuel activé avec succès.' });
      setShowManualModal(false);
      setManualData({
        userEmail: '',
        amount: '500',
        reference: '',
        method: 'transfer',
        duration: '12',
        tier: 'gold',
        notes: ''
      });
      loadPayments();
    } else {
      toast({ title: 'Erreur technique', description: result.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest animate-pulse">
            <Clock className="mr-1 h-3 w-3" /> En attente
          </Badge>
        );
      case 'verified':
        return (
          <Badge className="bg-emerald-500 text-white border-0 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/20">
            <Check className="mr-1 h-3 w-3" /> Vérifié
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-rose-500 text-white border-0 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest">
            <X className="mr-1 h-3 w-3" /> Rejeté
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="font-black text-[9px] uppercase tracking-widest">{status}</Badge>;
    }
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch =
      p.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.payment_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.businesses?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const totalRevenue = payments
    .filter(p => p.status === 'verified')
    .reduce((acc, curr) => acc + (curr.amount_usd || 0), 0);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
        <div className="space-y-2">
          <Badge className="bg-primary/10 text-primary border-none font-bold px-3 py-1 uppercase tracking-wider text-[10px]">Facturation & Chiffre d'affaires</Badge>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Paiements <span className="text-primary italic">GOLD</span>
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> {pendingCount > 0 ? `${pendingCount} virements en attente de vérification` : 'Tous les paiements sont à jour'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12 hover:bg-primary/10 hover:text-primary transition-all shadow-sm" onClick={loadPayments}>
            <RefreshCw className={cn("h-5 w-5", loading ? "animate-spin" : "")} />
          </Button>
          <Dialog open={showManualModal} onOpenChange={setShowManualModal}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white font-black px-8 h-12 rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                <Plus size={18} className="mr-2" /> Activer un Premium
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] border-0 bg-white dark:bg-slate-950 p-8 shadow-2xl overflow-y-auto max-w-lg max-h-[90vh]">
              <DialogHeader className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 mb-2">
                  <CreditCard className="h-8 w-8 text-primary" />
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight">Activation Manuelle</DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400 font-medium">
                  Enregistrez un paiement reçu hors-ligne pour activer un compte gold.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email du Propriétaire</Label>
                  <Input
                    placeholder="exemple@entreprise.com"
                    className="h-12 rounded-xl bg-slate-50 border-border/10 focus:ring-primary/20 font-bold"
                    value={manualData.userEmail}
                    onChange={(e) => setManualData({ ...manualData, userEmail: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Montant (MAD)</Label>
                    <Input
                      type="number"
                      className="h-12 rounded-xl bg-slate-50 border-border/10 focus:ring-primary/20 font-black tabular-nums"
                      value={manualData.amount}
                      onChange={(e) => setManualData({ ...manualData, amount: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Durée Pack</Label>
                    <Select
                      value={manualData.duration}
                      onValueChange={(val) => setManualData({ ...manualData, duration: val })}
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-border/10">
                        <SelectValue placeholder="Choisir" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="1">1 Mois</SelectItem>
                        <SelectItem value="6">6 Mois</SelectItem>
                        <SelectItem value="12">12 Mois (1 an)</SelectItem>
                        <SelectItem value="24">24 Mois (2 ans)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Type d'abonnement</Label>
                  <Select
                    value={manualData.tier}
                    onValueChange={(val: any) => setManualData({ ...manualData, tier: val })}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-border/10">
                      <SelectValue placeholder="Choisir un plan" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="growth">Business GROWTH (99/mo)</SelectItem>
                      <SelectItem value="gold">Business GOLD (299/mo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Référence Transaction</Label>
                  <Input
                    placeholder="Ex: VIR-55421-MAROC"
                    className="h-12 rounded-xl bg-slate-50 border-border/10 focus:ring-primary/20 font-mono"
                    value={manualData.reference}
                    onChange={(e) => setManualData({ ...manualData, reference: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="mt-8 gap-3">
                <Button variant="ghost" className="rounded-2xl font-bold px-8 h-12" onClick={() => setShowManualModal(false)}>Annuler</Button>
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-2xl font-black px-10 h-12 shadow-xl shadow-primary/20" onClick={handleAddManual} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />} Activer l'abonnement
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-emerald-500/20 text-emerald-600">Revenu</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{totalRevenue.toLocaleString()} MAD</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Total vérifié à vie</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-black tabular-nums">{pendingCount}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Actions en attente</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-black tabular-nums">500</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Panier Moyen (MAD)</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowUpRight className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-black tabular-nums">12%</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Conversion Premium</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-8 border-b border-border/10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="relative w-full lg:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Email, référence ou entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-12 bg-white/50 dark:bg-slate-950/50 border-border/20 rounded-2xl focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(['all', 'pending', 'verified', 'rejected'] as const).map((s) => (
                  <Button
                    key={s}
                    variant={statusFilter === s ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "rounded-xl font-bold text-[10px] uppercase tracking-widest px-4 h-9 shadow-sm transition-all",
                      statusFilter === s ? "shadow-primary/20" : "text-muted-foreground hover:bg-white/50"
                    )}
                  >
                    {s === 'all' ? 'Tous les flux' : s === 'pending' ? 'Attente' : s === 'verified' ? 'Vérifiés' : 'Refusés'}
                  </Button>
                ))}

                {searchTerm !== '' && (
                  <Button variant="link" size="sm" onClick={() => setSearchTerm('')} className="text-[10px] font-bold text-muted-foreground uppercase px-2">Effacer</Button>
                )}
              </div>
            </div>

            <div className="hidden lg:flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-widest antialiased">Stripe/Manual Sync</span>
              </div>
              <span className="text-[9px] font-bold text-muted-foreground uppercase animate-pulse">Live Gateway Feed</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
              <div className="h-12 w-12 border-b-2 border-primary border-t-2 border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground font-black animate-pulse uppercase tracking-widest text-[10px]">Processing Gateway...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-40 space-y-6">
              <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto border border-dashed border-border/60">
                <CreditCard className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <p className="text-2xl font-black">Aucun paiement trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/10">
                    <TableHead className="py-6 pl-8 font-bold uppercase tracking-widest text-[10px]">Client & Compte</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Transaction</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Période</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Statut</TableHead>
                    <TableHead className="text-right pr-8 font-bold uppercase tracking-widest text-[10px]">Décision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="group border-b border-border/10 hover:bg-muted/40 transition-all duration-300">
                      <TableCell className="py-6 pl-8">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 dark:text-white text-sm group-hover:text-primary transition-colors">{payment.profiles?.full_name || 'Sans Nom'}</span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight opacity-70">{payment.profiles?.email}</span>
                          <span className="text-[9px] font-black text-indigo-500 mt-1 uppercase tracking-widest flex items-center gap-1">
                            <History className="h-2 w-2" /> {payment.businesses?.name || 'Vérification en cours'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[9px] border-border/40 bg-white/50 text-muted-foreground py-0 h-5">#{payment.id.substring(0, 8)}</Badge>
                            <span className="text-xs font-black tabular-nums">{(payment.amount_usd || 0).toLocaleString()} MAD</span>
                            {payment.target_tier && (
                              <Badge className={cn(
                                "text-[9px] font-bold h-5 px-2",
                                payment.target_tier === 'gold' ? "bg-amber-600" : "bg-amber-400"
                              )}>
                                {payment.target_tier.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-widest">{payment.payment_method} • {payment.payment_reference}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-black tabular-nums">{format(new Date(payment.created_at), 'dd/MM/yyyy')}</span>
                          <div className="mt-1 flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground opacity-50" />
                            {payment.expires_at ? (
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest",
                                new Date(payment.expires_at) < new Date() ? "text-rose-500" : "text-emerald-500"
                              )}>
                                Exp: {format(new Date(payment.expires_at), 'dd/MM/yy')}
                              </span>
                            ) : <span className="text-[9px] font-bold text-muted-foreground italic">Non défini</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        {payment.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                            <Button
                              size="sm"
                              className="h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase shadow-lg shadow-emerald-500/10"
                              onClick={() => handleVerify(payment.id)}
                              disabled={isSubmitting}
                            >
                              <Check className="mr-1 h-3 w-3" /> Valider
                            </Button>

                            <Dialog open={rejectingId === payment.id} onOpenChange={(open) => {
                              if (!open) setRejectingId(null);
                              else setRejectingId(payment.id);
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-10 w-10 p-0 text-rose-500 hover:bg-rose-500/10 rounded-xl"
                                  disabled={isSubmitting}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="rounded-[2rem] p-8 overflow-y-auto max-h-[90vh]">
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-black">Refus de transaction</DialogTitle>
                                  <DialogDescription className="text-slate-600 font-medium">
                                    Pourquoi ce virement n'est-il pas validé ?
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="py-6">
                                  <Textarea
                                    placeholder="Ex: Référence introuvable, montant inférieur..."
                                    className="min-h-32 rounded-2xl bg-slate-50 border-border/10 p-4 font-bold"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                  />
                                </div>
                                <DialogFooter className="gap-2">
                                  <Button variant="ghost" className="rounded-xl h-12" onClick={() => setRejectingId(null)}>Annuler</Button>
                                  <Button
                                    className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-12 px-8 font-black shadow-xl shadow-rose-500/20"
                                    onClick={() => handleReject(payment.id)}
                                    disabled={isSubmitting || !rejectionReason}
                                  >
                                    Confirmer le Refus
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center pb-10">
        <Button variant="outline" className="rounded-2xl font-bold px-10 h-10 border-border/40 hover:bg-primary/5 hover:text-primary transition-all group">
          Charger l'historique complet <ChevronRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}
