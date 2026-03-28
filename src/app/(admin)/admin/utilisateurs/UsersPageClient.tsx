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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { changeUserRole, toggleUserSuspension, toggleUserPremium } from "@/app/actions/admin";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/components/providers/i18n-provider";
import { UserAdminConfirmDialog, UserRoleBadge } from "@/components/admin/users/UserAdminComponents";
import { useAdminPagination } from "@/hooks/use-admin-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { fetchAdminUsers, fetchAdminUserStats, type AdminUserProfile } from "@/lib/data/admin-users";

export default function UsersPageClient() {
  const [users, setUsers] = useState<AdminUserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, active, suspended
  const [totalCount, setTotalCount] = useState(0);
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
    resetDeps: [debouncedSearchQuery, filterRole, filterStatus],
  });

  useEffect(() => {
    fetchUsers();
  }, [currentPage, pageSize, debouncedSearchQuery, filterRole, filterStatus]);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data, error, count } = await fetchAdminUsers({
      searchQuery: debouncedSearchQuery,
      filterRole,
      filterStatus,
      rangeFrom,
      rangeTo,
    });

    if (!error) {
      setUsers(data);
      setTotalCount(count);
    } else {
      toast({ title: t('common.error', 'Erreur'), description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  }

  async function fetchStats() {
    setStats(await fetchAdminUserStats());
  }

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'pro' | 'user') => {
    setActionLoading(userId);
    const result = await changeUserRole(userId, newRole);

    if (result.status === 'success') {
      toast({ title: t('common.success', 'Succes'), description: result.message });
      fetchUsers();
      fetchStats();
    } else {
      toast({ title: t('common.error', 'Erreur'), description: result.message, variant: 'destructive' });
    }

    setActionLoading(null);
    setConfirmDialog({ open: false, type: null, userId: '', userName: '' });
  };

  const handleSuspension = async (userId: string, suspend: boolean) => {
    setActionLoading(userId);
    const result = await toggleUserSuspension(userId, suspend);

    if (result.status === 'success') {
      toast({ title: t('common.success', 'Succes'), description: result.message });
      fetchUsers();
      fetchStats();
    } else {
      toast({ title: t('common.error', 'Erreur'), description: result.message, variant: 'destructive' });
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
      toast({ title: t('common.success', 'Succes'), description: result.message });
      fetchUsers();
      fetchStats();
    } else {
      toast({ title: t('common.error', 'Erreur'), description: result.message, variant: 'destructive' });
    }

    setActionLoading(null);
    setConfirmDialog({ open: false, type: null, userId: '', userName: '' });
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return t('adminUsers.role.adminFull', 'Administrateur');
      case 'pro': return t('adminUsers.role.pro', 'Professionnel');
      default: return t('adminUsers.role.user', 'Utilisateur');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 pb-2">
        <div className="space-y-2">
          <Badge className="bg-primary/10 text-primary border-none font-bold px-3 py-1 uppercase tracking-wider text-[10px]">{t('adminUsers.badge', 'Utilisateurs & Acces')}</Badge>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            {t('adminUsers.titlePrefix', 'Base')} <span className="text-primary italic">{t('adminUsers.titleAccent', 'Membres')}</span>
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2 text-sm">
            <UsersIcon className="h-4 w-4" /> {stats.totalUsers} {t('adminUsers.registeredAccounts', 'comptes enregistres')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
          <Button variant="outline" size="icon" className="rounded-xl h-12 w-12 hover:bg-primary/10 hover:text-primary transition-all border-border/40 bg-white/50 dark:bg-white/5 backdrop-blur-sm self-start" onClick={fetchUsers}>
            <History className="h-5 w-5" />
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white font-black px-8 h-12 rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto" asChild>
            <Link href="/admin/parametres#premium">
              <Crown size={18} className="mr-2" /> {t('adminUsers.managePremiumOffer', "Gerer l'offre Premium")}
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
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('adminUsers.kpi.totalUsers', 'Total Utilisateurs')}</p>
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
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('adminUsers.kpi.premiumUsers', 'Utilisateurs Premium')}</p>
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
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('adminUsers.kpi.proAccounts', 'Comptes Professionnels')}</p>
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
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('adminUsers.kpi.suspendedProfiles', 'Profils Suspendus')}</p>
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
                  placeholder={t('adminUsers.searchPlaceholder', 'Rechercher par nom ou email...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-white/50 dark:bg-slate-950/50 border-border/20 rounded-2xl focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white/50 border-border/20 transition-all">
                    <Filter className="h-3 w-3 mr-2 opacity-50" />
                    <SelectValue placeholder={t('adminUsers.filters.allRoles', 'Tous les roles')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/10 backdrop-blur-xl">
                    <SelectItem value="all">{t('adminUsers.filters.allRoles', 'Tous les roles')}</SelectItem>
                    <SelectItem value="user">{t('adminUsers.filters.users', 'Utilisateurs')}</SelectItem>
                    <SelectItem value="pro">{t('adminUsers.filters.pros', 'Professionnels')}</SelectItem>
                    <SelectItem value="admin">{t('adminUsers.filters.admins', 'Administrateurs')}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white/50 border-border/20 transition-all">
                    <Activity className="h-3 w-3 mr-2 opacity-50" />
                    <SelectValue placeholder={t('adminUsers.filters.allStatuses', 'Tous les statuts')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/10 backdrop-blur-xl">
                    <SelectItem value="all">{t('adminUsers.filters.allStatuses', 'Tous les statuts')}</SelectItem>
                    <SelectItem value="active">{t('adminUsers.filters.active', 'Actifs')}</SelectItem>
                    <SelectItem value="suspended">{t('adminUsers.filters.suspended', 'Suspendus')}</SelectItem>
                  </SelectContent>
                </Select>

                {(filterRole !== 'all' || filterStatus !== 'all' || searchQuery !== '') && (
                  <Button variant="ghost" size="sm" onClick={() => { setFilterRole('all'); setFilterStatus('all'); setSearchQuery(''); }} className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
                    {t('adminUsers.filters.clear', 'Effacer les filtres')}
                  </Button>
                )}
              </div>
            </div>

            <div className="hidden lg:flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest antialiased">{t('adminUsers.serverOperational', 'Serveur Operationnel')}</span>
              </div>
              <span className="text-[9px] font-bold text-muted-foreground">{t('adminUsers.latency', 'LATENCY: 42ms')}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
              <div className="h-12 w-12 border-b-2 border-primary border-t-2 border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground font-black animate-pulse uppercase tracking-widest text-[10px]">{t('adminUsers.loadingSync', 'Syncing Members...')}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-40 space-y-6">
              <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto border border-dashed border-border/60">
                <UserIcon className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <div className="max-w-xs mx-auto space-y-2">
                <p className="text-2xl font-black">{t('adminUsers.emptyTitle', 'Aucun utilisateur')}</p>
                <p className="text-muted-foreground font-medium">{t('adminUsers.emptyDesc', 'Reduisez vos filtres ou effectuez une nouvelle recherche.')}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/10">
                    <TableHead className="py-6 pl-8 font-bold uppercase tracking-widest text-[10px]">{t('adminUsers.table.user', 'Utilisateur')}</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">{t('adminUsers.table.roleStatus', 'Role & Statut')}</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">{t('adminUsers.table.registeredOn', 'Inscrit le')}</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">{t('adminUsers.table.uniqueId', 'ID Unique')}</TableHead>
                    <TableHead className="text-right pr-8 font-bold uppercase tracking-widest text-[10px]">{t('adminUsers.table.actions', 'Actions')}</TableHead>
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
                            <p className="font-black text-slate-800 dark:text-white group-hover:text-primary transition-colors">{user.full_name || t('adminUsers.noName', 'Sans Nom')}</p>
                            <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 mt-0.5 uppercase tracking-tight">
                              <Mail className="h-3 w-3" /> {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <UserRoleBadge
                          role={user.role}
                          suspended={user.suspended}
                          premium={user.is_premium}
                          t={t}
                        />
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
                                  {t('adminUsers.actions.privilegesRoles', 'Privileges & Roles')}
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
                                {user.is_premium ? t('adminUsers.actions.cancelPremium', 'Resilier Premium') : t('adminUsers.actions.giftPremium', 'Gifting Premium')}
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
                                {user.suspended ? t('adminUsers.actions.reactivateAccount', 'Reactiver le compte') : t('adminUsers.actions.suspendAccess', "Suspendre l'acces")}
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
                {t('adminUsers.pagination.showing', 'Affichage')} {pageStart + 1}-{Math.min(pageEnd, totalCount)} {t('adminUsers.pagination.of', 'sur')} {totalCount}
              </div>

              <div className="flex items-center gap-3">
                <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="w-[120px] h-9 rounded-xl bg-white/50 border-border/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/10">
                    <SelectItem value="20">20 / {t('adminUsers.pagination.perPage', 'page')}</SelectItem>
                    <SelectItem value="50">50 / {t('adminUsers.pagination.perPage', 'page')}</SelectItem>
                    <SelectItem value="100">100 / {t('adminUsers.pagination.perPage', 'page')}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="text-xs font-black tabular-nums px-2">
                  {t('adminUsers.pagination.page', 'Page')} {currentPage} / {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t('adminUsers.pagination.previous', 'Precedent')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  {t('adminUsers.pagination.next', 'Suivant')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <UserAdminConfirmDialog
        confirmDialog={confirmDialog}
        premiumConfig={premiumConfig}
        loading={actionLoading === confirmDialog.userId}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ open: false, type: null, userId: '', userName: '' });
          }
        }}
        onPremiumConfigChange={setPremiumConfig}
        onConfirm={() => {
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
        getRoleLabel={getRoleLabel}
        t={t}
      />
    </div>
  );
}
