'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  MoreHorizontal,
  Mail,
  Calendar,
  Shield,
  Ban,
  UserCog,
  Loader2,
  Users as UsersIcon,
  Crown,
  Briefcase,
  User as UserIcon,
  Zap,
  CheckCircle2,
  XCircle,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Activity,
  History,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { changeUserRole, toggleUserSuspension, toggleUserPremium } from "@/app/actions/admin";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_premium?: boolean;
  avatar_url: string | null;
  created_at: string;
  suspended?: boolean;
};

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, active, suspended
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    proUsers: 0,
    suspendedUsers: 0,
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'suspend' | 'role' | 'premium' | null;
    userId: string;
    userName: string;
    currentSuspended?: boolean;
    currentPremium?: boolean;
    newRole?: 'admin' | 'pro' | 'user';
  }>({ open: false, type: null, userId: '', userName: '' });
  const [premiumConfig, setPremiumConfig] = useState<{
    tier: 'growth' | 'gold';
    periodMonths: number | null;
  }>({
    tier: 'growth',
    periodMonths: 12,
  });

  const { toast } = useToast();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, filterRole, filterStatus, pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, pageSize, debouncedSearchQuery, filterRole, filterStatus]);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const supabase = createClient();
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    const q = debouncedSearchQuery.trim();
    if (q) {
      const safeQ = q.replace(/,/g, ' ');
      query = query.or(`full_name.ilike.%${safeQ}%,email.ilike.%${safeQ}%`);
    }

    if (filterRole !== 'all') {
      query = query.eq('role', filterRole);
    }

    if (filterStatus === 'suspended') {
      query = query.eq('suspended', true);
    } else if (filterStatus === 'active') {
      query = query.or('suspended.is.null,suspended.eq.false');
    }

    const { data, error, count } = await query.range(from, to);

    if (!error) {
      setUsers((data || []) as Profile[]);
      setTotalCount(count || 0);
    } else {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  }

  async function fetchStats() {
    const supabase = createClient();
    const [allUsers, premiumUsers, proUsers, suspendedUsers] = await Promise.all([
      supabase.from('profiles').select('id', { head: true, count: 'exact' }),
      supabase.from('profiles').select('id', { head: true, count: 'exact' }).eq('is_premium', true),
      supabase.from('profiles').select('id', { head: true, count: 'exact' }).eq('role', 'pro'),
      supabase.from('profiles').select('id', { head: true, count: 'exact' }).eq('suspended', true),
    ]);

    setStats({
      totalUsers: allUsers.count || 0,
      premiumUsers: premiumUsers.count || 0,
      proUsers: proUsers.count || 0,
      suspendedUsers: suspendedUsers.count || 0,
    });
  }

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'pro' | 'user') => {
    setActionLoading(userId);
    const result = await changeUserRole(userId, newRole);

    if (result.status === 'success') {
      toast({ title: 'Succès', description: result.message });
      fetchUsers();
      fetchStats();
    } else {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
    }

    setActionLoading(null);
    setConfirmDialog({ open: false, type: null, userId: '', userName: '' });
  };

  const handleSuspension = async (userId: string, suspend: boolean) => {
    setActionLoading(userId);
    const result = await toggleUserSuspension(userId, suspend);

    if (result.status === 'success') {
      toast({ title: 'Succès', description: result.message });
      fetchUsers();
      fetchStats();
    } else {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
    }

    setActionLoading(null);
    setConfirmDialog({ open: false, type: null, userId: '', userName: '' });
  };

  const handlePremiumToggle = async (
    userId: string,
    shouldHavePremium: boolean,
    tier: 'growth' | 'gold' = 'growth',
    periodMonths: number | null = 12
  ) => {
    setActionLoading(userId);
    const result = await toggleUserPremium(
      userId,
      shouldHavePremium ? tier : 'standard',
      shouldHavePremium ? periodMonths : null
    );

    if (result.status === 'success') {
      toast({ title: 'Succès', description: result.message });
      fetchUsers();
      fetchStats();
    } else {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
    }

    setActionLoading(null);
    setConfirmDialog({ open: false, type: null, userId: '', userName: '' });
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const getRoleBadge = (role: string, suspended?: boolean, premium?: boolean) => {
    if (suspended) {
      return (
        <Badge className="bg-rose-500/10 text-rose-500 border-none font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest">
          <XCircle className="mr-1 h-3 w-3" /> Suspendu
        </Badge>
      );
    }

    if (premium) {
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest animate-pulse">
          <Crown className="mr-1 h-3 w-3 fill-white" /> Premium
        </Badge>
      );
    }

    switch (role) {
      case 'admin':
        return (
          <Badge className="bg-indigo-600 text-white border-0 font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest">
            <Shield className="mr-1 h-3 w-3" /> Admin
          </Badge>
        );
      case 'pro':
        return (
          <Badge className="bg-emerald-500 text-white border-0 font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest">
            <Briefcase className="mr-1 h-3 w-3" /> Professionnel
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-none font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest">
            <UserIcon className="mr-1 h-3 w-3" /> Utilisateur
          </Badge>
        );
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'pro': return 'Professionnel';
      default: return 'Utilisateur';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 pb-2">
        <div className="space-y-2">
          <Badge className="bg-primary/10 text-primary border-none font-bold px-3 py-1 uppercase tracking-wider text-[10px]">Utilisateurs & Accès</Badge>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Base <span className="text-primary italic">Membres</span>
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2 text-sm">
            <UsersIcon className="h-4 w-4" /> {stats.totalUsers} comptes enregistrés
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
          <Button variant="outline" size="icon" className="rounded-xl h-12 w-12 hover:bg-primary/10 hover:text-primary transition-all border-border/40 bg-white/50 dark:bg-white/5 backdrop-blur-sm self-start" onClick={fetchUsers}>
            <History className="h-5 w-5" />
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white font-black px-8 h-12 rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto" asChild>
            <Link href="/admin/parametres#premium">
              <Crown size={18} className="mr-2" /> Gérer l'offre Premium
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UsersIcon className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-black tabular-nums">{stats.totalUsers}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Total Utilisateurs</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Crown className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-black tabular-nums">{stats.premiumUsers}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Utilisateurs Premium</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Briefcase className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-black tabular-nums">{stats.proUsers}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Comptes Professionnels</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <XCircle className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-black tabular-nums">{stats.suspendedUsers}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Profils Suspendus</p>
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
                  placeholder="Rechercher par nom ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-white/50 dark:bg-slate-950/50 border-border/20 rounded-2xl focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white/50 border-border/20 transition-all">
                    <Filter className="h-3 w-3 mr-2 opacity-50" />
                    <SelectValue placeholder="Tous les rôles" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/10 backdrop-blur-xl">
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    <SelectItem value="user">Utilisateurs</SelectItem>
                    <SelectItem value="pro">Professionnels</SelectItem>
                    <SelectItem value="admin">Administrateurs</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white/50 border-border/20 transition-all">
                    <Activity className="h-3 w-3 mr-2 opacity-50" />
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/10 backdrop-blur-xl">
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="active">Actifs</SelectItem>
                    <SelectItem value="suspended">Suspendus</SelectItem>
                  </SelectContent>
                </Select>

                {(filterRole !== 'all' || filterStatus !== 'all' || searchQuery !== '') && (
                  <Button variant="ghost" size="sm" onClick={() => { setFilterRole('all'); setFilterStatus('all'); setSearchQuery(''); }} className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
                    Effacer les filtres
                  </Button>
                )}
              </div>
            </div>

            <div className="hidden lg:flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest antialiased">Serveur Opérationnel</span>
              </div>
              <span className="text-[9px] font-bold text-muted-foreground">LATENCY: 42ms</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
              <div className="h-12 w-12 border-b-2 border-primary border-t-2 border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground font-black animate-pulse uppercase tracking-widest text-[10px]">Syncing Members...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-40 space-y-6">
              <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto border border-dashed border-border/60">
                <UserIcon className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <div className="max-w-xs mx-auto space-y-2">
                <p className="text-2xl font-black">Aucun utilisateur</p>
                <p className="text-muted-foreground font-medium">Réduisez vos filtres ou effectuez une nouvelle recherche.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/10">
                    <TableHead className="py-6 pl-8 font-bold uppercase tracking-widest text-[10px]">Utilisateur</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Rôle & Statut</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Inscrit le</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">ID Unique</TableHead>
                    <TableHead className="text-right pr-8 font-bold uppercase tracking-widest text-[10px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className={cn(
                      "group border-b border-border/10 transition-all duration-300",
                      user.suspended ? "bg-rose-500/5 hover:bg-rose-500/10" : "hover:bg-muted/40"
                    )}>
                      <TableCell className="py-6 pl-8">
                        <div className="flex items-center gap-4">
                          <div className="relative group-hover:scale-110 transition-transform duration-500">
                            <Avatar className="h-12 w-12 rounded-2xl shadow-xl ring-2 ring-white dark:ring-slate-900 ring-offset-2 ring-offset-border/10 overflow-hidden">
                              <AvatarImage src={user.avatar_url || undefined} className="object-cover" />
                              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-primary text-white font-black text-sm rounded-2xl">
                                {(user.full_name || user.email).substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {user.is_premium && (
                              <div className="absolute -top-2 -right-2 h-5 w-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-lg">
                                <Crown className="h-3 w-3 text-white fill-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 dark:text-white group-hover:text-primary transition-colors">{user.full_name || 'Sans Nom'}</p>
                            <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 mt-0.5 uppercase tracking-tight">
                              <Mail className="h-3 w-3" /> {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.role, user.suspended, user.is_premium)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-black tabular-nums">{format(new Date(user.created_at), 'dd/MM/yyyy')}</span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 mt-0.5">{format(new Date(user.created_at), 'HH:mm')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-[10px] font-mono text-muted-foreground select-all">#{user.id.substring(0, 12)}...</code>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        {actionLoading === user.id ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary ml-auto" />
                        ) : (
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm">
                                <MoreVertical className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl border-border/10 backdrop-blur-3xl shadow-2xl p-2 w-64">
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="rounded-xl py-3 font-bold">
                                  <UserCog className="mr-2 h-4 w-4" />
                                  Privilèges & Rôles
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="rounded-2xl border-border/10 ml-2 p-2 w-48 shadow-xl">
                                  {(['admin', 'pro', 'user'] as const).map((role) => (
                                    <DropdownMenuItem
                                      key={role}
                                      disabled={user.role === role}
                                      className="rounded-xl py-2 font-bold"
                                      onClick={() => {
                                        setConfirmDialog({
                                          open: true,
                                          type: 'role',
                                          userId: user.id,
                                          userName: user.full_name || user.email,
                                          newRole: role
                                        });
                                      }}
                                    >
                                      {user.role === role && <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />}
                                      {getRoleLabel(role)}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>

                              <DropdownMenuItem
                                className="rounded-xl py-3 font-bold hover:bg-amber-500/10 transition-colors"
                                onClick={() => {
                                  setPremiumConfig({
                                    tier: user.is_premium ? 'gold' : 'growth',
                                    periodMonths: 12,
                                  });
                                  setConfirmDialog({
                                    open: true,
                                    type: 'premium',
                                    userId: user.id,
                                    userName: user.full_name || user.email,
                                    currentPremium: user.is_premium
                                  });
                                }}
                              >
                                <Zap className={cn("mr-2 h-4 w-4", user.is_premium ? "fill-amber-500 text-amber-500" : "")} />
                                {user.is_premium ? 'Résilier Premium' : 'Gifting Premium'}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator className="bg-border/10 my-1" />

                              <DropdownMenuItem
                                className={cn(
                                  "rounded-xl py-3 font-bold transition-colors",
                                  user.suspended ? "text-emerald-500 hover:bg-emerald-500/10" : "text-rose-500 hover:bg-rose-500/10"
                                )}
                                onClick={() => setConfirmDialog({
                                  open: true,
                                  type: 'suspend',
                                  userId: user.id,
                                  userName: user.full_name || user.email,
                                  currentSuspended: user.suspended
                                })}
                              >
                                {user.suspended ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Ban className="mr-2 h-4 w-4" />}
                                {user.suspended ? 'Réactiver le compte' : 'Suspendre l\'accès'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                  PrÃ©cÃ©dent
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

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, type: null, userId: '', userName: '' })}>
        <DialogContent className="rounded-[2.5rem] border-0 bg-white dark:bg-slate-950 p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader className="space-y-4">
            <div className={cn(
              "w-20 h-20 rounded-3xl flex items-center justify-center border mb-2 transition-colors",
              confirmDialog.type === 'suspend' ? "bg-rose-500/10 border-rose-500/20" : "bg-indigo-500/10 border-indigo-500/20"
            )}>
              {confirmDialog.type === 'suspend' ? <Ban className="h-10 w-10 text-rose-500" /> : <UserCog className="h-10 w-10 text-indigo-500" />}
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">
              {confirmDialog.type === 'suspend'
                ? (confirmDialog.currentSuspended ? 'Réactiver le membre' : 'Suspendre l\'accès')
                : confirmDialog.type === 'premium'
                  ? (confirmDialog.currentPremium ? 'Retirer Premium' : 'Activer Premium Gift')
                  : 'Changement de rôle'
              }
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-slate-600 dark:text-slate-400 pt-2 font-medium">
                {confirmDialog.type === 'suspend'
                  ? (confirmDialog.currentSuspended
                    ? `Voulez-vous réactiver le compte de "${confirmDialog.userName}" ? Il aura de nouveau accès à toutes ses fonctionnalités.`
                    : `Voulez-vous suspendre l'accès pour "${confirmDialog.userName}" ? Il ne pourra plus se connecter à la plateforme.`
                  )
                  : confirmDialog.type === 'premium'
                    ? (confirmDialog.currentPremium
                      ? `Voulez-vous retirer les avantages Premium de "${confirmDialog.userName}" ?`
                      : `Choisissez le plan et la période Premium pour "${confirmDialog.userName}".`
                    )
                    : `Voulez-vous attribuer le rôle "${getRoleLabel(confirmDialog.newRole || 'user')}" à "${confirmDialog.userName}" ?`
                }
              </div>
            </DialogDescription>
          </DialogHeader>
          {confirmDialog.type === 'premium' && !confirmDialog.currentPremium && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Plan</p>
                <Select
                  value={premiumConfig.tier}
                  onValueChange={(value) =>
                    setPremiumConfig((prev) => ({ ...prev, tier: value as 'growth' | 'gold' }))
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choisir un plan" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Periode</p>
                <Select
                  value={premiumConfig.periodMonths === null ? 'unlimited' : String(premiumConfig.periodMonths)}
                  onValueChange={(value) =>
                    setPremiumConfig((prev) => ({
                      ...prev,
                      periodMonths: value === 'unlimited' ? null : Number(value),
                    }))
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choisir une periode" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="1">1 mois</SelectItem>
                    <SelectItem value="3">3 mois</SelectItem>
                    <SelectItem value="6">6 mois</SelectItem>
                    <SelectItem value="12">12 mois</SelectItem>
                    <SelectItem value="24">24 mois</SelectItem>
                    <SelectItem value="unlimited">Illimite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="mt-8 gap-3">
            <Button variant="outline" className="rounded-2xl border-border/40 font-bold px-8 h-12" onClick={() => setConfirmDialog({ open: false, type: null, userId: '', userName: '' })}>
              Annuler
            </Button>
            <Button
              className={cn(
                "rounded-2xl font-black px-10 h-12 shadow-xl transition-all",
                confirmDialog.type === 'suspend' && !confirmDialog.currentSuspended
                  ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
                  : "bg-primary hover:bg-primary/90 shadow-primary/20 text-white"
              )}
              onClick={() => {
                if (confirmDialog.type === 'suspend') {
                  handleSuspension(confirmDialog.userId, !confirmDialog.currentSuspended);
                } else if (confirmDialog.type === 'role' && confirmDialog.newRole) {
                  handleRoleChange(confirmDialog.userId, confirmDialog.newRole);
                } else if (confirmDialog.type === 'premium') {
                  handlePremiumToggle(
                    confirmDialog.userId,
                    !confirmDialog.currentPremium,
                    premiumConfig.tier,
                    premiumConfig.periodMonths
                  );
                }
              }}
              disabled={actionLoading === confirmDialog.userId}
            >
              {actionLoading === confirmDialog.userId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer l'Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
