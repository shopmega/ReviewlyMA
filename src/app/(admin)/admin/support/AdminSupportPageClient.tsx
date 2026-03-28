'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { TicketConversation } from '@/components/support/TicketConversation';
import { useToast } from '@/hooks/use-toast';
import {
  getAllSupportTickets,
  getSupportAssignableAdmins,
  getSupportTicketStats,
  markSupportTicketAsRead,
  updateSupportTicket,
  type SupportAssignee,
  type SupportTicketEscalationLevel,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from '@/app/actions/support';
import { type SupportTicket } from '@/lib/types';
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Loader2,
  MessageCircle,
  MessageSquare,
  Search,
  Siren,
  UserCog,
  XCircle,
} from 'lucide-react';

const SUPPORT_CATEGORIES = [
  { value: 'all', label: 'Toutes les categories' },
  { value: 'account', label: 'Compte et connexion' },
  { value: 'billing', label: 'Facturation et abonnement' },
  { value: 'business', label: "Gestion de l'etablissement" },
  { value: 'reviews', label: 'Avis et commentaires' },
  { value: 'technical', label: 'Probleme technique' },
  { value: 'other', label: 'Autre question' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'resolved', label: 'Resolus' },
  { value: 'closed', label: 'Fermes' },
];

const PRIORITY_OPTIONS: { value: SupportTicketPriority; label: string }[] = [
  { value: 'low', label: 'Basse' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
];

const ESCALATION_OPTIONS: { value: SupportTicketEscalationLevel; label: string }[] = [
  { value: 'none', label: 'Standard' },
  { value: 'watch', label: 'Sous surveillance' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'critical', label: 'Critique' },
];

function formatTicketDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatSlaInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function getStatusBadge(status: SupportTicketStatus) {
  const variants = {
    pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'En attente' },
    in_progress: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: MessageCircle, label: 'En cours' },
    resolved: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2, label: 'Resolus' },
    closed: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle, label: 'Ferme' },
  } as const;
  const variant = variants[status];
  const Icon = variant.icon;
  return <Badge variant="outline" className={`${variant.color} border font-medium`}><Icon className="mr-1 h-3 w-3" />{variant.label}</Badge>;
}

function getPriorityBadge(priority: SupportTicketPriority) {
  const colors = { low: 'bg-slate-100 text-slate-700', medium: 'bg-orange-100 text-orange-700', high: 'bg-red-100 text-red-700' } as const;
  const labels = { low: 'Basse', medium: 'Moyenne', high: 'Haute' } as const;
  return <Badge variant="outline" className={colors[priority]}>{labels[priority]}</Badge>;
}

function getEscalationBadge(level?: SupportTicketEscalationLevel) {
  const value = level || 'none';
  const colors = { none: 'bg-slate-100 text-slate-700', watch: 'bg-amber-100 text-amber-700', urgent: 'bg-orange-100 text-orange-700', critical: 'bg-rose-100 text-rose-700' } as const;
  const labels = { none: 'Standard', watch: 'Surveillance', urgent: 'Urgent', critical: 'Critique' } as const;
  return <Badge variant="outline" className={colors[value]}>{labels[value]}</Badge>;
}

function getSlaBadge(ticket: SupportTicket) {
  if (!ticket.sla_due_at || ticket.status === 'resolved' || ticket.status === 'closed') {
    return <span className="text-xs text-muted-foreground">-</span>;
  }
  const dueAt = new Date(ticket.sla_due_at).getTime();
  const now = Date.now();
  if (dueAt < now) return <Badge variant="outline" className="border-rose-200 bg-rose-100 text-rose-700">Depasse</Badge>;
  if (dueAt - now < 6 * 60 * 60 * 1000) return <Badge variant="outline" className="border-amber-200 bg-amber-100 text-amber-700">A risque</Badge>;
  return <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-700">Dans les delais</Badge>;
}

