'use client';

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Check,
  X,
  Star,
  MessageSquare,
  Trash2,
  ExternalLink,
  Clock3,
  ShieldAlert,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertTriangle,
  Loader2,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { StarRating } from "@/components/shared/StarRating";
import { BulkActions } from "@/components/admin/BulkActions";
import { createClient } from "@/lib/supabase/client";
import { bulkDeleteReviews, bulkUpdateReviews } from "@/app/actions/admin-bulk";
import { cn } from "@/lib/utils";

type Review = {
  id: number;
  business_id: string;
  author_name: string;
  rating: number;
  title: string | null;
  content: string | null;
  status:
  | 'draft'
  | 'submitted'
  | 'pending'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'hidden'
  | 'under_investigation'
  | 'edited_requires_review'
  | 'appealed'
  | 'restored'
  | 'deleted';
  date: string;
  created_at: string;
  moderation_sla_due_at?: string | null;
  reviewed_at?: string | null;
  sub_ratings?: {
    work_life_balance: number | null;
    management: number | null;
    career_growth: number | null;
    culture: number | null;
  } | null;
  businesses?: { name: string };
};

const ACTIVE_REVIEW_STATUSES: Review['status'][] = [
  'draft',
  'submitted',
  'pending',
  'edited_requires_review',
  'appealed',
  'under_investigation',
];

