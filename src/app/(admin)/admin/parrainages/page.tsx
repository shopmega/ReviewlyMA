import { verifyAdminSession, createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  adminUpdateReferralOfferStatusForm,
  adminUpdateReferralReportStatusForm,
  adminUpdateReferralRequestStatusForm,
} from '@/app/actions/referrals';
import Link from 'next/link';
import {
  Briefcase,
  Users,
  AlertTriangle,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  Handshake,
  UserCheck,
  ShieldAlert,
  Pause,
  Ban,
  Eye,
  MessageSquare,
  FileText,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

type AdminOffer = {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  status: string;
  created_at: string;
};

type AdminRequest = {
  id: string;
  offer_id: string;
  candidate_user_id: string;
  status: string;
  created_at: string;
  message: string | null;
  offer: {
    id: string;
    company_name: string;
    job_title: string;
  } | null;
};

type AdminReport = {
  id: number;
  offer_id: string;
  reporter_user_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

type AdminRequestRow = Omit<AdminRequest, 'offer'> & {
  offer:
  | {
    id: string;
    company_name: string;
    job_title: string;
  }
  | {
    id: string;
    company_name: string;
    job_title: string;
  }[]
  | null;
};

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  active: { label: 'Actif', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  paused: { label: 'En pause', icon: Pause, color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/20' },
  closed: { label: 'Fermé', icon: XCircle, color: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/20' },
  rejected: { label: 'Rejeté', icon: Ban, color: 'text-rose-600', bg: 'bg-rose-500/10 border-rose-500/20' },
  pending: { label: 'En attente', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/20' },
  in_review: { label: 'En revue', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-500/20' },
  referred: { label: 'Référé', icon: Handshake, color: 'text-indigo-600', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  interview: { label: 'Entretien', icon: Users, color: 'text-purple-600', bg: 'bg-purple-500/10 border-purple-500/20' },
  hired: { label: 'Embauché', icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  withdrawn: { label: 'Retiré', icon: XCircle, color: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/20' },
  open: { label: 'Ouvert', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/20' },
  investigating: { label: 'Enquête', icon: ShieldAlert, color: 'text-purple-600', bg: 'bg-purple-500/10 border-purple-500/20' },
  resolved: { label: 'Résolu', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  dismissed: { label: 'Rejeté', icon: XCircle, color: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/20' },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/30' };
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`${config.bg} ${config.color} border font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest`}>
      <Icon className="mr-1 h-3 w-3" /> {config.label}
    </Badge>
  );
}

function StatusActionButtons({
  statuses,
  currentStatus,
  action,
  idField,
  idValue,
}: {
  statuses: string[];
  currentStatus: string;
  action: (formData: FormData) => void;
  idField: string;
  idValue: string | number;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {statuses.map((status) => {
        const config = statusConfig[status] || { label: status, icon: Clock, color: 'text-muted-foreground', bg: '' };
        const Icon = config.icon;
        const isActive = currentStatus === status;
        return (
          <form key={status} action={action}>
            <input type="hidden" name={idField} value={idValue} />
            <input type="hidden" name="status" value={status} />
            <Button
              type="submit"
              size="sm"
              variant={isActive ? 'default' : 'ghost'}
              className={`rounded-xl h-8 px-3 font-bold text-[10px] uppercase tracking-widest transition-all ${isActive
                  ? 'shadow-lg shadow-primary/20'
                  : `${config.color} hover:bg-muted/50`
                }`}
              disabled={isActive}
            >
              <Icon className="mr-1 h-3 w-3" />
              {config.label}
            </Button>
          </form>
        );
      })}
    </div>
  );
}

export default async function AdminReferralOffersPage() {
  await verifyAdminSession();
  const admin = await createAdminClient();

  const { data: offers } = await admin
    .from('job_referral_offers')
    .select('id, user_id, company_name, job_title, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const { data: requests } = await admin
    .from('job_referral_requests')
    .select(`
      id,
      offer_id,
      candidate_user_id,
      status,
      created_at,
      message,
      offer:job_referral_offers!offer_id (
        id,
        company_name,
        job_title
      )
    `)
    .order('created_at', { ascending: false })
    .limit(250);

  const { data: reports } = await admin
    .from('job_referral_offer_reports')
    .select('id, offer_id, reporter_user_id, reason, details, status, created_at')
    .order('created_at', { ascending: false })
    .limit(250);

  const items = (offers || []) as AdminOffer[];
  const requestItems = ((requests || []) as AdminRequestRow[]).map((request) => ({
    ...request,
    offer: Array.isArray(request.offer) ? (request.offer[0] ?? null) : request.offer,
  }));
  const reportItems = (reports || []) as AdminReport[];

  const activeOffers = items.filter((o) => o.status === 'active').length;
  const pendingRequests = requestItems.filter((r) => r.status === 'pending').length;
  const openReports = reportItems.filter((r) => r.status === 'open' || r.status === 'investigating').length;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-2">
          <Badge className="bg-primary/10 text-primary border-none font-bold px-3 py-1 uppercase tracking-wider text-[10px]">Réseau & Talents</Badge>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Gestion des <span className="text-primary italic">Parrainages</span>
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <Handshake className="h-4 w-4" /> Modération et supervision des offres de parrainage
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Briefcase className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-indigo-500/20 text-indigo-600">Total</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{items.length}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Offres publiées</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-emerald-500/20 text-emerald-600">Live</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{activeOffers}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Offres actives</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-amber-500/20 text-amber-600">À traiter</Badge>
            </div>
            <p className="text-3xl font-black tabular-nums">{pendingRequests}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Demandes en attente</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldAlert className="h-6 w-6" />
              </div>
              {openReports > 0 && (
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-rose-500/20 text-rose-600 animate-pulse">Urgent</Badge>
              )}
            </div>
            <p className="text-3xl font-black tabular-nums">{openReports}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Signalements ouverts</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Offers / Requests / Reports */}
      <Tabs defaultValue="offers" className="space-y-8">
        <TabsList className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-border/50 h-14 p-1.5 rounded-2xl w-full max-w-xl">
          <TabsTrigger value="offers" className="flex-1 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm transition-all gap-2">
            <Briefcase className="h-4 w-4" /> Offres ({items.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex-1 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm transition-all gap-2">
            <Users className="h-4 w-4" /> Demandes ({requestItems.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-1 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm transition-all gap-2">
            <AlertTriangle className="h-4 w-4" /> Signalements ({reportItems.length})
          </TabsTrigger>
        </TabsList>

        {/* === OFFERS TAB === */}
        <TabsContent value="offers" className="animate-in fade-in duration-300">
          <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-0">
              {items.length === 0 ? (
                <div className="text-center py-40 space-y-6">
                  <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto border border-dashed border-border/60">
                    <Briefcase className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                  <p className="text-2xl font-black">Aucune offre disponible</p>
                  <p className="text-muted-foreground font-medium">Les offres de parrainage apparaîtront ici.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/10">
                        <TableHead className="py-6 pl-8 font-bold uppercase tracking-widest text-[10px]">Entreprise & Poste</TableHead>
                        <TableHead className="hidden md:table-cell font-bold uppercase tracking-widest text-[10px]">Date</TableHead>
                        <TableHead className="font-bold uppercase tracking-widest text-[10px]">Statut</TableHead>
                        <TableHead className="font-bold uppercase tracking-widest text-[10px]">Actions rapides</TableHead>
                        <TableHead className="text-right pr-8 font-bold uppercase tracking-widest text-[10px]">Lien</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((offer) => (
                        <TableRow key={offer.id} className="group border-b border-border/10 hover:bg-muted/40 transition-all duration-300">
                          <TableCell className="py-6 pl-8">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/40 dark:to-indigo-800/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-black text-xs border border-indigo-500/10 flex-shrink-0">
                                {offer.company_name?.[0]?.toUpperCase() || 'C'}
                              </div>
                              <div>
                                <p className="font-black text-sm text-slate-800 dark:text-white group-hover:text-primary transition-colors">{offer.job_title}</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{offer.company_name}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-xs font-black tabular-nums">{format(new Date(offer.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={offer.status} />
                          </TableCell>
                          <TableCell>
                            <StatusActionButtons
                              statuses={['active', 'paused', 'closed', 'rejected']}
                              currentStatus={offer.status}
                              action={adminUpdateReferralOfferStatusForm}
                              idField="offerId"
                              idValue={offer.id}
                            />
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <Button asChild size="sm" variant="ghost" className="rounded-xl h-8 font-bold text-primary hover:bg-primary/10">
                              <Link href={`/parrainages/${offer.id}`} target="_blank">
                                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Voir
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === REQUESTS TAB === */}
        <TabsContent value="requests" className="animate-in fade-in duration-300">
          <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-0">
              {requestItems.length === 0 ? (
                <div className="text-center py-40 space-y-6">
                  <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto border border-dashed border-border/60">
                    <Users className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                  <p className="text-2xl font-black">Aucune demande disponible</p>
                  <p className="text-muted-foreground font-medium">Les candidatures apparaîtront ici.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/10">
                        <TableHead className="py-6 pl-8 font-bold uppercase tracking-widest text-[10px]">Offre & Candidat</TableHead>
                        <TableHead className="hidden lg:table-cell font-bold uppercase tracking-widest text-[10px]">Message</TableHead>
                        <TableHead className="hidden md:table-cell font-bold uppercase tracking-widest text-[10px]">Date</TableHead>
                        <TableHead className="font-bold uppercase tracking-widest text-[10px]">Statut</TableHead>
                        <TableHead className="font-bold uppercase tracking-widest text-[10px]">Pipeline</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requestItems.map((request) => (
                        <TableRow key={request.id} className="group border-b border-border/10 hover:bg-muted/40 transition-all duration-300">
                          <TableCell className="py-6 pl-8">
                            <div className="flex flex-col">
                              <span className="font-black text-sm text-slate-800 dark:text-white group-hover:text-primary transition-colors">
                                {request.offer?.job_title || 'Offre supprimée'}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{request.offer?.company_name || 'Entreprise inconnue'}</span>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                Candidat: #{request.candidate_user_id.slice(0, 8)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell max-w-xs">
                            {request.message ? (
                              <div className="rounded-xl bg-muted/30 border border-border/10 p-3 text-xs text-muted-foreground line-clamp-2 italic">
                                <MessageSquare className="h-3 w-3 inline mr-1 opacity-50" />
                                {request.message}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Aucun message</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-xs font-black tabular-nums">{format(new Date(request.created_at), 'dd/MM/yy', { locale: fr })}</span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={request.status} />
                          </TableCell>
                          <TableCell>
                            <StatusActionButtons
                              statuses={['pending', 'in_review', 'referred', 'interview', 'hired', 'rejected', 'withdrawn']}
                              currentStatus={request.status}
                              action={adminUpdateReferralRequestStatusForm}
                              idField="requestId"
                              idValue={request.id}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === REPORTS TAB === */}
        <TabsContent value="reports" className="animate-in fade-in duration-300">
          <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-0">
              {reportItems.length === 0 ? (
                <div className="text-center py-40 space-y-6">
                  <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                    <ShieldAlert className="h-12 w-12 text-emerald-500/50" />
                  </div>
                  <p className="text-2xl font-black">Aucun signalement</p>
                  <p className="text-muted-foreground font-medium">La file de modération est vide.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/10">
                  {reportItems.map((report) => (
                    <div key={report.id} className="p-6 md:p-8 hover:bg-muted/20 transition-colors group">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                        <div className="flex-1 space-y-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest">
                              #{report.id}
                            </Badge>
                            <StatusBadge status={report.status} />
                            <Badge variant="outline" className="font-bold text-[10px] rounded-lg">{report.reason}</Badge>
                          </div>

                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest space-x-4">
                            <span>Offre: #{report.offer_id.slice(0, 8)}</span>
                            <span>Reporter: #{report.reporter_user_id.slice(0, 8)}</span>
                            <span>{format(new Date(report.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</span>
                          </div>

                          {report.details && (
                            <div className="rounded-2xl bg-muted/20 border border-border/10 p-4 text-sm text-muted-foreground italic">
                              <FileText className="h-3.5 w-3.5 inline mr-1.5 opacity-50" />
                              {report.details}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-4 items-center pt-2">
                            <StatusActionButtons
                              statuses={['open', 'investigating', 'resolved', 'dismissed']}
                              currentStatus={report.status}
                              action={adminUpdateReferralReportStatusForm}
                              idField="reportId"
                              idValue={report.id}
                            />

                            <Button asChild size="sm" variant="ghost" className="rounded-xl h-8 font-bold text-primary hover:bg-primary/10">
                              <Link href={`/parrainages/${report.offer_id}`} target="_blank">
                                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Voir l&apos;offre
                              </Link>
                            </Button>
                          </div>

                          <form action={adminUpdateReferralReportStatusForm} className="flex gap-3 items-end pt-2 max-w-xl">
                            <input type="hidden" name="reportId" value={report.id} />
                            <input type="hidden" name="status" value={report.status} />
                            <div className="flex-1">
                              <textarea
                                name="moderationNote"
                                className="min-h-[60px] w-full rounded-2xl border border-border/20 bg-white/50 dark:bg-slate-950/50 px-4 py-3 text-sm font-medium placeholder:text-muted-foreground/50 focus:ring-primary/20 focus:outline-none focus:ring-2 transition-all"
                                placeholder="Note de modération interne (optionnel)..."
                              />
                            </div>
                            <Button type="submit" size="sm" variant="outline" className="rounded-xl h-10 px-6 font-bold">
                              Enregistrer
                            </Button>
                          </form>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
