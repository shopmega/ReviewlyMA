'use client';

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Check,
  X,
  MessageSquare,
  Trash2,
  ExternalLink,
  Clock3,
  Search,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { BulkActions } from "@/components/admin/BulkActions";
import { bulkDeleteReviews, bulkUpdateReviews } from "@/app/actions/admin-bulk";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/i18n-provider";
import { AdminReviewFilterBadge, AdminReviewInlineRating, AdminReviewKpiCard, AdminReviewSlaBadge, AdminReviewStatusBadge, AdminReviewSubratings } from "@/components/admin/reviews/AdminReviewComponents";
import { AppEmptyState } from "@/components/shared/AppEmptyState";
import { PageIntro } from "@/components/shared/PageIntro";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { useAdminPagination } from "@/hooks/use-admin-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  ACTIVE_ADMIN_REVIEW_STATUSES as ACTIVE_REVIEW_STATUSES,
  fetchAdminReviews,
  fetchAdminReviewStats,
  type AdminReview as Review,
} from "@/lib/data/admin-reviews";

export default function AllReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [queueFilter, setQueueFilter] = useState<'all' | 'active' | 'at_risk' | 'breached'>('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    breached: 0,
    atRisk: 0,
    avgAgeHours: 0,
  });
  const { toast } = useToast();
  const { t } = useI18n();
  const now = Date.now();
  const debouncedSearch = useDebouncedValue(searchQuery);
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
    resetDeps: [queueFilter, debouncedSearch],
  });

  // Fetch reviews with pagination
  useEffect(() => {
    fetchReviews();
  }, [currentPage, pageSize, queueFilter, debouncedSearch]);

  // Fetch stats once
  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setStats(await fetchAdminReviewStats());
  }

  async function fetchReviews() {
    setLoading(true);
    const { data, error, count } = await fetchAdminReviews({
      searchQuery: debouncedSearch,
      queueFilter,
      rangeFrom,
      rangeTo,
    });

    if (!error && data) {
      setReviews(data);
      setTotalCount(count);
    }
    setLoading(false);
  }

  const updateStatus = async (id: number, status: 'published' | 'rejected') => {
    let reason: string | undefined;

    if (status === 'rejected') {
      const input = window.prompt(t('adminReviews.prompt.rejectReason', 'Raison obligatoire pour rejeter cet avis:'));
      if (input === null) return;
      reason = input.trim();
      if (!reason) {
        toast({ title: t('common.error', 'Erreur'), description: t('adminReviews.toast.rejectReasonRequired', 'La raison est obligatoire pour rejeter un avis.'), variant: 'destructive' });
        return;
      }
    }

    const result = await bulkUpdateReviews([id], { status, reason });
    if (!result.success) {
      toast({ title: t('common.error', 'Erreur'), description: result.message, variant: 'destructive' });
      return;
    }

    toast({ title: t('common.success', 'Succes'), description: `${t('adminReviews.toast.statusUpdated', 'Statut mis a jour :')} ${status}` });
    fetchReviews();
    fetchStats();
  };

  const deleteReview = async (id: number) => {
    const input = window.prompt(t('adminReviews.prompt.deleteReason', 'Raison obligatoire pour retirer cet avis:'));
    if (input === null) return;
    const reason = input.trim();
    if (!reason) {
      toast({ title: t('common.error', 'Erreur'), description: t('adminReviews.toast.deleteReasonRequired', 'La raison est obligatoire pour retirer un avis.'), variant: 'destructive' });
      return;
    }

    if (!confirm(t('adminReviews.prompt.confirmDelete', 'Confirmer le retrait de cet avis ?'))) return;

    const result = await bulkDeleteReviews([id], reason);
    if (!result.success) {
      toast({ title: t('common.error', 'Erreur'), description: result.message, variant: 'destructive' });
      return;
    }

    toast({ title: t('common.success', 'Succes'), description: t('adminReviews.toast.reviewRemoved', 'Avis retire.') });
    fetchReviews();
    fetchStats();
  };

  const getSlaState = (review: Review): 'no_sla' | 'healthy' | 'at_risk' | 'breached' => {
    if (!ACTIVE_REVIEW_STATUSES.includes(review.status)) return 'no_sla';
    if (!review.moderation_sla_due_at) return 'no_sla';
    const msLeft = new Date(review.moderation_sla_due_at).getTime() - now;
    if (msLeft < 0) return 'breached';
    if (msLeft <= 12 * 60 * 60 * 1000) return 'at_risk';
    return 'healthy';
  };

  // Client-side SLA filtering for at_risk and breached (can't do at DB level)
  const displayReviews = useMemo(() => {
    if (queueFilter === 'at_risk') return reviews.filter((r) => getSlaState(r) === 'at_risk');
    if (queueFilter === 'breached') return reviews.filter((r) => getSlaState(r) === 'breached');
    return reviews;
  }, [reviews, queueFilter, now]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageIntro
        badge={t('adminReviews.badge', 'Moderation Contenu')}
        title={
          <>
            {t('adminReviews.titlePrefix', 'Gestion des')} <span className="text-primary italic">{t('adminReviews.titleAccent', 'Avis')}</span>
          </>
        }
        description={
          <span className="inline-flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> {stats.total} {t('adminReviews.totalSuffix', 'avis au total sur la plateforme')}
          </span>
        }
        className="rounded-3xl border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminReviewKpiCard
          icon={Activity}
          value={stats.active}
          title={t('adminReviews.kpi.activeQueue', 'File active moderation')}
          iconWrapClassName="bg-blue-500/10 text-blue-500"
          badge={<AdminReviewFilterBadge tone="queue">{t('adminReviews.kpi.queueBadge', 'File')}</AdminReviewFilterBadge>}
        />
        <AdminReviewKpiCard
          icon={ShieldAlert}
          value={stats.breached}
          title={t('adminReviews.kpi.slaBreached', 'SLA depasses')}
          iconWrapClassName="bg-rose-500/10 text-rose-500"
          badge={<AdminReviewFilterBadge tone="urgent">{t('adminReviews.kpi.urgentBadge', 'Urgent')}</AdminReviewFilterBadge>}
        />
        <AdminReviewKpiCard
          icon={AlertTriangle}
          value={stats.atRisk}
          title={t('adminReviews.kpi.slaAtRisk', 'SLA a risque (<12h)')}
          iconWrapClassName="bg-amber-500/10 text-amber-500"
          badge={<AdminReviewFilterBadge tone="attention">{t('adminReviews.kpi.attentionBadge', 'Attention')}</AdminReviewFilterBadge>}
        />
        <AdminReviewKpiCard
          icon={Clock3}
          value={`${stats.avgAgeHours}h`}
          title={t('adminReviews.kpi.avgQueueAge', 'Age moyen file')}
          iconWrapClassName="bg-indigo-500/10 text-indigo-500"
        />
      </div>

      {/* Main Table Card */}
      <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-8 border-b border-border/10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="relative w-full lg:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder={t('adminReviews.searchPlaceholder', 'Rechercher par auteur ou titre...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-white/50 dark:bg-slate-950/50 border-border/20 rounded-2xl focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <SegmentedControl
                  items={[
                    { key: 'all', label: `${t('adminReviews.filters.all', 'Tous')} (${stats.total})`, active: queueFilter === 'all', onClick: () => setQueueFilter('all') },
                    { key: 'active', label: `${t('adminReviews.filters.active', 'Actifs')} (${stats.active})`, active: queueFilter === 'active', onClick: () => setQueueFilter('active') },
                    { key: 'at_risk', label: `${t('adminReviews.filters.atRisk', 'A risque')} (${stats.atRisk})`, active: queueFilter === 'at_risk', onClick: () => setQueueFilter('at_risk') },
                    { key: 'breached', label: `${t('adminReviews.filters.breached', 'SLA depasses')} (${stats.breached})`, active: queueFilter === 'breached', onClick: () => setQueueFilter('breached') },
                  ]}
                  className="rounded-xl border-border/20 bg-white/30 dark:bg-slate-950/20"
                  buttonClassName="rounded-lg font-bold text-[10px] uppercase tracking-widest px-4 h-9 shadow-none"
                />

                {searchQuery !== '' && (
                  <Button variant="link" size="sm" onClick={() => setSearchQuery('')} className="text-[10px] font-bold text-muted-foreground uppercase px-2">{t('adminReviews.clear', 'Effacer')}</Button>
                )}
              </div>
            </div>

            <BulkActions
              reviews={displayReviews}
              businesses={[]}
              onReviewsUpdate={() => { fetchReviews(); fetchStats(); }}
              onBusinessesUpdate={() => { }}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
              <div className="h-12 w-12 border-b-2 border-primary border-t-2 border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground font-black animate-pulse uppercase tracking-widest text-[10px]">{t('adminReviews.loading', 'Chargement des avis...')}</p>
            </div>
          ) : displayReviews.length === 0 ? (
            <div className="p-8">
              <AppEmptyState
                className="border-0 bg-transparent shadow-none"
                icon={<MessageSquare className="h-8 w-8 text-muted-foreground/50" />}
                title={t('adminReviews.emptyTitle', 'Aucun avis trouve')}
                description={t('adminReviews.emptyDesc', 'Modifiez vos filtres ou attendez de nouveaux avis.')}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/10">
                    <TableHead className="py-6 pl-8 font-bold uppercase tracking-widest text-[10px]">{t('adminReviews.table.business', 'Etablissement')}</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">{t('adminReviews.table.author', 'Auteur')}</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">{t('adminReviews.table.rating', 'Note')}</TableHead>
                    <TableHead className="hidden lg:table-cell font-bold uppercase tracking-widest text-[10px]">{t('adminReviews.table.subratings', 'Sous-notes')}</TableHead>
                    <TableHead className="hidden md:table-cell font-bold uppercase tracking-widest text-[10px]">{t('adminReviews.table.review', 'Avis')}</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">{t('adminReviews.table.status', 'Statut')}</TableHead>
                    <TableHead className="hidden lg:table-cell font-bold uppercase tracking-widest text-[10px]">{t('adminReviews.table.sla', 'SLA')}</TableHead>
                    <TableHead className="text-right pr-8 font-bold uppercase tracking-widest text-[10px]">{t('adminReviews.table.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayReviews.map((review) => {
                    const sla = getSlaState(review);
                    return (
                      <TableRow
                        key={review.id}
                        className={cn(
                          "group border-b border-border/10 transition-all duration-300",
                          sla === 'breached' ? "bg-rose-500/5 hover:bg-rose-500/10" : "hover:bg-muted/40"
                        )}
                      >
                        <TableCell className="py-6 pl-8">
                          <div className="flex flex-col">
                            <span className="font-black text-sm text-slate-800 dark:text-white group-hover:text-primary transition-colors">{review.businesses?.name || review.business_id}</span>
                            <Link href={`/businesses/${review.business_id}`} className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-0.5 font-bold">
                              Voir la page <ExternalLink className="h-2 w-2" />
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-sm">{review.author_name}</span>
                        </TableCell>
                        <TableCell>
                          <AdminReviewInlineRating rating={review.rating} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <AdminReviewSubratings
                            subRatings={review.sub_ratings}
                            labels={{
                              workLife: t('adminReviews.subrating.workLife', 'Equilibre'),
                              management: t('adminReviews.subrating.management', 'Mgmt'),
                              career: t('adminReviews.subrating.career', 'Carriere'),
                              culture: t('adminReviews.subrating.culture', 'Culture'),
                            }}
                          />
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-xs">
                          <div className="text-xs font-bold truncate">{review.title}</div>
                          <div className="text-[10px] text-muted-foreground line-clamp-1">{review.content}</div>
                        </TableCell>
                        <TableCell>
                          <AdminReviewStatusBadge
                            status={review.status}
                            labels={{
                              pending: t('adminReviews.status.pending', 'En attente'),
                              toReview: t('adminReviews.status.toReview', 'A revoir'),
                              validated: t('adminReviews.status.validated', 'Valide'),
                              published: t('adminReviews.status.published', 'Publie'),
                              investigation: t('adminReviews.status.investigation', 'Investigation'),
                              rejected: t('adminReviews.status.rejected', 'Rejete'),
                              removed: t('adminReviews.status.removed', 'Retire'),
                            }}
                          />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <AdminReviewSlaBadge
                            state={sla}
                            dueAt={review.moderation_sla_due_at}
                            labels={{
                              atRisk: t('adminReviews.sla.atRisk', 'A risque'),
                              breached: t('adminReviews.sla.breached', 'Depasse'),
                              due: t('adminReviews.sla.due', 'Ech'),
                              none: '—',
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                            {review.status !== 'published' && review.status !== 'deleted' && (
                              <Button size="sm" className="h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase shadow-lg shadow-emerald-500/10" onClick={() => updateStatus(review.id, 'published')} title={t('adminReviews.actions.publish', 'Publier')}>
                                <Check className="mr-1 h-3 w-3" /> {t('adminReviews.actions.ok', 'OK')}
                              </Button>
                            )}
                            {review.status !== 'rejected' && review.status !== 'deleted' && (
                              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-amber-600 hover:bg-amber-500/10" onClick={() => updateStatus(review.id, 'rejected')} title={t('adminReviews.actions.reject', 'Rejeter')}>
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                            {review.status !== 'deleted' && (
                              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-500/10" onClick={() => deleteReview(review.id)} title={t('adminReviews.actions.remove', 'Retirer')}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalCount > 0 && (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t border-border/10 p-4 md:p-6">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {t('adminReviews.pagination.showing', 'Affichage')} {pageStart + 1}-{Math.min(pageEnd, totalCount)} {t('adminReviews.pagination.of', 'sur')} {totalCount}
              </div>

              <div className="flex items-center gap-3">
                <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="w-[120px] h-9 rounded-xl bg-white/50 border-border/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/10">
                    <SelectItem value="20">20 / {t('adminReviews.pagination.perPage', 'page')}</SelectItem>
                    <SelectItem value="50">50 / {t('adminReviews.pagination.perPage', 'page')}</SelectItem>
                    <SelectItem value="100">100 / {t('adminReviews.pagination.perPage', 'page')}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="text-xs font-black tabular-nums px-2">
                  {t('adminReviews.pagination.page', 'Page')} {currentPage} / {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t('adminReviews.pagination.previous', 'Precedent')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  {t('adminReviews.pagination.next', 'Suivant')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
