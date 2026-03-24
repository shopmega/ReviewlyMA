'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { moderateSalary } from '@/app/actions/salary';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Check,
  X,
  Loader2,
  Search,
  Clock,
  DollarSign,
  TrendingUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Banknote,
  Briefcase,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAdminPagination } from '@/hooks/use-admin-pagination';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { fetchAdminSalaries, fetchAdminSalaryStats, type AdminSalaryRow as SalaryRow } from '@/lib/data/admin-salaries';

type StatusFilter = 'all' | 'pending' | 'published' | 'rejected';

export default function AdminSalariesPage() {
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [rejectRow, setRejectRow] = useState<SalaryRow | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isPending, startTransition] = useTransition();
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    published: 0,
    rejected: 0,
    avgSalary: 0,
  });
  const { toast } = useToast();
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
    resetDeps: [statusFilter, debouncedSearch],
  });

  // Fetch with pagination
  useEffect(() => {
    loadRows();
  }, [currentPage, pageSize, statusFilter, debouncedSearch]);

  // Fetch stats once
  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setStats(await fetchAdminSalaryStats());
  }

  async function loadRows() {
    setLoading(true);
    const { data, error, count } = await fetchAdminSalaries({
      searchQuery: debouncedSearch,
      statusFilter,
      rangeFrom,
      rangeTo,
    });

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setRows(data);
      setTotalCount(count);
    }
    setLoading(false);
  }

  const updateStatus = (id: number, status: 'published' | 'rejected', notes?: string) => {
    startTransition(async () => {
      const result = await moderateSalary(id, status, notes);
      if (result.status === 'success') {
        toast({ title: 'Succès', description: result.message });
        setRejectRow(null);
        setRejectionNote('');
        await loadRows();
        loadStats();
      } else {
        toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
      }
    });
  };

  const getStatusBadge = (status: SalaryRow['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest animate-pulse">
            <Clock className="mr-1 h-3 w-3" /> En attente
          </Badge>
        );
      case 'published':
        return (
          <Badge className="bg-emerald-500 text-white border-0 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/20">
            <Check className="mr-1 h-3 w-3" /> Publié
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

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-2">
          <Badge className="bg-primary/10 text-primary border-none font-bold px-3 py-1 uppercase tracking-wider text-[10px]">Transparence Salariale</Badge>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Moderation des <span className="text-primary italic">Salaires</span>
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <Banknote className="h-4 w-4" /> {stats.total} soumissions au total
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl h-12 w-12 hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
          onClick={() => { loadRows(); loadStats(); }}
        >
          <RefreshCw className={cn("h-5 w-5", loading ? "animate-spin" : "")} />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-amber-500/20 text-amber-600">Urgent</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{stats.pending}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">En attente</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Check className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-emerald-500/20 text-emerald-600">Actif</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{stats.published}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Publies</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <X className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-black tabular-nums">{stats.rejected}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Rejetes</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-black tabular-nums">{stats.avgSalary.toLocaleString('fr-MA')}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Salaire moyen (MAD)</p>
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
                  placeholder="Rechercher poste, département, entreprise..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-white/50 dark:bg-slate-950/50 border-border/20 rounded-2xl focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(['all', 'pending', 'published', 'rejected'] as const).map((s) => (
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
                    {s === 'all' ? 'Tous' : s === 'pending' ? 'En attente' : s === 'published' ? 'Publies' : 'Rejetes'}
                  </Button>
                ))}

                {searchQuery !== '' && (
                  <Button variant="link" size="sm" onClick={() => setSearchQuery('')} className="text-[10px] font-bold text-muted-foreground uppercase px-2">Effacer</Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
              <div className="h-12 w-12 border-b-2 border-primary border-t-2 border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground font-black animate-pulse uppercase tracking-widest text-[10px]">Chargement des donnees...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-40 space-y-6">
              <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto border border-dashed border-border/60">
                <DollarSign className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <p className="text-2xl font-black">Aucune soumission trouvee</p>
              <p className="text-muted-foreground font-medium">Modifiez vos filtres pour voir plus de resultats.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/10">
                    <TableHead className="py-6 pl-8 font-bold uppercase tracking-widest text-[10px]">Entreprise</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Poste</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Salaire</TableHead>
                    <TableHead className="hidden lg:table-cell font-bold uppercase tracking-widest text-[10px]">Contrat / Dep.</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Date</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Statut</TableHead>
                    <TableHead className="text-right pr-8 font-bold uppercase tracking-widest text-[10px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="group border-b border-border/10 hover:bg-muted/40 transition-all duration-300">
                      <TableCell className="py-6 pl-8">
                        <span className="font-black text-sm text-slate-800 dark:text-white group-hover:text-primary transition-colors">
                          {row.businesses?.[0]?.name || row.business_id}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground/50" />
                          <span className="font-bold text-sm">{row.job_title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-lg tabular-nums text-primary">
                            {Number(row.salary).toLocaleString('fr-MA')}
                          </span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                            MAD / {row.pay_period === 'yearly' ? 'an' : 'mois'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-sm font-bold">{row.employment_type}</div>
                        <div className="text-[10px] text-muted-foreground font-medium">{row.department || 'Non defini'}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-black tabular-nums">{format(new Date(row.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(row.status)}</TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                          <Button
                            size="sm"
                            className="h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase shadow-lg shadow-emerald-500/10"
                            disabled={isPending || row.status === 'published'}
                            onClick={() => updateStatus(row.id, 'published')}
                            title="Publier"
                          >
                            <Check className="mr-1 h-3 w-3" /> OK
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-500/10"
                            disabled={isPending || row.status === 'rejected'}
                            onClick={() => {
                              setRejectRow(row);
                              setRejectionNote(row.moderation_notes || '');
                            }}
                            title="Rejeter"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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

      {/* Rejection Dialog */}
      <Dialog open={!!rejectRow} onOpenChange={(open) => !open && setRejectRow(null)}>
        <DialogContent className="rounded-[2.5rem] border-0 bg-white dark:bg-slate-950 p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader className="space-y-4">
            <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20 mb-2">
              <X className="h-8 w-8 text-rose-500" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">Rejeter la soumission</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400 font-medium">
              Ajoutez une note de modération (optionnel) pour expliquer le refus.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            placeholder="Ex: montant incohérent avec les intervalles autorisés..."
            rows={5}
            className="min-h-32 rounded-2xl bg-slate-50 dark:bg-slate-900 border-border/10 p-4 font-medium"
          />
          <DialogFooter className="mt-6 gap-3">
            <Button variant="outline" className="rounded-2xl border-border/40 font-bold px-8 h-12" onClick={() => setRejectRow(null)}>Annuler</Button>
            <Button
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black px-10 h-12 shadow-xl shadow-rose-500/20"
              disabled={isPending || !rejectRow}
              onClick={() => rejectRow && updateStatus(rejectRow.id, 'rejected', rejectionNote)}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
