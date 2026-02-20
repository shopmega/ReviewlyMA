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
import { createClient } from "@/lib/supabase/client";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { getStoragePublicUrl } from "@/lib/data";
import { isValidImageUrl } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Business = {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  location: string;
  city?: string;
  quartier?: string;
  type: string;
  overall_rating: number;
  is_featured: boolean;
  is_sponsored?: boolean; // Added this type definition
  logo_url: string | null;
  logo_requested?: boolean;
  user_id?: string | null;
  created_at: string;
  review_count?: number;
};

export default function BusinessesAdminPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [cities, setCities] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, claimed, unclaimed
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

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

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, filterCity, filterStatus, pageSize, viewMode]);

  useEffect(() => {
    fetchBusinesses();
  }, [currentPage, pageSize, debouncedSearchQuery, filterCity, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function fetchCities() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('businesses')
        .select('city')
        .not('city', 'is', null)
        .order('city');

      if (!error && data) {
        const unique = Array.from(new Set(data.map((r: any) => r.city).filter(Boolean)));
        setCities(unique as string[]);
      }
    } catch (err) {
      console.error('Error fetching cities:', err);
    }
  }

  async function fetchBusinesses() {
    setLoading(true);
    try {
      const supabase = createClient();
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('businesses')
        .select('*', { count: 'exact' });

      const q = debouncedSearchQuery.trim();
      if (q) {
        const safeQ = q.replace(/,/g, ' ');
        query = query.or(`name.ilike.%${safeQ}%,category.ilike.%${safeQ}%,address.ilike.%${safeQ}%`);
      }

      if (filterCity !== 'all') {
        query = query.eq('city', filterCity);
      }

      if (filterStatus === 'claimed') {
        query = query.not('user_id', 'is', null);
      } else if (filterStatus === 'unclaimed') {
        query = query.is('user_id', null);
      }

      const { data, error, count } = await query
        .order('name')
        .range(from, to);

      if (error) {
        console.error('Error fetching businesses:', error);
        toast({
          title: 'Erreur de chargement',
          description: error.message || 'Impossible de récupérer les entreprises.',
          variant: 'destructive',
        });
      } else {
        setBusinesses((data || []) as Business[]);
        setTotalCount(count || 0);
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
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
    } else {
      setBusinesses(prev => prev.map(b => b.id === id ? { ...b, is_sponsored: !currentStatus } : b));
      toast({ title: 'Succès', description: result.message });
    }
    setActionLoading(null);
  };

  const toggleFeatured = async (id: string, currentStatus: boolean) => {
    setActionLoading(id);
    const result = await toggleBusinessFeatured(id, !currentStatus);

    if (result.status === 'error') {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
    } else {
      setBusinesses(prev => prev.map(b => b.id === id ? { ...b, is_featured: !currentStatus } : b));
      toast({ title: 'Succès', description: result.message });
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
          toast({ title: 'Suppression réussie', description: result.message });
          setBusinesses(prev => prev.filter(b => !selectedIds.includes(b.id)));
          setSelectedIds([]);
        }
      } else {
        const result = await bulkUpdateBusinesses(selectedIds, { featured: action === 'feature' });
        if (result.success) {
          toast({ title: 'Mise à jour réussie', description: result.message });
          setBusinesses(prev => prev.map(b => selectedIds.includes(b.id) ? { ...b, is_featured: action === 'feature' } : b));
          setSelectedIds([]);
        }
      }
    } catch (error) {
      toast({ title: 'Erreur', description: 'Une erreur est survenue lors de l\'action groupée', variant: 'destructive' });
    }
    setIsProcessingBulk(false);
  };

  const handleRequestLogo = async (id: string) => {
    setActionLoading(id);
    const result = await requestLogo(id);
    if (result.status === 'success') {
      toast({ title: 'Succès', description: result.message });
      setBusinesses(prev => prev.map(b => b.id === id ? { ...b, logo_requested: true } : b));
    }
    setActionLoading(null);
  };

  const handleDelete = async () => {
    if (!deleteDialog.businessId) return;
    setActionLoading(deleteDialog.businessId);
    const result = await deleteBusiness(deleteDialog.businessId);
    if (result.status === 'success') {
      toast({ title: 'Succès', description: result.message });
      setBusinesses(prev => prev.filter(b => b.id !== deleteDialog.businessId));
    }
    setActionLoading(null);
    setDeleteDialog({ open: false, businessId: '', businessName: '' });
  };

  const handleCreateBusiness = async () => {
    if (!newBusiness.name || !newBusiness.category || !newBusiness.city || !newBusiness.address) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs obligatoires.', variant: 'destructive' });
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
      toast({ title: 'Succès', description: 'Établissement ajouté avec succès.' });
      setCreateDialog(false);
      setNewBusiness({ name: '', category: '', city: '', address: '', description: '', isPremium: false });
      fetchBusinesses();
    } else {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
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
          <Badge className="bg-primary/10 text-primary border-none font-bold px-3 py-1 uppercase tracking-wider text-[10px]">Annuaire & CRM</Badge>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Gestion <span className="text-primary italic">Établissements</span>
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2 text-sm">
            <Building className="h-4 w-4" /> {totalCount} entreprises dans la base de données
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
              <Plus className="mr-2 h-5 w-5" /> Ajouter
            </Button>
            <Button
              variant="outline"
              className="font-bold px-6 h-12 rounded-2xl transition-all border-border/50 bg-white/50 dark:bg-white/5 backdrop-blur-sm"
              asChild
            >
              <Link href="/admin/etablissements/import">
                <Upload className="mr-2 h-5 w-5" /> Importer
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
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-indigo-500/20 text-indigo-600">Premium</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{businesses.filter(b => b.is_featured).length}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Établissements à la une</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserIcon className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-emerald-500/20 text-emerald-600">Engagé</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{businesses.filter(b => b.user_id).length}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Comptes Pro activés</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Star className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-amber-500/20 text-amber-600">Satisfaction</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{(businesses.reduce((acc, b) => acc + b.overall_rating, 0) / (businesses.length || 1)).toFixed(1)}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Note moyenne plateforme</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-rose-500/20 text-rose-600">Identité</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{businesses.filter(b => !b.logo_url).length}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Sans logo professionnel</p>
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
                  placeholder="Rechercher par nom, catégorie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-white/50 dark:bg-slate-950/50 border-border/20 rounded-2xl focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={filterCity} onValueChange={setFilterCity}>
                  <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white/50 border-border/20 transition-all">
                    <Filter className="h-3 w-3 mr-2 opacity-50" />
                    <SelectValue placeholder="Toutes les villes" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/10 backdrop-blur-xl">
                    <SelectItem value="all">Toutes les villes</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white/50 border-border/20 transition-all">
                    <Activity className="h-3 w-3 mr-2 opacity-50" />
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/10 backdrop-blur-xl">
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="claimed">Revendiqués</SelectItem>
                    <SelectItem value="unclaimed">Non revendiqués</SelectItem>
                  </SelectContent>
                </Select>

                {(filterCity !== 'all' || filterStatus !== 'all' || searchQuery !== '') && (
                  <Button variant="ghost" size="sm" onClick={() => { setFilterCity('all'); setFilterStatus('all'); setSearchQuery(''); }} className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
                    Effacer les filtres
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
              <p className="text-muted-foreground font-black animate-pulse uppercase tracking-widest text-[10px]">Syncing CRM...</p>
            </div>
          ) : totalCount === 0 ? (
            <div className="text-center py-40 space-y-6">
              <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto border border-dashed border-border/60">
                <Building className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <div className="max-w-xs mx-auto space-y-2">
                <p className="text-2xl font-black">Aucun résultat</p>
                <p className="text-muted-foreground font-medium">Réduisez vos filtres ou effectuez une nouvelle recherche.</p>
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
                    <TableHead className="py-6 font-bold uppercase tracking-widest text-[10px]">Entreprise</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Identité</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Propriété</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Engagement</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Statut</TableHead>
                    <TableHead className="text-right pr-8 font-bold uppercase tracking-widest text-[10px]">Actions</TableHead>
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
                          <div className="relative h-12 w-12 rounded-2xl overflow-hidden bg-white shadow-xl ring-1 ring-border/10 group-hover:scale-110 transition-transform duration-500">
                            {(() => {
                              const logoUrl = getStoragePublicUrl(business.logo_url);
                              if (logoUrl && isValidImageUrl(logoUrl)) {
                                return <Image src={logoUrl} alt={business.name} fill className="object-cover" />;
                              }
                              return (
                                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-primary/10 text-primary font-black text-sm">
                                  {business.name?.[0].toUpperCase()}
                                </div>
                              );
                            })()}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 dark:text-white truncate max-w-[200px] leading-tight group-hover:text-primary transition-colors">{business.name}</p>
                            <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 mt-1 uppercase tracking-tight">
                              <MapPin className="h-3 w-3" /> {business.city}, {business.quartier || business.location}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 border-none font-bold text-[10px] px-2 py-0.5 rounded-lg w-fit">
                            {business.category}
                          </Badge>
                          {business.logo_url ? (
                            <span className="text-[9px] font-black text-emerald-500 flex items-center gap-1 ml-1"><Check className="h-2 w-2" /> LOGO OK</span>
                          ) : business.logo_requested ? (
                            <span className="text-[9px] font-black text-amber-500 flex items-center gap-1 ml-1"><Clock className="h-2 w-2" /> EN ATTENTE</span>
                          ) : (
                            <span className="text-[9px] font-black text-rose-500 flex items-center gap-1 ml-1"><X className="h-2 w-2" /> PAS DE LOGO</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {business.user_id ? (
                          <div className="flex items-center gap-2 text-indigo-500 animate-in fade-in zoom-in duration-500">
                            <ShieldCheck className="h-5 w-5" />
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-tight">Revendiqué</p>
                              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter line-clamp-1 max-w-[80px]">#{business.user_id.substring(0, 8)}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground opacity-50">
                            <ShieldAlert className="h-5 w-5" />
                            <span className="text-[10px] font-black uppercase tracking-tight">Libre</span>
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
                          {business.is_sponsored && (
                            <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-[9px] border-0 px-2.5 py-1 rounded-full shadow-lg shadow-indigo-500/20 uppercase tracking-widest">
                              Sponsorisé
                            </Badge>
                          )}
                          {business.is_featured ? (
                            <Badge className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-black text-[9px] border-0 px-2.5 py-1 rounded-full shadow-lg shadow-orange-500/20 uppercase tracking-widest animate-pulse">
                              À la une
                            </Badge>
                          ) : !business.is_sponsored && (
                            <Badge variant="outline" className="text-muted-foreground font-bold text-[9px] px-2.5 py-1 rounded-full border-border/30 uppercase tracking-widest">
                              Standard
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-1 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                          <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary transition-all shadow-sm" asChild>
                            <Link href={`/businesses/${business.id}`} target="_blank">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>

                          {actionLoading === business.id ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted font-bold transition-all shadow-sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-2xl border-border/10 backdrop-blur-3xl shadow-2xl p-2 w-56">
                                <DropdownMenuItem
                                  className="rounded-xl py-3 font-bold hover:bg-amber-500/10 transition-colors"
                                  onClick={() => toggleSponsored(business.id, business.is_sponsored || false)}
                                >
                                  <Zap className={cn("mr-2 h-4 w-4", business.is_sponsored ? "fill-amber-400 text-amber-400" : "")} />
                                  {business.is_sponsored ? 'Retirer du sponsoring' : 'Marquer comme Sponsorisé'}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  className="rounded-xl py-3 font-bold hover:bg-primary/10 transition-colors"
                                  onClick={() => toggleFeatured(business.id, business.is_featured)}
                                >
                                  <Star className={cn("mr-2 h-4 w-4", business.is_featured ? "fill-amber-400 text-amber-400" : "")} />
                                  {business.is_featured ? 'Retirer de la une' : 'Promouvoir à la une'}
                                </DropdownMenuItem>

                                {!business.logo_url && !business.logo_requested && (
                                  <DropdownMenuItem
                                    className="rounded-xl py-3 font-bold hover:bg-indigo-500/10 transition-colors"
                                    onClick={() => handleRequestLogo(business.id)}
                                  >
                                    <Building className="mr-2 h-4 w-4" />
                                    Demander un logo
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator className="bg-border/10 my-1" />
                                <DropdownMenuItem
                                  className="rounded-xl py-3 font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
                                  onClick={() => setDeleteDialog({
                                    open: true,
                                    businessId: business.id,
                                    businessName: business.name
                                  })}
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
              </Table >
            </div >
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-8">
              {businesses.map((business) => (
                <Card key={business.id} className={cn(
                  "group border-border/30 shadow-xl rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2",
                  selectedIds.includes(business.id) ? "ring-2 ring-primary ring-offset-4" : ""
                )}>
                  <CardHeader className="p-0 relative h-48 bg-muted">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                    <div className="absolute top-4 right-4 z-20 flex gap-2">
                      <Checkbox
                        checked={selectedIds.includes(business.id)}
                        onCheckedChange={() => toggleSelect(business.id)}
                        className="bg-white/20 backdrop-blur-md border-white/40 data-[state=checked]:bg-primary h-6 w-6 rounded-lg"
                      />
                    </div>
                    <div className="absolute bottom-4 left-6 z-20">
                      <p className="text-white font-black text-xl line-clamp-1">{business.name}</p>
                      <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {business.city}
                      </p>
                    </div>
                    <div className="h-full w-full">
                      {(() => {
                        const logoUrl = getStoragePublicUrl(business.logo_url);
                        if (logoUrl && isValidImageUrl(logoUrl)) {
                          return <Image src={logoUrl} alt={business.name} fill className="object-cover transition-transform group-hover:scale-110 duration-1000" />;
                        }
                        return (
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                            <Building className="h-12 w-12 text-slate-400 opacity-30" />
                          </div>
                        );
                      })()}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <Badge className="bg-slate-100 dark:bg-slate-800 text-muted-foreground border-none font-black text-[10px] uppercase">{business.category}</Badge>
                        <div className="flex flex-wrap gap-1.5">
                          {business.is_sponsored && (
                            <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-[8px] border-0 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                              Sponsorisé
                            </Badge>
                          )}
                          {business.is_featured && (
                            <Badge className="bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-[8px] border-0 px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm animate-pulse">
                              À la une
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-400/10 px-2 py-1 rounded-lg">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="font-black text-xs tabular-nums text-amber-600">{business.overall_rating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        {business.user_id ? <ShieldCheck className="h-4 w-4 text-indigo-500" /> : <ShieldAlert className="h-4 w-4" />}
                        {business.user_id ? "Revendiqué" : "Non réclamé"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        {business.review_count || 0} avis
                      </div>
                    </div>
                    <Button asChild variant="outline" className="w-full rounded-2xl h-10 border-border/40 font-bold hover:bg-primary/10 transition-all">
                      <Link href={`/businesses/${business.id}`} target="_blank">
                        Détails entreprise <ChevronRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
          }

          {
            !loading && totalCount > 0 && (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t border-border/10 p-4 md:p-6">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Affichage {pageStart + 1}-{Math.min(pageEnd, totalCount)} sur {totalCount}
                </div>

                <div className="flex items-center gap-3">
                  <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                    <SelectTrigger className="w-[110px] h-9 rounded-xl bg-white/50 border-border/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/10">
                      <SelectItem value="12">12 / page</SelectItem>
                      <SelectItem value="24">24 / page</SelectItem>
                      <SelectItem value="48">48 / page</SelectItem>
                      <SelectItem value="96">96 / page</SelectItem>
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
                  </Button>
                </div>
              </div>
            )
          }
        </CardContent >
      </Card >



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
                  <p className="text-white font-black text-sm md:text-base uppercase tracking-tight">Traitement en Lot</p>
                  <p className="text-muted-foreground text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Action sur la sélection annuaire</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 pr-0 md:pr-2">
                <Button variant="ghost" className="rounded-xl md:rounded-2xl text-white hover:bg-white/10 font-bold px-4 h-10 md:h-12 text-xs md:text-sm" onClick={() => setSelectedIds([])} disabled={isProcessingBulk}>
                  Annuler
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, businessId: '', businessName: '' })}>
        <DialogContent className="rounded-[2.5rem] border-0 bg-white dark:bg-slate-950 p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader className="space-y-4">
            <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center border border-rose-500/20 mb-2">
              <AlertTriangle className="h-10 w-10 text-rose-500" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">
              Confirmation de bannissement
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-slate-600 dark:text-slate-400 pt-2 space-y-4 font-medium">
                <p>Êtes-vous sûr de vouloir bannir <strong>"{deleteDialog.businessName}"</strong> ? Cette action est définitive.</p>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 space-y-2 border border-border/10">
                  <p className="text-rose-500 font-black text-xs uppercase tracking-widest flex items-center gap-1">Données supprimées :</p>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-center gap-2 text-muted-foreground"><X className="h-3 w-3 text-rose-500" /> Historique des avis</li>
                    <li className="flex items-center gap-2 text-muted-foreground"><X className="h-3 w-3 text-rose-500" /> Mises à jour & Photos</li>
                    <li className="flex items-center gap-2 text-muted-foreground"><X className="h-3 w-3 text-rose-500" /> Revendications liées</li>
                    <li className="flex items-center gap-2 text-muted-foreground"><X className="h-3 w-3 text-rose-500" /> Accès propriétaire</li>
                  </ul>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-8 gap-3">
            <Button variant="outline" className="rounded-2xl border-border/40 font-bold px-8 h-12" onClick={() => setDeleteDialog({ open: false, businessId: '', businessName: '' })}>
              Annuler
            </Button>
            <Button
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black px-10 h-12 shadow-xl shadow-rose-500/20"
              onClick={handleDelete}
              disabled={actionLoading === deleteDialog.businessId}
            >
              {actionLoading === deleteDialog.businessId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Bannir définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Business Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="rounded-[2.5rem] border-0 bg-white dark:bg-slate-950 p-8 shadow-2xl max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
              <Plus className="h-8 w-8" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">Ajouter un <span className="text-primary italic">Établissement</span></DialogTitle>
            <DialogDescription className="font-medium">Saisissez les informations de base pour créer une nouvelle fiche.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest ml-1">Nom de l'entreprise *</Label>
              <Input id="name" placeholder="ex: Café de Paris" className="rounded-xl" value={newBusiness.name} onChange={e => setNewBusiness({ ...newBusiness, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-widest ml-1">Catégorie *</Label>
              <Input id="category" placeholder="ex: Restaurant" className="rounded-xl" value={newBusiness.category} onChange={e => setNewBusiness({ ...newBusiness, category: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" className="text-[10px] font-black uppercase tracking-widest ml-1">Ville *</Label>
              <Input id="city" placeholder="ex: Casablanca" className="rounded-xl" value={newBusiness.city} onChange={e => setNewBusiness({ ...newBusiness, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest ml-1">Adresse *</Label>
              <Input id="address" placeholder="ex: 123 Rue de la Liberté" className="rounded-xl" value={newBusiness.address} onChange={e => setNewBusiness({ ...newBusiness, address: e.target.value })} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="desc" className="text-[10px] font-black uppercase tracking-widest ml-1">Description</Label>
              <Textarea id="desc" placeholder="Courte description..." className="rounded-xl min-h-[100px]" value={newBusiness.description} onChange={e => setNewBusiness({ ...newBusiness, description: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
              <div>
                <Label className="font-black text-sm block">Statut Premium</Label>
                <p className="text-xs text-muted-foreground font-medium">Activer directement les avantages Premium.</p>
              </div>
              <Switch checked={newBusiness.isPremium} onCheckedChange={checked => setNewBusiness({ ...newBusiness, isPremium: checked })} />
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button variant="ghost" className="rounded-xl font-bold px-6 h-12" onClick={() => setCreateDialog(false)}>Annuler</Button>
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl font-black px-10 h-12 shadow-lg shadow-primary/20" onClick={handleCreateBusiness} disabled={isProcessingBulk}>
              {isProcessingBulk ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Créer la fiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
