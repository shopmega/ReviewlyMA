'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MoreHorizontal,
  MapPin,
  Star,
  Building,
  ExternalLink,
  Trash2,
  Loader2,
  AlertTriangle,
  Filter,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  Activity,
  Plus,
  ChevronRight,
  User as UserIcon,
  Check,
  X,
  History,
  LayoutGrid,
  List,
  Clock,
  MoreVertical as MoreVerticalIcon,
  Crown,
  Upload,
  Zap
} from "lucide-react";
import { useState, useEffect } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import {
  fetchAllUsers,
  toggleUserPremium,
  toggleBusinessFeatured,
  toggleBusinessSponsored,
  requestLogo,
  deleteBusiness,
  createBusiness,
  bulkDeleteBusinesses,
  bulkUpdateBusinesses
} from '@/app/actions/admin';
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  BusinessLogoAvatar,
  BusinessVisibilityBadges,
  CreateBusinessDialog,
  DeleteBusinessDialog,
} from "@/components/admin/businesses/BusinessesAdminComponents";
import { useAdminPagination } from "@/hooks/use-admin-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { fetchAdminBusinesses, fetchAdminBusinessCities, type AdminBusiness as Business } from "@/lib/data/admin-businesses";

export default function BusinessesAdminPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [cities, setCities] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, claimed, unclaimed
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    businessId: string;
    businessName: string;
  }>({ open: false, businessId: '', businessName: '' });

  const [createDialog, setCreateDialog] = useState(false);
  const [newBusiness, setNewBusiness] = useState({
    name: '',
    category: '',
    city: '',
    address: '',
    description: '',
    isPremium: false
  });

  const { toast } = useToast();
  const { t } = useI18n();
  const debouncedSearchQuery = useDebouncedValue(searchQuery);
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
    initialPageSize: 24,
    resetDeps: [debouncedSearchQuery, filterCity, filterStatus, viewMode],
  });

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    fetchBusinesses();
  }, [currentPage, pageSize, debouncedSearchQuery, filterCity, filterStatus]);

  async function fetchCities() {
    try {
      const { data, error } = await fetchAdminBusinessCities();

      if (!error) {
        setCities(data);
      }
    } catch (err) {
      console.error('Error fetching cities:', err);
    }
  }

  async function fetchBusinesses() {
    setLoading(true);
    try {
      const { data, error, count } = await fetchAdminBusinesses({
        searchQuery: debouncedSearchQuery,
        filterCity,
        filterStatus,
        rangeFrom,
        rangeTo,
      });

      if (error) {
        console.error('Error fetching businesses:', error);
        toast({
          title: t('adminBusinesses.toast.loadErrorTitle', 'Erreur de chargement'),
          description: error.message || t('adminBusinesses.toast.loadErrorDesc', 'Impossible de recuperer les entreprises.'),
          variant: 'destructive',
        });
      } else {
        setBusinesses(data);
        setTotalCount(count);
      }
    } catch (err) {
      console.error(err);
      setBusinesses([]);
      setTotalCount(0);
    }
    setLoading(false);
  }

  const toggleSponsored = async (id: string, currentStatus: boolean) => {
    setActionLoading(id);
    const result = await toggleBusinessSponsored(id, !currentStatus);

    if (result.status === 'error') {
      toast({ title: t('common.error', 'Erreur'), description: result.message, variant: 'destructive' });
    } else {
      setBusinesses(prev => prev.map(b => b.id === id ? { ...b, is_sponsored: !currentStatus } : b));
      toast({ title: t('common.success', 'Succes'), description: result.message });
    }
    setActionLoading(null);
  };

  const toggleFeatured = async (id: string, currentStatus: boolean) => {
    setActionLoading(id);
    const result = await toggleBusinessFeatured(id, !currentStatus);

    if (result.status === 'error') {
      toast({ title: t('common.error', 'Erreur'), description: result.message, variant: 'destructive' });
    } else {
      setBusinesses(prev => prev.map(b => b.id === id ? { ...b, is_featured: !currentStatus } : b));
      toast({ title: t('common.success', 'Succes'), description: result.message });
    }
    setActionLoading(null);
  };

  const handleBulkAction = async (action: 'feature' | 'unfeature' | 'delete') => {
    if (selectedIds.length === 0) return;

    setIsProcessingBulk(true);
    try {
      if (action === 'delete') {
        const result = await bulkDeleteBusinesses(selectedIds);
        if (result.success) {
          toast({ title: t('adminBusinesses.toast.bulkDeleteSuccess', 'Suppression reussie'), description: result.message });
          setBusinesses(prev => prev.filter(b => !selectedIds.includes(b.id)));
          setSelectedIds([]);
        }
      } else {
        const result = await bulkUpdateBusinesses(selectedIds, { featured: action === 'feature' });
        if (result.success) {
          toast({ title: t('adminBusinesses.toast.bulkUpdateSuccess', 'Mise a jour reussie'), description: result.message });
          setBusinesses(prev => prev.map(b => selectedIds.includes(b.id) ? { ...b, is_featured: action === 'feature' } : b));
          setSelectedIds([]);
        }
      }
    } catch (error) {
      toast({ title: t('common.error', 'Erreur'), description: t('adminBusinesses.toast.bulkActionError', 'Une erreur est survenue lors de action groupee'), variant: 'destructive' });
    }
    setIsProcessingBulk(false);
  };

  const handleRequestLogo = async (id: string) => {
    setActionLoading(id);
    const result = await requestLogo(id);
    if (result.status === 'success') {
      toast({ title: t('common.success', 'Succes'), description: result.message });
      setBusinesses(prev => prev.map(b => b.id === id ? { ...b, logo_requested: true } : b));
    }
    setActionLoading(null);
  };

  const handleDelete = async () => {
    if (!deleteDialog.businessId) return;
    setActionLoading(deleteDialog.businessId);
    const result = await deleteBusiness(deleteDialog.businessId);
    if (result.status === 'success') {
      toast({ title: t('common.success', 'Succes'), description: result.message });
      setBusinesses(prev => prev.filter(b => b.id !== deleteDialog.businessId));
    }
    setActionLoading(null);
    setDeleteDialog({ open: false, businessId: '', businessName: '' });
  };

  const handleCreateBusiness = async () => {
    if (!newBusiness.name || !newBusiness.category || !newBusiness.city || !newBusiness.address) {
      toast({ title: t('common.error', 'Erreur'), description: t('adminBusinesses.toast.requiredFields', 'Veuillez remplir tous les champs obligatoires.'), variant: 'destructive' });
      return;
    }

    setIsProcessingBulk(true); // Using this as a general loading flag for simplicity here
    const result = await createBusiness({
      name: newBusiness.name,
      category: newBusiness.category,
      city: newBusiness.city,
      address: newBusiness.address,
      description: newBusiness.description,
      tier: newBusiness.isPremium ? 'growth' : 'standard',
    });

    if (result.status === 'success') {
      toast({ title: t('common.success', 'Succes'), description: t('adminBusinesses.toast.createSuccess', 'Etablissement ajoute avec succes.') });
      setCreateDialog(false);
      setNewBusiness({ name: '', category: '', city: '', address: '', description: '', isPremium: false });
      fetchBusinesses();
    } else {
      toast({ title: t('common.error', 'Erreur'), description: result.message, variant: 'destructive' });
    }
    setIsProcessingBulk(false);
  };

  const toggleSelectAll = () => {
    const visibleIds = businesses.map((b) => b.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 pb-2">
        <div className="space-y-2">
          <Badge className="bg-primary/10 text-primary border-none font-bold px-3 py-1 uppercase tracking-wider text-[10px]">{t('adminBusinesses.badge', 'Annuaire & CRM')}</Badge>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            {t('adminBusinesses.titlePrefix', 'Gestion')} <span className="text-primary italic">{t('adminBusinesses.titleAccent', 'Etablissements')}</span>
          </h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2 text-sm">
              <Building className="h-4 w-4" /> {totalCount} {t('adminBusinesses.totalCountSuffix', 'entreprises dans la base de donnees')}
            </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
          <div className="flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-1.5 rounded-2xl border border-border/50 shadow-sm self-start">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('table')}
              className="h-10 w-10 rounded-xl transition-all"
            >
              <List className="h-5 w-5" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="h-10 w-10 rounded-xl transition-all"
            >
              <LayoutGrid className="h-5 w-5" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
            <Button
              className="bg-primary hover:bg-primary/90 text-white font-black px-6 h-12 rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => setCreateDialog(true)}
            >
              <Plus className="mr-2 h-5 w-5" /> {t('common.add', 'Ajouter')}
            </Button>
            <Button
              variant="outline"
              className="font-bold px-6 h-12 rounded-2xl transition-all border-border/50 bg-white/50 dark:bg-white/5 backdrop-blur-sm"
              asChild
            >
              <Link href="/admin/etablissements/import">
                <Upload className="mr-2 h-5 w-5" /> {t('common.import', 'Importer')}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-indigo-500/20 text-indigo-600">{t('adminBusinesses.kpi.premiumBadge', 'Premium')}</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{businesses.filter(b => b.is_featured).length}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('adminBusinesses.kpi.featured', 'Etablissements a la une')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserIcon className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-emerald-500/20 text-emerald-600">{t('adminBusinesses.kpi.engagedBadge', 'Engage')}</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{businesses.filter(b => b.user_id).length}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('adminBusinesses.kpi.proAccounts', 'Comptes Pro actives')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Star className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-amber-500/20 text-amber-600">{t('adminBusinesses.kpi.satisfactionBadge', 'Satisfaction')}</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{(businesses.reduce((acc, b) => acc + b.overall_rating, 0) / (businesses.length || 1)).toFixed(1)}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('adminBusinesses.kpi.averageRating', 'Note moyenne plateforme')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-rose-500/20 text-rose-600">{t('adminBusinesses.kpi.identityBadge', 'Identite')}</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{businesses.filter(b => !b.logo_url).length}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('adminBusinesses.kpi.missingLogo', 'Sans logo professionnel')}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl md:rounded-[2.5rem] overflow-hidden min-w-0">
        <CardHeader className="p-4 md:p-8 border-b border-border/10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="relative w-full lg:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder={t('adminBusinesses.searchPlaceholder', 'Rechercher par nom, categorie...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-white/50 dark:bg-slate-950/50 border-border/20 rounded-2xl focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={filterCity} onValueChange={setFilterCity}>
                  <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white/50 border-border/20 transition-all">
                    <Filter className="h-3 w-3 mr-2 opacity-50" />
                    <SelectValue placeholder={t('adminBusinesses.filter.allCities', 'Toutes les villes')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/10 backdrop-blur-xl">
                    <SelectItem value="all">{t('adminBusinesses.filter.allCities', 'Toutes les villes')}</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white/50 border-border/20 transition-all">
                    <Activity className="h-3 w-3 mr-2 opacity-50" />
                    <SelectValue placeholder={t('adminBusinesses.filter.allStatuses', 'Tous les statuts')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/10 backdrop-blur-xl">
                    <SelectItem value="all">{t('adminBusinesses.filter.allStatuses', 'Tous les statuts')}</SelectItem>
                    <SelectItem value="claimed">{t('adminBusinesses.filter.claimed', 'Revendiques')}</SelectItem>
                    <SelectItem value="unclaimed">{t('adminBusinesses.filter.unclaimed', 'Non revendiques')}</SelectItem>
                  </SelectContent>
                </Select>

                {(filterCity !== 'all' || filterStatus !== 'all' || searchQuery !== '') && (
                  <Button variant="ghost" size="sm" onClick={() => { setFilterCity('all'); setFilterStatus('all'); setSearchQuery(''); }} className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
                    {t('adminBusinesses.filter.clear', 'Effacer les filtres')}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12 hover:bg-primary/10 hover:text-primary transition-all shadow-sm" onClick={fetchBusinesses}>
                <History className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
              <div className="h-12 w-12 border-b-2 border-primary border-t-2 border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground font-black animate-pulse uppercase tracking-widest text-[10px]">{t('adminBusinesses.loadingSync', 'Syncing CRM...')}</p>
            </div>
          ) : totalCount === 0 ? (
            <div className="text-center py-40 space-y-6">
              <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto border border-dashed border-border/60">
                <Building className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <div className="max-w-xs mx-auto space-y-2">
                <p className="text-2xl font-black">{t('adminBusinesses.emptyTitle', 'Aucun resultat')}</p>
                <p className="text-muted-foreground font-medium">{t('adminBusinesses.emptyDesc', 'Reduisez vos filtres ou effectuez une nouvelle recherche.')}</p>
              </div>
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/10">
                    <TableHead className="w-[80px] pl-8">
                      <Checkbox
                        checked={businesses.length > 0 && businesses.every((b) => selectedIds.includes(b.id))}
                        onCheckedChange={toggleSelectAll}
                        className="rounded-lg border-2 border-primary/20 data-[state=checked]:bg-primary"
                      />
                    </TableHead>
                    <TableHead className="py-6 font-bold uppercase tracking-widest text-[10px]">{t('adminBusinesses.table.business', 'Entreprise')}</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">{t('adminBusinesses.table.identity', 'Identite')}</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">{t('adminBusinesses.table.ownership', 'Propriete')}</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">{t('adminBusinesses.table.engagement', 'Engagement')}</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">{t('adminBusinesses.table.status', 'Statut')}</TableHead>
                    <TableHead className="text-right pr-8 font-bold uppercase tracking-widest text-[10px]">{t('adminBusinesses.table.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businesses.map((business) => (
                    <TableRow key={business.id} className={cn(
                      "group border-b border-border/10 transition-all duration-300",
                      selectedIds.includes(business.id) ? "bg-primary/5 shadow-inner" : "hover:bg-muted/40"
                    )}>
                      <TableCell className="pl-8">
                        <Checkbox
                          checked={selectedIds.includes(business.id)}
                          onCheckedChange={() => toggleSelect(business.id)}
                          className="rounded-lg border-2 border-border/40 group-hover:border-primary/50 transition-colors"
                        />
                      </TableCell>
                      <TableCell className="py-6">
                        <div className="flex items-center gap-4">
                          <BusinessLogoAvatar
                            name={business.name}
                            logoUrl={business.logo_url}
                            className="h-12 w-12 rounded-2xl bg-white shadow-xl ring-1 ring-border/10 transition-transform duration-500 group-hover:scale-110"
                          />
                          <div>
                            <p className="max-w-[200px] truncate leading-tight text-slate-800 transition-colors group-hover:text-primary dark:text-white font-black">{business.name}</p>
                            <p className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                              <MapPin className="h-3 w-3" /> {business.city}, {business.quartier || business.location}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="w-fit rounded-lg border-none bg-slate-100 px-2 py-0.5 text-[10px] font-bold dark:bg-slate-800">
                            {business.category}
                          </Badge>
                          {business.logo_url ? (
                            <span className="ml-1 flex items-center gap-1 text-[9px] font-black text-emerald-500"><Check className="h-2 w-2" /> {t('adminBusinesses.identity.logoOk', 'LOGO OK')}</span>
                          ) : business.logo_requested ? (
                            <span className="ml-1 flex items-center gap-1 text-[9px] font-black text-amber-500"><Clock className="h-2 w-2" /> {t('adminBusinesses.identity.pending', 'EN ATTENTE')}</span>
                          ) : (
                            <span className="ml-1 flex items-center gap-1 text-[9px] font-black text-rose-500"><X className="h-2 w-2" /> {t('adminBusinesses.identity.noLogo', 'PAS DE LOGO')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {business.user_id ? (
                          <div className="animate-in zoom-in flex items-center gap-2 text-indigo-500 duration-500">
                            <ShieldCheck className="h-5 w-5" />
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-tight">{t('adminBusinesses.ownership.claimed', 'Revendique')}</p>
                              <p className="line-clamp-1 max-w-[80px] text-[9px] font-bold uppercase tracking-tighter text-muted-foreground/60">#{business.user_id.substring(0, 8)}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground opacity-50">
                            <ShieldAlert className="h-5 w-5" />
                            <span className="text-[10px] font-black uppercase tracking-tight">{t('adminBusinesses.ownership.free', 'Libre')}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-black tabular-nums">{business.overall_rating.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-60">
                            <TrendingUp className="h-3 w-3 text-indigo-500" />
                            <span className="text-[10px] font-bold">{business.review_count || 0} avis</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <BusinessVisibilityBadges
                            isSponsored={business.is_sponsored}
                            isFeatured={business.is_featured}
                            showStandardWhenEmpty
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-1 translate-x-4 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                          <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-primary shadow-sm transition-all hover:bg-primary/10" asChild>
                            <Link href={`/businesses/${business.id}`} target="_blank">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>

                          {actionLoading === business.id ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl font-bold shadow-sm transition-all hover:bg-muted">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 rounded-2xl border-border/10 p-2 shadow-2xl backdrop-blur-3xl">
                                <DropdownMenuItem className="rounded-xl py-3 font-bold transition-colors hover:bg-amber-500/10" onClick={() => toggleSponsored(business.id, business.is_sponsored || false)}>
                                  <Zap className={cn('mr-2 h-4 w-4', business.is_sponsored ? 'fill-amber-400 text-amber-400' : '')} />
                                  {business.is_sponsored ? 'Retirer du sponsoring' : 'Marquer comme sponsorise'}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-xl py-3 font-bold transition-colors hover:bg-primary/10" onClick={() => toggleFeatured(business.id, business.is_featured)}>
                                  <Star className={cn('mr-2 h-4 w-4', business.is_featured ? 'fill-amber-400 text-amber-400' : '')} />
                                  {business.is_featured ? 'Retirer de la une' : 'Promouvoir a la une'}
                                </DropdownMenuItem>
                                {!business.logo_url && !business.logo_requested ? (
                                  <DropdownMenuItem className="rounded-xl py-3 font-bold transition-colors hover:bg-indigo-500/10" onClick={() => handleRequestLogo(business.id)}>
                                    <Building className="mr-2 h-4 w-4" />
                                    Demander un logo
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuSeparator className="my-1 bg-border/10" />
                                <DropdownMenuItem
                                  className="rounded-xl py-3 font-bold text-rose-500 transition-colors hover:bg-rose-500/10"
                                  onClick={() => setDeleteDialog({ open: true, businessId: business.id, businessName: business.name })}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Bannir l'entreprise
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 p-8 md:grid-cols-2 xl:grid-cols-3">
                {businesses.map((business) => (
                  <Card key={business.id} className={cn(
                    'group overflow-hidden rounded-3xl border-border/30 shadow-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl',
                    selectedIds.includes(business.id) ? 'ring-2 ring-primary ring-offset-4' : ''
                  )}>
                    <CardHeader className="relative h-48 bg-muted p-0">
                      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute right-4 top-4 z-20 flex gap-2">
                        <Checkbox
                          checked={selectedIds.includes(business.id)}
                          onCheckedChange={() => toggleSelect(business.id)}
                          className="h-6 w-6 rounded-lg border-white/40 bg-white/20 backdrop-blur-md data-[state=checked]:bg-primary"
                        />
                      </div>
                      <div className="absolute bottom-4 left-6 z-20">
                        <p className="line-clamp-1 text-xl font-black text-white">{business.name}</p>
                        <p className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/60">
                          <MapPin className="h-3 w-3" /> {business.city}
                        </p>
                      </div>
                      <BusinessLogoAvatar
                        name={business.name}
                        logoUrl={business.logo_url}
                        className="h-full w-full"
                        imageClassName="transition-transform duration-1000 group-hover:scale-110"
                        fallback={
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                            <Building className="h-12 w-12 text-slate-400 opacity-30" />
                          </div>
                        }
                      />
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <Badge className="border-none bg-slate-100 text-[10px] font-black uppercase text-muted-foreground dark:bg-slate-800">{business.category}</Badge>
                          <div className="flex flex-wrap gap-1.5">
                            <BusinessVisibilityBadges
                              isSponsored={business.is_sponsored}
                              isFeatured={business.is_featured}
                              compact
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 rounded-lg bg-amber-400/10 px-2 py-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-black tabular-nums text-amber-600">{business.overall_rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <div className="flex items-center gap-2">
                          {business.user_id ? <ShieldCheck className="h-4 w-4 text-indigo-500" /> : <ShieldAlert className="h-4 w-4" />}
                          {business.user_id ? t('adminBusinesses.ownership.claimed', 'Revendique') : t('adminBusinesses.ownership.unclaimed', 'Non reclame')}
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-primary" />
                          {business.review_count || 0} {t('adminBusinesses.metrics.reviews', 'avis')}
                        </div>
                      </div>
                      <Button asChild variant="outline" className="h-10 w-full rounded-2xl border-border/40 font-bold transition-all hover:bg-primary/10">
                        <Link href={`/businesses/${business.id}`} target="_blank">
                          {t('adminBusinesses.actions.businessDetails', 'Details entreprise')} <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          {!loading && totalCount > 0 && (
            <div className="flex flex-col items-start justify-between gap-4 border-t border-border/10 p-4 md:flex-row md:items-center md:p-6">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t('adminBusinesses.pagination.showing', 'Affichage')} {pageStart + 1}-{Math.min(pageEnd, totalCount)} {t('adminBusinesses.pagination.of', 'sur')} {totalCount}
              </div>

              <div className="flex items-center gap-3">
                <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="h-9 w-[110px] rounded-xl border-border/20 bg-white/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/10">
                    <SelectItem value="12">12 / {t('adminBusinesses.pagination.perPage', 'page')}</SelectItem>
                    <SelectItem value="24">24 / {t('adminBusinesses.pagination.perPage', 'page')}</SelectItem>
                    <SelectItem value="48">48 / {t('adminBusinesses.pagination.perPage', 'page')}</SelectItem>
                    <SelectItem value="96">96 / {t('adminBusinesses.pagination.perPage', 'page')}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="px-2 text-xs font-black tabular-nums">
                  {t('adminBusinesses.pagination.page', 'Page')} {currentPage} / {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  {t('adminBusinesses.pagination.previous', 'Precedent')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  {t('adminBusinesses.pagination.next', 'Suivant')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>



      {/* Floating Batch Control bar */}
      {
        selectedIds.length > 0 && (
          <div className="fixed bottom-6 md:bottom-10 inset-x-0 z-50 flex justify-center px-4 animate-in slide-in-from-bottom-12 duration-500">
            <div className="w-full max-w-4xl bg-slate-950/90 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/10 p-4 md:p-5 rounded-3xl md:rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.6)] flex flex-col md:flex-row items-center justify-between gap-4 ring-1 ring-white/20">
              <div className="flex items-center gap-4 pl-0 md:pl-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-base md:text-lg shadow-xl shadow-primary/40">
                  {selectedIds.length}
                </div>
                <div>
                  <p className="text-white font-black text-sm md:text-base uppercase tracking-tight">{t('adminBusinesses.bulk.title', 'Traitement en Lot')}</p>
                  <p className="text-muted-foreground text-[9px] md:text-[10px] font-bold uppercase tracking-widest">{t('adminBusinesses.bulk.subtitle', 'Action sur la selection annuaire')}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 pr-0 md:pr-2">
                <Button variant="ghost" className="rounded-xl md:rounded-2xl text-white hover:bg-white/10 font-bold px-4 h-10 md:h-12 text-xs md:text-sm" onClick={() => setSelectedIds([])} disabled={isProcessingBulk}>
                  {t('common.cancel', 'Annuler')}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl md:rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold h-10 md:h-12 text-xs md:text-sm transition-all"
                  onClick={() => handleBulkAction('feature')}
                  disabled={isProcessingBulk}
                >
                  <Star className="mr-2 h-3 w-3 md:h-4 md:w-4 text-amber-500" /> Promouvoir
                </Button>
                <Button
                  className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl md:rounded-2xl font-black px-6 md:px-10 h-10 md:h-12 text-xs md:text-sm shadow-[0_10px_30px_rgba(244,63,94,0.3)] transition-all"
                  onClick={() => handleBulkAction('delete')}
                  disabled={isProcessingBulk}
                >
                  {isProcessingBulk ? <Loader2 className="mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin" /> : <Trash2 className="mr-2 h-3 w-3 md:h-4 md:w-4" />}
                  Bannir
                </Button>
              </div>
            </div>
          </div>
        )
      }

      <DeleteBusinessDialog
        open={deleteDialog.open}
        businessName={deleteDialog.businessName}
        loading={actionLoading === deleteDialog.businessId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ open: false, businessId: '', businessName: '' });
          }
        }}
        onConfirm={handleDelete}
        t={t}
      />

      <CreateBusinessDialog
        open={createDialog}
        draft={newBusiness}
        loading={isProcessingBulk}
        onOpenChange={setCreateDialog}
        onDraftChange={setNewBusiness}
        onSubmit={handleCreateBusiness}
        t={t}
      />
    </div >
  );
}