export default function AllReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [queueFilter, setQueueFilter] = useState<'all' | 'active' | 'at_risk' | 'breached'>('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    breached: 0,
    atRisk: 0,
    avgAgeHours: 0,
  });
  const { toast } = useToast();
  const now = Date.now();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [queueFilter, debouncedSearch, pageSize]);

  // Fetch reviews with pagination
  useEffect(() => {
    fetchReviews();
  }, [currentPage, pageSize, queueFilter, debouncedSearch]);

  // Fetch stats once
  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    const supabase = createClient();
    const { data: allReviews, error } = await supabase
      .from('reviews')
      .select('id, status, created_at, moderation_sla_due_at', { count: 'exact' });

    if (!error && allReviews) {
      const currentTime = Date.now();
      const active = allReviews.filter((r) => ACTIVE_REVIEW_STATUSES.includes(r.status));
      const breached = active.filter((r) => {
        if (!r.moderation_sla_due_at) return false;
        return new Date(r.moderation_sla_due_at).getTime() - currentTime < 0;
      });
      const atRisk = active.filter((r) => {
        if (!r.moderation_sla_due_at) return false;
        const msLeft = new Date(r.moderation_sla_due_at).getTime() - currentTime;
        return msLeft >= 0 && msLeft <= 12 * 60 * 60 * 1000;
      });
      const avgAge = active.length
        ? Math.round(active.reduce((acc, r) => acc + Math.max(0, (currentTime - new Date(r.created_at).getTime()) / (1000 * 60 * 60)), 0) / active.length)
        : 0;

      setStats({
        total: allReviews.length,
        active: active.length,
        breached: breached.length,
        atRisk: atRisk.length,
        avgAgeHours: avgAge,
      });
    }
  }

  async function fetchReviews() {
    setLoading(true);
    const supabase = createClient();
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('reviews')
      .select('*, sub_ratings, businesses(name)', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply queue filter at DB level where possible
    if (queueFilter === 'active') {
      query = query.in('status', ACTIVE_REVIEW_STATUSES);
    }

    // Apply search
    const q = debouncedSearch.trim();
    if (q) {
      const safeQ = q.replace(/,/g, ' ');
      query = query.or(`author_name.ilike.%${safeQ}%,title.ilike.%${safeQ}%`);
    }

    const { data, error, count } = await query.range(from, to);

    if (!error && data) {
      setReviews(data);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }

  const updateStatus = async (id: number, status: 'published' | 'rejected') => {
    let reason: string | undefined;

    if (status === 'rejected') {
      const input = window.prompt('Raison obligatoire pour rejeter cet avis:');
      if (input === null) return;
      reason = input.trim();
      if (!reason) {
        toast({ title: 'Erreur', description: 'La raison est obligatoire pour rejeter un avis.', variant: 'destructive' });
        return;
      }
    }

    const result = await bulkUpdateReviews([id], { status, reason });
    if (!result.success) {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Succès', description: `Statut mis à jour : ${status}` });
    fetchReviews();
    fetchStats();
  };

  const deleteReview = async (id: number) => {
    const input = window.prompt('Raison obligatoire pour retirer cet avis:');
    if (input === null) return;
    const reason = input.trim();
    if (!reason) {
      toast({ title: 'Erreur', description: 'La raison est obligatoire pour retirer un avis.', variant: 'destructive' });
      return;
    }

    if (!confirm('Confirmer le retrait de cet avis ?')) return;

    const result = await bulkDeleteReviews([id], reason);
    if (!result.success) {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Succès', description: 'Avis retiré.' });
    fetchReviews();
    fetchStats();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest"><Clock3 className="mr-1 h-3 w-3" /> En attente</Badge>;
      case 'draft':
      case 'submitted':
      case 'edited_requires_review':
      case 'appealed':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest"><Eye className="mr-1 h-3 w-3" /> À revoir</Badge>;
      case 'approved':
      case 'restored':
        return <Badge className="bg-emerald-500 text-white border-0 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest"><Check className="mr-1 h-3 w-3" /> Validé</Badge>;
      case 'published':
        return <Badge className="bg-green-500 text-white border-0 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-green-500/20"><Check className="mr-1 h-3 w-3" /> Publié</Badge>;
      case 'hidden':
      case 'under_investigation':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest"><ShieldAlert className="mr-1 h-3 w-3" /> Investigation</Badge>;
      case 'rejected':
        return <Badge className="bg-rose-500 text-white border-0 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest"><X className="mr-1 h-3 w-3" /> Rejeté</Badge>;
      case 'deleted':
        return <Badge variant="secondary" className="font-black text-[9px] uppercase tracking-widest">Retiré</Badge>;
      default:
        return <Badge variant="secondary" className="font-black text-[9px] uppercase tracking-widest">{status}</Badge>;
    }
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

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-2">
          <Badge className="bg-primary/10 text-primary border-none font-bold px-3 py-1 uppercase tracking-wider text-[10px]">Modération Contenu</Badge>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Gestion des <span className="text-primary italic">Avis</span>
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> {stats.total} avis au total sur la plateforme
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-blue-500/20 text-blue-600">File</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{stats.active}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">File active modération</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-rose-500/20 text-rose-600">Urgent</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{stats.breached}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">SLA dépassés</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-amber-500/20 text-amber-600">Attention</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{stats.atRisk}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">SLA à risque (&lt;12h)</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock3 className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-black tabular-nums">{stats.avgAgeHours}h</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Âge moyen file</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-8 border-b border-border/10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="relative w-full lg:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Rechercher par auteur ou titre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-white/50 dark:bg-slate-950/50 border-border/20 rounded-2xl focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {([
                  { value: 'all' as const, label: `Tous (${stats.total})` },
                  { value: 'active' as const, label: `Actifs (${stats.active})` },
                  { value: 'at_risk' as const, label: `À risque (${stats.atRisk})` },
                  { value: 'breached' as const, label: `SLA dépassés (${stats.breached})` },
                ] as const).map((f) => (
                  <Button
                    key={f.value}
                    variant={queueFilter === f.value ? (f.value === 'breached' ? 'destructive' : 'default') : 'ghost'}
                    size="sm"
                    onClick={() => setQueueFilter(f.value)}
                    className={cn(
                      "rounded-xl font-bold text-[10px] uppercase tracking-widest px-4 h-9 shadow-sm transition-all",
                      queueFilter === f.value ? "shadow-primary/20" : "text-muted-foreground hover:bg-white/50"
                    )}
                  >
                    {f.label}
                  </Button>
                ))}

                {searchQuery !== '' && (
                  <Button variant="link" size="sm" onClick={() => setSearchQuery('')} className="text-[10px] font-bold text-muted-foreground uppercase px-2">Effacer</Button>
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
              <p className="text-muted-foreground font-black animate-pulse uppercase tracking-widest text-[10px]">Chargement des avis...</p>
            </div>
          ) : displayReviews.length === 0 ? (
            <div className="text-center py-40 space-y-6">
              <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto border border-dashed border-border/60">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <p className="text-2xl font-black">Aucun avis trouvé</p>
              <p className="text-muted-foreground font-medium">Modifiez vos filtres ou attendez de nouveaux avis.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/10">
                    <TableHead className="py-6 pl-8 font-bold uppercase tracking-widest text-[10px]">Établissement</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Auteur</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Note</TableHead>
                    <TableHead className="hidden lg:table-cell font-bold uppercase tracking-widest text-[10px]">Sous-notes</TableHead>
                    <TableHead className="hidden md:table-cell font-bold uppercase tracking-widest text-[10px]">Avis</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Statut</TableHead>
                    <TableHead className="hidden lg:table-cell font-bold uppercase tracking-widest text-[10px]">SLA</TableHead>
                    <TableHead className="text-right pr-8 font-bold uppercase tracking-widest text-[10px]">Actions</TableHead>
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
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-lg tabular-nums">{review.rating}</span>
                            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {review.sub_ratings && (
                            <div className="text-[10px] space-y-0.5">
                              {review.sub_ratings.work_life_balance != null && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground w-16 truncate">Équilibre</span>
                                  <StarRating rating={review.sub_ratings.work_life_balance} size={10} readOnly />
                                </div>
                              )}
                              {review.sub_ratings.management != null && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground w-16 truncate">Mgmt</span>
                                  <StarRating rating={review.sub_ratings.management} size={10} readOnly />
                                </div>
                              )}
                              {review.sub_ratings.career_growth != null && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground w-16 truncate">Carrière</span>
                                  <StarRating rating={review.sub_ratings.career_growth} size={10} readOnly />
                                </div>
                              )}
                              {review.sub_ratings.culture != null && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground w-16 truncate">Culture</span>
                                  <StarRating rating={review.sub_ratings.culture} size={10} readOnly />
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-xs">
                          <div className="text-xs font-bold truncate">{review.title}</div>
                          <div className="text-[10px] text-muted-foreground line-clamp-1">{review.content}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(review.status)}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {(() => {
                            if (sla === 'no_sla') return <span className="text-xs text-muted-foreground">—</span>;
                            if (sla === 'healthy') return (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest">
                                <Check className="h-3 w-3 mr-1" /> OK
                              </Badge>
                            );
                            if (sla === 'at_risk') return (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                                <Clock3 className="h-3 w-3 mr-1" /> À risque
                              </Badge>
                            );
                            return (
                              <Badge className="bg-rose-500 text-white border-0 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest">
                                <ShieldAlert className="h-3 w-3 mr-1" /> Dépassé
                              </Badge>
                            );
                          })()}
                          {review.moderation_sla_due_at && (
                            <div className="text-[9px] text-muted-foreground mt-1 font-bold tabular-nums">
                              Éch: {new Date(review.moderation_sla_due_at).toLocaleDateString('fr-FR')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                            {review.status !== 'published' && review.status !== 'deleted' && (
                              <Button size="sm" className="h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase shadow-lg shadow-emerald-500/10" onClick={() => updateStatus(review.id, 'published')} title="Publier">
                                <Check className="mr-1 h-3 w-3" /> OK
                              </Button>
                            )}
                            {review.status !== 'rejected' && review.status !== 'deleted' && (
                              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-amber-600 hover:bg-amber-500/10" onClick={() => updateStatus(review.id, 'rejected')} title="Rejeter">
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                            {review.status !== 'deleted' && (
                              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-500/10" onClick={() => deleteReview(review.id)} title="Retirer">
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
                Affichage {pageStart + 1}-{Math.min(pageEnd, totalCount)} sur {totalCount}
              </div>

              <div className="flex items-center gap-3">
                <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="w-[120px] h-9 rounded-xl bg-white/50 border-border/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/10">
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>

                <div className="text-xs font-black tabular-nums px-2">
                  Page {currentPage} / {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Suivant
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
