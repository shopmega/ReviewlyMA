'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Search,
    Filter,
    CheckCircle2,
    Clock,
    MessageCircle,
    XCircle,
    Loader2,
    Eye,
    MessageSquare,
    Building
} from 'lucide-react';
import { TicketConversation } from '@/components/support/TicketConversation';
import { useToast } from '@/hooks/use-toast';
import {
    getAllSupportTickets,
    updateSupportTicket,
    getSupportTicketStats,
    markSupportTicketAsRead,
    type SupportTicketStatus,
    type SupportTicketPriority
} from '@/app/actions/support';
import { type SupportTicket } from '@/lib/types';

const SUPPORT_CATEGORIES = [
    { value: 'all', label: 'Toutes les catégories' },
    { value: 'account', label: 'Compte et connexion' },
    { value: 'billing', label: 'Facturation et abonnement' },
    { value: 'business', label: 'Gestion de l\'établissement' },
    { value: 'reviews', label: 'Avis et commentaires' },
    { value: 'technical', label: 'Problème technique' },
    { value: 'other', label: 'Autre question' },
];

const STATUS_OPTIONS = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'pending', label: 'En attente' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'resolved', label: 'Résolu' },
    { value: 'closed', label: 'Fermé' },
];

const PRIORITY_OPTIONS: { value: SupportTicketPriority; label: string }[] = [
    { value: 'low', label: 'Basse' },
    { value: 'medium', label: 'Moyenne' },
    { value: 'high', label: 'Haute' },
];