export default function AdminSupportPageClient() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, in_progress: 0, resolved: 0, closed: 0, unread_admin: 0, unassigned: 0, sla_breached: 0 });
  const [assignableAdmins, setAssignableAdmins] = useState<SupportAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [response, setResponse] = useState('');
  const [newStatus, setNewStatus] = useState<SupportTicketStatus>('in_progress');
  const [newPriority, setNewPriority] = useState<SupportTicketPriority>('medium');
  const [assignedAdminId, setAssignedAdminId] = useState('unassigned');
  const [escalationLevel, setEscalationLevel] = useState<SupportTicketEscalationLevel>('none');
  const [internalNotes, setInternalNotes] = useState('');
  const [slaDueAt, setSlaDueAt] = useState('');
  const [updating, setUpdating] = useState(false);
  const effectiveTotal = stats.total > 0 ? stats.total : tickets.length;

  useEffect(() => { void fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [ticketsData, statsData, adminsData] = await Promise.all([
        getAllSupportTickets(),
        getSupportTicketStats(),
        getSupportAssignableAdmins(),
      ]);
      setTickets(ticketsData);
      setStats(statsData);
      setAssignableAdmins(adminsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger les tickets', variant: 'destructive' });
    }
    setLoading(false);
  }

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      (ticket.subject?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (ticket.user_email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (ticket.user_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (ticket.assigned_admin_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  async function handleViewTicket(ticket: SupportTicket) {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setNewPriority(ticket.priority);
    setResponse(ticket.admin_response || '');
    setAssignedAdminId(ticket.assigned_admin_id || 'unassigned');
    setEscalationLevel(ticket.escalation_level || 'none');
    setInternalNotes(ticket.internal_notes || '');
    setSlaDueAt(formatSlaInput(ticket.sla_due_at));
    setDialogOpen(true);
    if (!ticket.is_read_by_admin) {
      await markSupportTicketAsRead(ticket.id, 'admin');
      void fetchData();
    }
  }

  async function handleUpdateTicket() {
    if (!selectedTicket) return;
    setUpdating(true);
    try {
      const result = await updateSupportTicket(selectedTicket.id, newStatus, response || undefined, newPriority, {
        assignedAdminId: assignedAdminId === 'unassigned' ? null : assignedAdminId,
        escalationLevel,
        internalNotes,
        slaDueAt: slaDueAt ? new Date(slaDueAt).toISOString() : null,
      });
      if (result.status === 'success') {
        toast({ title: 'Ticket mis a jour', description: result.message });
        setDialogOpen(false);
        setSelectedTicket(null);
        setResponse('');
        setInternalNotes('');
        setAssignedAdminId('unassigned');
        setEscalationLevel('none');
        setSlaDueAt('');
        void fetchData();
      } else {
        toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de mettre a jour le ticket', variant: 'destructive' });
    }
    setUpdating(false);
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <Badge className="border-none bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">Centre d&apos;Assistance</Badge>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900 dark:text-white">Gestion <span className="text-primary italic">Support</span></h1>
        <p className="mt-2 flex items-center gap-2 font-medium text-muted-foreground"><MessageSquare className="h-4 w-4" /> {effectiveTotal} tickets au total</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-6">
        <Card className="rounded-3xl border-0 bg-white/40 shadow-xl backdrop-blur-xl dark:bg-slate-900/40"><CardContent className="p-6"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-500"><Clock className="h-6 w-6" /></div><p className="text-3xl font-black tabular-nums">{stats.pending}</p><p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">En attente</p></CardContent></Card>
        <Card className="rounded-3xl border-0 bg-white/40 shadow-xl backdrop-blur-xl dark:bg-slate-900/40"><CardContent className="p-6"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500"><MessageCircle className="h-6 w-6" /></div><p className="text-3xl font-black tabular-nums">{stats.in_progress}</p><p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">En cours</p></CardContent></Card>
        <Card className="rounded-3xl border-0 bg-white/40 shadow-xl backdrop-blur-xl dark:bg-slate-900/40"><CardContent className="p-6"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/10 text-green-500"><CheckCircle2 className="h-6 w-6" /></div><p className="text-3xl font-black tabular-nums">{stats.resolved}</p><p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Resolus</p></CardContent></Card>
        <Card className="rounded-3xl border-0 bg-white/40 shadow-xl backdrop-blur-xl dark:bg-slate-900/40"><CardContent className="p-6"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500"><MessageSquare className="h-6 w-6" /></div><p className="text-3xl font-black tabular-nums">{effectiveTotal}</p><p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Tous les tickets</p></CardContent></Card>
        <Card className="rounded-3xl border-0 bg-white/40 shadow-xl backdrop-blur-xl dark:bg-slate-900/40"><CardContent className="p-6"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500"><UserCog className="h-6 w-6" /></div><p className="text-3xl font-black tabular-nums">{stats.unassigned}</p><p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Non assignes</p></CardContent></Card>
        <Card className="rounded-3xl border-0 bg-white/40 shadow-xl backdrop-blur-xl dark:bg-slate-900/40"><CardContent className="p-6"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500"><Siren className="h-6 w-6" /></div><p className="text-3xl font-black tabular-nums">{stats.sla_breached}</p><p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">SLA depasses</p></CardContent></Card>
      </div>

      <Card className="rounded-[2.5rem] border-0 bg-white/40 shadow-2xl backdrop-blur-xl dark:bg-slate-900/40">
        <CardContent className="p-0">
          <div className="flex flex-col justify-between gap-6 border-b border-border/10 p-8 lg:flex-row lg:items-center">
            <div className="group relative w-full lg:w-96">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input placeholder="Rechercher par sujet, email, assignee..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-12 rounded-2xl border-border/20 bg-white/50 pl-11 font-medium transition-all focus:ring-primary/20 dark:bg-slate-950/50" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="h-10 w-[180px] rounded-xl border-border/20 bg-white/50"><Filter className="mr-2 h-3 w-3 opacity-50" /><SelectValue placeholder="Statut" /></SelectTrigger><SelectContent className="rounded-xl">{STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="h-10 w-[200px] rounded-xl border-border/20 bg-white/50"><Filter className="mr-2 h-3 w-3 opacity-50" /><SelectValue placeholder="Categorie" /></SelectTrigger><SelectContent className="rounded-xl">{SUPPORT_CATEGORIES.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-40 text-center"><MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" /><p className="text-lg font-bold">Aucun ticket trouve</p><p className="text-muted-foreground">Modifiez vos filtres ou attendez de nouveaux tickets</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="py-6 font-bold uppercase tracking-widest text-[10px]">Utilisateur</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Etablissement</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Sujet</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Categorie</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Priorite</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Assignation</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Escalade</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Statut</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">SLA</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Date</TableHead>
                    <TableHead className="text-right font-bold uppercase tracking-widest text-[10px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id} className="border-b border-border/10 hover:bg-muted/40">
                      <TableCell className="py-6"><div className="flex items-center gap-3">{!ticket.is_read_by_admin && <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary" title="Non lu" />}<div><p className="text-sm font-bold">{ticket.user_name || 'Unknown'}</p><p className="text-xs text-muted-foreground">{ticket.user_email || 'No email'}</p></div></div></TableCell>
                      <TableCell>{ticket.business_name ? <Badge variant="outline" className="rounded-md bg-background px-1.5 py-0 text-[10px]"><Building className="mr-1 h-3 w-3 text-muted-foreground" />{ticket.business_name}</Badge> : <span className="text-xs italic text-muted-foreground">General</span>}</TableCell>
                      <TableCell><p className="line-clamp-1 max-w-xs font-medium">{ticket.subject}</p></TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{SUPPORT_CATEGORIES.find((category) => category.value === ticket.category)?.label}</Badge></TableCell>
                      <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                      <TableCell>{ticket.assigned_admin_name ? <div className="text-xs"><p className="font-semibold">{ticket.assigned_admin_name}</p><p className="text-muted-foreground">{ticket.assigned_admin_email || ''}</p></div> : <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Non assigne</Badge>}</TableCell>
                      <TableCell>{getEscalationBadge(ticket.escalation_level)}</TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell>{getSlaBadge(ticket)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatTicketDate(ticket.created_at)}</TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => void handleViewTicket(ticket)} className="hover:bg-primary/10"><Eye className="mr-2 h-4 w-4" />Traiter</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle>Details du ticket</DialogTitle>
            <DialogDescription>{selectedTicket?.subject}</DialogDescription>
          </DialogHeader>
          {selectedTicket ? (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border bg-muted/50 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div><p className="text-lg font-bold">{selectedTicket.user_name || 'Utilisateur'}</p><p className="text-sm text-muted-foreground">{selectedTicket.user_email || "Pas d'email"}</p></div>
                    {selectedTicket.business_name ? <Badge variant="outline" className="bg-background"><Building className="mr-1 h-3 w-3" />{selectedTicket.business_name}</Badge> : null}
                  </div>
                  <div className="rounded-xl border border-dashed bg-background p-3 text-sm italic">"{selectedTicket.message}"</div>
                  <div className="mt-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cree le {new Date(selectedTicket.created_at).toLocaleString('fr-FR')}</div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label className="text-xs font-black uppercase tracking-widest opacity-70">Statut du ticket</Label><Select value={newStatus} onValueChange={(value) => setNewStatus(value as SupportTicketStatus)}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">En attente</SelectItem><SelectItem value="in_progress">En cours</SelectItem><SelectItem value="resolved">Resolus</SelectItem><SelectItem value="closed">Fermes</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-xs font-black uppercase tracking-widest opacity-70">Priorite</Label><Select value={newPriority} onValueChange={(value) => setNewPriority(value as SupportTicketPriority)}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{PRIORITY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label className="text-xs font-black uppercase tracking-widest opacity-70">Assigne a</Label><Select value={assignedAdminId} onValueChange={setAssignedAdminId}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unassigned">Non assigne</SelectItem>{assignableAdmins.map((admin) => <SelectItem key={admin.id} value={admin.id}>{admin.full_name || admin.email || admin.id}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-xs font-black uppercase tracking-widest opacity-70">Escalade</Label><Select value={escalationLevel} onValueChange={(value) => setEscalationLevel(value as SupportTicketEscalationLevel)}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{ESCALATION_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="space-y-2"><Label className="text-xs font-black uppercase tracking-widest opacity-70">SLA cible</Label><Input type="datetime-local" value={slaDueAt} onChange={(e) => setSlaDueAt(e.target.value)} className="rounded-xl" /></div>
                  <div className="space-y-2"><Label className="text-xs font-black uppercase tracking-widest opacity-70">Notes internes</Label><Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Contexte interne, dependances, prochaines actions..." className="min-h-28 rounded-2xl" /></div>
                  <div className="space-y-2"><Label className="text-xs font-black uppercase tracking-widest opacity-70">Reponse admin</Label><Textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Reponse visible par l'utilisateur" className="min-h-28 rounded-2xl" /></div>
                  <div className="rounded-2xl border bg-muted/30 p-4 text-xs text-muted-foreground"><div className="flex items-center gap-2 font-bold text-slate-700"><AlertTriangle className="h-4 w-4 text-amber-500" />Pilotage operations</div><p className="mt-2">Les notes internes restent cote equipe support. L&apos;escalade et le SLA servent a piloter la priorisation et les retards.</p></div>
                  <Button onClick={() => void handleUpdateTicket()} disabled={updating} size="lg" className="w-full rounded-2xl shadow-lg shadow-primary/20">{updating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mise a jour...</> : <>Mettre a jour le ticket</>}</Button>
                </div>
              </div>
              <div className="space-y-2"><Label className="text-xs font-black uppercase tracking-widest opacity-70">Fil de discussion</Label><TicketConversation ticketId={selectedTicket.id} currentUserRole="admin" /></div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={updating}>Annuler</Button>
            <Button onClick={() => void handleUpdateTicket()} disabled={updating}>{updating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mise a jour...</> : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
