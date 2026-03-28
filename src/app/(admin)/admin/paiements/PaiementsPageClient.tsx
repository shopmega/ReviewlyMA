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
  ChevronLeft,
  ShieldCheck,
  RefreshCw,
  Calendar,
  Wallet
} from "lucide-react";
import { useState, useEffect } from "react";
import { format, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { verifyOfflinePayment, rejectOfflinePayment, addManualPayment } from "@/app/actions/admin";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  ManualPaymentDialog,
  PaymentStatusBadge,
  RejectPaymentDialog,
} from "@/components/admin/payments/PaymentAdminComponents";
import { useAdminPagination } from "@/hooks/use-admin-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { fetchAdminPayments, fetchAdminPaymentStats, type AdminPayment as Payment } from "@/lib/data/admin-payments";

export default function PaiementsPageClient() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

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
  const { t } = useI18n();
  const debouncedSearchTerm = useDebouncedValue(searchTerm);
  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    pageStart,
    pageEnd,
    rangeFrom,
    rangeTo,
  } = useAdminPagination({
    totalCount,
    resetDeps: [statusFilter, debouncedSearchTerm],
  });

  useEffect(() => {
    loadPayments();
  }, [currentPage, pageSize, statusFilter, debouncedSearchTerm]);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadPayments() {
    setLoading(true);
    const { data, error, count } = await fetchAdminPayments({
      searchQuery: debouncedSearchTerm,
      statusFilter,
      rangeFrom,
      rangeTo,
    });
    if (!error) {
      setPayments(data);
      setTotalCount(count);
    } else {
      toast({ title: t('common.error', 'Erreur'), description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  }

  async function loadStats() {
    const stats = await fetchAdminPaymentStats();
    setPendingCount(stats.pendingCount);
    setTotalRevenue(stats.totalRevenue);
  }

  const handleVerify = async (id: string) => {
    setIsSubmitting(true);
    const result = await verifyOfflinePayment(id);
    if (result.status === 'success') {
      toast({ title: t('adminPayments.toast.verifiedTitle', 'Bonne nouvelle !'), description: t('adminPayments.toast.verifiedDesc', 'Paiement verifie et statut Premium active.') });
      loadPayments();
      loadStats();
    } else {
      toast({ title: t('common.error', 'Erreur'), description: result.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason) {
      toast({ title: t('adminPayments.toast.warningTitle', 'Attention'), description: t('adminPayments.toast.rejectReasonRequired', 'Veuillez fournir une raison pour le rejet.'), variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const result = await rejectOfflinePayment(id, rejectionReason);
    if (result.status === 'success') {
      toast({ title: t('adminPayments.toast.actionDoneTitle', 'Action effectuee'), description: t('adminPayments.toast.rejectedDesc', 'Paiement rejete.') });
      setRejectingId(null);
      setRejectionReason('');
      loadPayments();
      loadStats();
    } else {
      toast({ title: t('common.error', 'Erreur'), description: result.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleAddManual = async () => {
    if (!manualData.userEmail || !manualData.reference) {
      toast({ title: t('adminPayments.toast.missingFieldsTitle', 'Champs manquants'), description: t('adminPayments.toast.missingFieldsDesc', 'Email et Reference sont obligatoires.'), variant: 'destructive' });
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
      toast({ title: t('common.success', 'Succes'), description: t('adminPayments.toast.manualSuccess', 'Abonnement manuel active avec succes.') });
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
      loadStats();
    } else {
      toast({ title: t('adminPayments.toast.technicalErrorTitle', 'Erreur technique'), description: result.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const formatPaymentMethod = (method?: string | null) => {
    if (!method) return t('adminPayments.method.notProvided', 'Methode non renseignee');
    return method
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const getExpiryText = (payment: Payment) => {
    if (payment.expires_at) {
      return {
        label: `Exp: ${format(new Date(payment.expires_at), 'dd/MM/yy')}`,
        className:
          new Date(payment.expires_at) < new Date()
            ? 'text-rose-500'
            : 'text-emerald-500',
      };
    }

    if (payment.status === 'pending') {
      return {
        label: 'Activation apres verification',
        className: 'text-amber-600',
      };
    }

    if (payment.status === 'rejected') {
      return {
        label: 'Refuse',
        className: 'text-rose-500',
      };
    }

    return {
      label: 'Expiration non definie',
      className: 'text-muted-foreground italic',
    };
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
        <div className="space-y-2">
          <Badge className="bg-primary/10 text-primary border-none font-bold px-3 py-1 uppercase tracking-wider text-[10px]">{t('adminPayments.badge', 'Facturation & Chiffre affaires')}</Badge>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            {t('adminPayments.titlePrefix', 'Paiements')} <span className="text-primary italic">{t('adminPayments.titleAccent', 'GOLD')}</span>
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> {pendingCount > 0 ? `${pendingCount} ${t('adminPayments.pendingTransfers', 'virements en attente de verification')}` : t('adminPayments.allUpToDate', 'Tous les paiements sont a jour')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl h-12 w-12 hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
            onClick={() => {
              loadPayments();
              loadStats();
            }}
          >
            <RefreshCw className={cn("h-5 w-5", loading ? "animate-spin" : "")} />
          </Button>
          <Button
            className="rounded-2xl bg-primary px-8 text-white font-black shadow-lg shadow-primary/20 transition-all hover:scale-105 hover:bg-primary/90 active:scale-95 h-12"
            onClick={() => setShowManualModal(true)}
          >
            <Plus size={18} className="mr-2" /> {t('adminPayments.manual.activateButton', 'Activer un Premium')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-emerald-500/20 text-emerald-600">{t('adminPayments.kpi.revenue', 'Revenu')}</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{totalRevenue.toLocaleString()} MAD</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('adminPayments.kpi.totalVerified', 'Total verifie a vie')}</p>
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
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('adminPayments.kpi.pendingActions', 'Actions en attente')}</p>
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
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('adminPayments.kpi.avgBasket', 'Panier Moyen (MAD)')}</p>
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
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('adminPayments.kpi.conversion', 'Conversion Premium')}</p>
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
                  placeholder={t('adminPayments.searchPlaceholder', 'Email, reference ou entreprise...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-12 bg-white/50 dark:bg-slate-950/50 border-border/20 rounded-2xl focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SegmentedControl
                  className="border-0 bg-transparent p-0"
                  buttonClassName="rounded-xl font-bold text-[10px] uppercase tracking-widest px-4 h-9 shadow-sm transition-all"
                  items={[
                    { key: 'all', label: t('adminPayments.filters.all', 'Tous les flux'), active: statusFilter === 'all', onClick: () => setStatusFilter('all') },
                    { key: 'pending', label: t('adminPayments.filters.pending', 'Attente'), active: statusFilter === 'pending', onClick: () => setStatusFilter('pending') },
                    { key: 'verified', label: t('adminPayments.filters.verified', 'Verifies'), active: statusFilter === 'verified', onClick: () => setStatusFilter('verified') },
                    { key: 'rejected', label: t('adminPayments.filters.rejected', 'Refuses'), active: statusFilter === 'rejected', onClick: () => setStatusFilter('rejected') },
                  ]}
                />

                {searchTerm !== '' && (
                  <Button variant="link" size="sm" onClick={() => setSearchTerm('')} className="text-[10px] font-bold text-muted-foreground uppercase px-2">{t('adminPayments.clear', 'Effacer')}</Button>
                )}
              </div>
            </div>

            <div className="hidden lg:flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-widest antialiased">{t('adminPayments.sync.title', 'Stripe/Manual Sync')}</span>
              </div>
              <span className="text-[9px] font-bold text-muted-foreground uppercase animate-pulse">{t('adminPayments.sync.subtitle', 'Live Gateway Feed')}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
              <div className="h-12 w-12 border-b-2 border-primary border-t-2 border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground font-black animate-pulse uppercase tracking-widest text-[10px]">{t('adminPayments.loading', 'Processing Gateway...')}</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-40 space-y-6">
              <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto border border-dashed border-border/60">
                <CreditCard className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <p className="text-2xl font-black">{t('adminPayments.empty', 'Aucun paiement trouve')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/10">
                    <TableHead className="py-6 pl-8 font-bold uppercase tracking-widest text-[10px]">{t('adminPayments.table.client', 'Client & Compte')}</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">{t('adminPayments.table.transaction', 'Transaction')}</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">{t('adminPayments.table.period', 'Periode')}</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">{t('adminPayments.table.status', 'Statut')}</TableHead>
                    <TableHead className="text-right pr-8 font-bold uppercase tracking-widest text-[10px]">{t('adminPayments.table.decision', 'Decision')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="group border-b border-border/10 hover:bg-muted/40 transition-all duration-300">
                      <TableCell className="py-6 pl-8">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 dark:text-white text-sm group-hover:text-primary transition-colors">{payment.profiles?.full_name?.trim() || payment.profiles?.email?.split('@')?.[0] || t('adminPayments.userFallback', 'Utilisateur')}</span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight opacity-70">{payment.profiles?.email || t('adminPayments.emailUnavailable', 'Email indisponible')}</span>
                          <span className="text-[9px] font-black text-indigo-500 mt-1 uppercase tracking-widest flex items-center gap-1">
                            <History className="h-2 w-2" /> {payment.businesses?.name || (payment.status === 'pending' ? t('adminPayments.verificationInProgress', 'Verification en cours') : t('adminPayments.businessUnlinked', 'Entreprise non associee'))}
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
                          <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-widest">{formatPaymentMethod(payment.payment_method)} • {payment.payment_reference || t('adminPayments.referenceMissing', 'Reference manquante')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-black tabular-nums">{format(new Date(payment.created_at), 'dd/MM/yyyy')}</span>
                          <div className="mt-1 flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground opacity-50" />
                            {(() => {
                              const expiryInfo = getExpiryText(payment);
                              return (
                                <span className={cn("text-[9px] font-black uppercase tracking-widest", expiryInfo.className)}>
                                  {expiryInfo.label}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={payment.status} t={t} />
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
                              <Check className="mr-1 h-3 w-3" /> {t('adminPayments.actions.validate', 'Valider')}
                            </Button>

                            <RejectPaymentDialog
                              open={rejectingId === payment.id}
                              reason={rejectionReason}
                              loading={isSubmitting}
                              onOpenChange={(open) => {
                                if (!open) {
                                  setRejectingId(null);
                                  setRejectionReason('');
                                } else {
                                  setRejectingId(payment.id);
                                }
                              }}
                              onReasonChange={setRejectionReason}
                              onConfirm={() => handleReject(payment.id)}
                              t={t}
                              trigger={
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-10 w-10 rounded-xl p-0 text-rose-500 hover:bg-rose-500/10"
                                  disabled={isSubmitting}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              }
                            />
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
          {!loading && totalCount > 0 && (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t border-border/10 p-4 md:p-6">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {t('adminPayments.pagination.showing', 'Affichage')} {pageStart + 1}-{Math.min(pageEnd, totalCount)} {t('adminPayments.pagination.of', 'sur')} {totalCount}
              </div>

              <div className="flex items-center gap-3">
                <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="w-[120px] h-9 rounded-xl bg-white/50 border-border/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/10">
                    <SelectItem value="20">20 / {t('adminPayments.pagination.perPage', 'page')}</SelectItem>
                    <SelectItem value="50">50 / {t('adminPayments.pagination.perPage', 'page')}</SelectItem>
                    <SelectItem value="100">100 / {t('adminPayments.pagination.perPage', 'page')}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="text-xs font-black tabular-nums px-2">
                  {t('adminPayments.pagination.page', 'Page')} {currentPage} / {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t('adminPayments.pagination.previous', 'Precedent')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  {t('adminPayments.pagination.next', 'Suivant')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ManualPaymentDialog
        open={showManualModal}
        draft={manualData}
        loading={isSubmitting}
        onOpenChange={setShowManualModal}
        onDraftChange={setManualData}
        onSubmit={handleAddManual}
        t={t}
      />
    </div>
  );
}