export default function AdminSupportPage() {
    const { toast } = useToast();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, in_progress: 0, resolved: 0, closed: 0, unread_admin: 0 });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [response, setResponse] = useState('');
    const [newStatus, setNewStatus] = useState<SupportTicketStatus>('in_progress');
    const [newPriority, setNewPriority] = useState<SupportTicketPriority>('medium');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ticketsData, statsData] = await Promise.all([
                getAllSupportTickets(),
                getSupportTicketStats()
            ]);
            setTickets(ticketsData);
            setStats(statsData);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de charger les tickets',
                variant: 'destructive'
            });
        }
        setLoading(false);
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch =
            (ticket.subject?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (ticket.user_email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (ticket.user_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesCategory;
    });

    const handleViewTicket = async (ticket: SupportTicket) => {
        setSelectedTicket(ticket);
        setNewStatus(ticket.status);
        setNewPriority(ticket.priority);
        setResponse(ticket.admin_response || '');
        setDialogOpen(true);

        // Mark as read if unread
        if (!ticket.is_read_by_admin) {
            await markSupportTicketAsRead(ticket.id, 'admin');
            fetchData(); // Refresh stats and list
        }
    };

    const handleUpdateTicket = async () => {
        if (!selectedTicket) return;

        setUpdating(true);
        try {
            const result = await updateSupportTicket(
                selectedTicket.id,
                newStatus,
                response || undefined,
                newPriority
            );

            if (result.status === 'success') {
                toast({
                    title: 'Ticket mis à jour',
                    description: result.message
                });

                setDialogOpen(false);
                setSelectedTicket(null);
                setResponse('');
                fetchData();
            } else {
                toast({
                    title: 'Erreur',
                    description: result.message,
                    variant: 'destructive'
                });
            }
        } catch (error) {
            toast({
                title: 'Erreur',
                description: 'Impossible de mettre à jour le ticket',
                variant: 'destructive'
            });
        }
        setUpdating(false);
    };

    const getStatusBadge = (status: SupportTicketStatus) => {
        const variants = {
            pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'En attente' },
            in_progress: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: MessageCircle, label: 'En cours' },
            resolved: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2, label: 'Résolu' },
            closed: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle, label: 'Fermé' },
        };

        const variant = variants[status];
        const Icon = variant.icon;

        return (
            <Badge variant="outline" className={`${variant.color} border font-medium`}>
                <Icon className="w-3 h-3 mr-1" />
                {variant.label}
            </Badge>
        );
    };

    const getPriorityBadge = (priority: SupportTicketPriority) => {
        const colors = {
            low: 'bg-slate-100 text-slate-700',
            medium: 'bg-orange-100 text-orange-700',
            high: 'bg-red-100 text-red-700',
        };

        const labels = {
            low: 'Basse',
            medium: 'Moyenne',
            high: 'Haute',
        };

        return <Badge variant="outline" className={colors[priority]}>{labels[priority]}</Badge>;
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <Badge className="bg-primary/10 text-primary border-none font-bold px-3 py-1 uppercase tracking-wider text-[10px]">
                    Centre d'Assistance
                </Badge>
                <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mt-2">
                    Gestion <span className="text-primary italic">Support</span>
                </h1>
                <p className="text-muted-foreground font-medium flex items-center gap-2 mt-2">
                    <MessageSquare className="h-4 w-4" /> {stats.total} tickets au total
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
                                <Clock className="h-6 w-6" />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-yellow-500/20 text-yellow-600">
                                Urgent
                            </Badge>
                        </div>
                        <p className="text-3xl font-black tabular-nums">{stats.pending}</p>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                            En attente
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <MessageCircle className="h-6 w-6" />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-blue-500/20 text-blue-600">
                                Actif
                            </Badge>
                        </div>
                        <p className="text-3xl font-black tabular-nums">{stats.in_progress}</p>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                            En cours
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-green-500/20 text-green-600">
                                Terminé
                            </Badge>
                        </div>
                        <p className="text-3xl font-black tabular-nums">{stats.resolved}</p>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                            Résolus
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                <MessageSquare className="h-6 w-6" />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-purple-500/20 text-purple-600">
                                Total
                            </Badge>
                        </div>
                        <p className="text-3xl font-black tabular-nums">{stats.total}</p>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                            Tous les tickets
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Search */}
            <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem]">
                <CardHeader className="p-8 border-b border-border/10">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="relative w-full lg:w-96 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Rechercher par sujet, email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-11 h-12 bg-white/50 dark:bg-slate-950/50 border-border/20 rounded-2xl focus:ring-primary/20 transition-all font-medium"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white/50 border-border/20">
                                    <Filter className="h-3 w-3 mr-2 opacity-50" />
                                    <SelectValue placeholder="Statut" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {STATUS_OPTIONS.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-[200px] h-10 rounded-xl bg-white/50 border-border/20">
                                    <Filter className="h-3 w-3 mr-2 opacity-50" />
                                    <SelectValue placeholder="Catégorie" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {SUPPORT_CATEGORIES.map(cat => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="text-center py-40">
                            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-lg font-bold">Aucun ticket trouvé</p>
                            <p className="text-muted-foreground">Modifiez vos filtres ou attendez de nouveaux tickets</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="py-6 font-bold uppercase tracking-widest text-[10px]">Utilisateur</TableHead>
                                        <TableHead className="font-bold uppercase tracking-widest text-[10px]">Établissement</TableHead>
                                        <TableHead className="font-bold uppercase tracking-widest text-[10px]">Sujet</TableHead>
                                        <TableHead className="font-bold uppercase tracking-widest text-[10px]">Catégorie</TableHead>
                                        <TableHead className="font-bold uppercase tracking-widest text-[10px]">Priorité</TableHead>
                                        <TableHead className="font-bold uppercase tracking-widest text-[10px]">Statut</TableHead>
                                        <TableHead className="font-bold uppercase tracking-widest text-[10px]">Date</TableHead>
                                        <TableHead className="text-right font-bold uppercase tracking-widest text-[10px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTickets.map((ticket) => (
                                        <TableRow key={ticket.id} className="border-b border-border/10 hover:bg-muted/40">
                                            <TableCell className="py-6">
                                                <div className="flex items-center gap-3">
                                                    {!ticket.is_read_by_admin && (
                                                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" title="Non lu" />
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-sm">{ticket.user_name || 'Unknown'}</p>
                                                        <p className="text-xs text-muted-foreground">{ticket.user_email || 'No email'}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    {ticket.business_name ? (
                                                        <Badge variant="outline" className="px-1.5 py-0 rounded-md text-[10px] bg-background">
                                                            <Building className="h-3 w-3 mr-1 text-muted-foreground" />
                                                            {ticket.business_name}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">Général</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-medium line-clamp-1 max-w-xs">{ticket.subject}</p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-xs">
                                                    {SUPPORT_CATEGORIES.find(c => c.value === ticket.category)?.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                                            <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(ticket.created_at).toLocaleDateString('fr-FR', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleViewTicket(ticket)}
                                                    className="hover:bg-primary/10"
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Traiter
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

            {/* Ticket Detail Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl rounded-[2.5rem] overflow-y-auto max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Détails du ticket</DialogTitle>
                        <DialogDescription>{selectedTicket?.subject}</DialogDescription>
                    </DialogHeader>

                    {selectedTicket && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="p-4 bg-muted/50 rounded-2xl border">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="font-bold text-lg">{selectedTicket.user_name || 'Utilisateur'}</p>
                                            <p className="text-sm text-muted-foreground">{selectedTicket.user_email || 'Pas d\'email'}</p>
                                        </div>
                                        <div className="text-right">
                                            {selectedTicket.business_name && (
                                                <Badge variant="outline" className="bg-background">
                                                    <Building className="h-3 w-3 mr-1" />
                                                    {selectedTicket.business_name}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-background rounded-xl border border-dashed text-sm italic">
                                        "{selectedTicket.message}"
                                    </div>
                                    <div className="mt-3 text-[10px] text-muted-foreground text-right uppercase font-bold tracking-widest">
                                        Créé le {new Date(selectedTicket.created_at).toLocaleString('fr-FR')}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest opacity-70">Statut du ticket</Label>
                                            <Select value={newStatus} onValueChange={(val) => setNewStatus(val as SupportTicketStatus)}>
                                                <SelectTrigger className="rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pending">En attente</SelectItem>
                                                    <SelectItem value="in_progress">En cours</SelectItem>
                                                    <SelectItem value="resolved">Résolu</SelectItem>
                                                    <SelectItem value="closed">Fermé</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest opacity-70">Priorité</Label>
                                            <Select value={newPriority} onValueChange={(val) => setNewPriority(val as SupportTicketPriority)}>
                                                <SelectTrigger className="rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {PRIORITY_OPTIONS.map(opt => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <Button onClick={handleUpdateTicket} disabled={updating} size="lg" className="w-full rounded-2xl shadow-lg shadow-primary/20">
                                        {updating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Mise à jour...
                                            </>
                                        ) : (
                                            <>Mettre à jour le statut</>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest opacity-70">Fil de discussion</Label>
                                <TicketConversation ticketId={selectedTicket.id} currentUserRole="admin" />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={updating}>
                            Annuler
                        </Button>
                        <Button onClick={handleUpdateTicket} disabled={updating}>
                            {updating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Mise à jour...
                                </>
                            ) : (
                                'Envoyer la réponse'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
