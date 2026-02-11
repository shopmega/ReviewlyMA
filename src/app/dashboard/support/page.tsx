'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    XCircle,
    Building,
    ArrowLeft,
    ChevronRight,
    HelpCircle,
    MessageCircle,
    Send,
    Loader2,
    CheckCircle2,
    Clock,
    AlertCircle,
    Mail,
    Phone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBusiness } from '@/contexts/BusinessContext';
import { TicketConversation } from '@/components/support/TicketConversation';
import { cn } from '@/lib/utils';
import {
    createSupportTicket,
    getUserSupportTickets,
    markSupportTicketAsRead,
    type SupportTicketCategory
} from '@/app/actions/support';
import { type SupportTicket } from '@/lib/types';

const SUPPORT_CATEGORIES: { value: SupportTicketCategory; label: string }[] = [
    { value: 'account', label: 'Compte et connexion' },
    { value: 'billing', label: 'Facturation et abonnement' },
    { value: 'business', label: 'Gestion de l\'établissement' },
    { value: 'reviews', label: 'Avis et commentaires' },
    { value: 'technical', label: 'Problème technique' },
    { value: 'other', label: 'Autre question' },
];

export default function SupportPage() {
    const { toast } = useToast();
    const { allBusinesses, currentBusiness } = useBusiness();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

    const [newTicket, setNewTicket] = useState({
        subject: '',
        message: '',
        category: 'other' as SupportTicketCategory,
        businessId: ''
    });

    useEffect(() => {
        if (currentBusiness) {
            setNewTicket(prev => ({ ...prev, businessId: currentBusiness.id }));
        }
    }, [currentBusiness]);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const data = await getUserSupportTickets();
            setTickets(data);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de charger vos tickets',
                variant: 'destructive'
            });
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newTicket.subject || !newTicket.message) {
            toast({
                title: 'Champs requis',
                description: 'Veuillez remplir tous les champs',
                variant: 'destructive'
            });
            return;
        }

        setSubmitting(true);
        try {
            const result = await createSupportTicket(
                newTicket.subject,
                newTicket.message,
                newTicket.category,
                newTicket.businessId || undefined
            );

            if (result.status === 'success') {
                toast({
                    title: 'Ticket créé',
                    description: result.message
                });

                setNewTicket({
                    subject: '',
                    message: '',
                    category: 'other',
                    businessId: currentBusiness?.id || ''
                });
                fetchTickets();
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
                description: 'Impossible d\'envoyer votre demande',
                variant: 'destructive'
            });
        }
        setSubmitting(false);
    };

    const handleMarkAsRead = async (ticket: SupportTicket) => {
        setSelectedTicket(ticket);
        if (!ticket.is_read_by_user) {
            await markSupportTicketAsRead(ticket.id, 'user');
            // Optimistic update
            setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, is_read_by_user: true } : t));
        }
    };

    const getStatusBadge = (status: SupportTicket['status']) => {
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

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    Centre d'Assistance
                    {tickets.filter(t => !t.is_read_by_user).length > 0 && (
                        <Badge variant="default" className="bg-primary hover:bg-primary">
                            {tickets.filter(t => !t.is_read_by_user).length} nouveau(x)
                        </Badge>
                    )}
                </h1>
                <p className="text-muted-foreground mt-2">
                    Besoin d'aide ? Créez un ticket de support et notre équipe vous répondra rapidement.
                </p>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <Mail className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-blue-900">Email</p>
                                <p className="text-sm text-blue-700">support@reviewly.ma</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50/50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <Phone className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-green-900">Téléphone</p>
                                <p className="text-sm text-green-700">+212 5XX-XXXXXX</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {selectedTicket ? (
                    <div className="lg:col-span-3 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Button
                            variant="ghost"
                            onClick={() => setSelectedTicket(null)}
                            className="rounded-xl group"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            Retour à la liste
                        </Button>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <Card className="lg:col-span-1 shadow-sm rounded-[2rem]">
                                <CardHeader>
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                                            {SUPPORT_CATEGORIES.find(c => c.value === selectedTicket.category)?.label}
                                        </Badge>
                                        {getStatusBadge(selectedTicket.status)}
                                    </div>
                                    <CardTitle className="text-xl font-headline">{selectedTicket.subject}</CardTitle>
                                    <CardDescription>
                                        Créé le {new Date(selectedTicket.created_at).toLocaleString('fr-FR')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-4 bg-muted/50 rounded-2xl border text-sm leading-relaxed">
                                        <p className="font-bold mb-2 text-xs uppercase tracking-widest text-muted-foreground">Description initiale :</p>
                                        "{selectedTicket.message}"
                                    </div>

                                    {selectedTicket.business_name && (
                                        <div className="flex items-center gap-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-sm">
                                            <Building className="h-4 w-4 text-indigo-600" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase text-indigo-600">Établissement lié</p>
                                                <p className="font-medium text-indigo-900">{selectedTicket.business_name}</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="lg:col-span-2 space-y-4">
                                <h3 className="font-bold text-lg flex items-center gap-2 px-2">
                                    <MessageCircle className="h-5 w-5 text-primary" />
                                    Conversation avec le support
                                </h3>
                                <TicketConversation ticketId={selectedTicket.id} currentUserRole="user" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* New Ticket Form */}
                        <div className="lg:col-span-2">
                            <Card className="shadow-sm border-0 bg-white/50 backdrop-blur rounded-[2.5rem]">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                                        <HelpCircle className="h-6 w-6 text-primary" />
                                        Nouveau ticket
                                    </CardTitle>
                                    <CardDescription>
                                        Nous sommes là pour vous aider.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="category" className="text-xs font-bold uppercase tracking-widest ml-1">Catégorie</Label>
                                                <Select
                                                    value={newTicket.category}
                                                    onValueChange={(value) => setNewTicket({ ...newTicket, category: value as SupportTicketCategory })}
                                                >
                                                    <SelectTrigger id="category" className="rounded-xl h-11">
                                                        <SelectValue placeholder="Sélectionnez" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {SUPPORT_CATEGORIES.map((cat) => (
                                                            <SelectItem key={cat.value} value={cat.value}>
                                                                {cat.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="business" className="text-xs font-bold uppercase tracking-widest ml-1">Établissement lié (Optionnel)</Label>
                                                <Select
                                                    value={newTicket.businessId}
                                                    onValueChange={(value) => setNewTicket({ ...newTicket, businessId: value })}
                                                >
                                                    <SelectTrigger id="business" className="rounded-xl h-11">
                                                        <SelectValue placeholder="Choisir un établissement" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">Aucun (Compte général)</SelectItem>
                                                        {allBusinesses.map((biz) => (
                                                            <SelectItem key={biz.id} value={biz.id}>
                                                                {biz.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-widest ml-1">Sujet</Label>
                                            <Input
                                                id="subject"
                                                value={newTicket.subject}
                                                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                                placeholder="De quoi s'agit-il ?"
                                                className="rounded-xl h-11"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="message" className="text-xs font-bold uppercase tracking-widest ml-1">Message</Label>
                                            <Textarea
                                                id="message"
                                                value={newTicket.message}
                                                onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                                                placeholder="Détaillez votre demande..."
                                                rows={5}
                                                className="rounded-2xl resize-none"
                                                required
                                            />
                                        </div>

                                        <Button type="submit" disabled={submitting} className="w-full rounded-xl h-12 shadow-lg shadow-primary/20 bg-primary font-bold">
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Envoi...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="mr-2 h-4 w-4" />
                                                    Ouvrir le ticket
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Existing Tickets */}
                        <div className="lg:col-span-1">
                            <Card className="rounded-[2rem] border-0 shadow-sm overflow-hidden h-fit">
                                <CardHeader className="bg-muted/30 border-b">
                                    <CardTitle className="text-lg">Mes tickets</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {loading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                                        </div>
                                    ) : tickets.length === 0 ? (
                                        <div className="text-center py-12 px-6">
                                            <AlertCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                            <p className="text-sm font-medium text-muted-foreground/60">
                                                Aucun ticket
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-border/40">
                                            {tickets.map((ticket) => (
                                                <div
                                                    key={ticket.id}
                                                    onClick={() => handleMarkAsRead(ticket)}
                                                    className={cn(
                                                        "group p-5 transition-all cursor-pointer hover:bg-muted/10 relative",
                                                        !ticket.is_read_by_user && "bg-primary/[0.02]"
                                                    )}
                                                >
                                                    {!ticket.is_read_by_user && (
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                                    )}
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex flex-col gap-1 w-full mr-2">
                                                            <div className="flex items-center gap-2">
                                                                <p className={cn(
                                                                    "text-sm line-clamp-1 transition-colors group-hover:text-primary",
                                                                    !ticket.is_read_by_user ? 'font-bold' : 'font-medium'
                                                                )}>
                                                                    {ticket.subject}
                                                                </p>
                                                                {!ticket.is_read_by_user && (
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                                                )}
                                                            </div>
                                                            {ticket.business_name && (
                                                                <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold uppercase tracking-widest">
                                                                    <Building className="h-2.5 w-2.5" />
                                                                    {ticket.business_name}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:translate-x-1 group-hover:text-primary transition-all" />
                                                    </div>
                                                    <div className="flex items-center justify-between mt-3">
                                                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 rounded font-normal uppercase tracking-widest">
                                                            {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                                                        </Badge>
                                                        {getStatusBadge(ticket.status)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>

            {/* FAQ Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Questions fréquentes</CardTitle>
                    <CardDescription>
                        Consultez nos réponses aux questions les plus courantes
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer p-4 rounded-lg hover:bg-muted transition-colors">
                            <span className="font-medium">Comment modifier les horaires de mon établissement ?</span>
                            <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="p-4 text-sm text-muted-foreground">
                            Allez dans "Établissement" depuis votre tableau de bord, puis dans l'onglet "Services". Vous y trouverez la section "Horaires d'ouverture" où vous pouvez configurer vos heures pour chaque jour de la semaine.
                        </div>
                    </details>

                    <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer p-4 rounded-lg hover:bg-muted transition-colors">
                            <span className="font-medium">Comment répondre aux avis sur mon établissement ?</span>
                            <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="p-4 text-sm text-muted-foreground">
                            Rendez-vous dans "Mes Avis" depuis votre dashboard. Cliquez sur un avis pour voir le détail et utiliser le bouton "Répondre" pour publier votre réponse publique.
                        </div>
                    </details>

                    <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer p-4 rounded-lg hover:bg-muted transition-colors">
                            <span className="font-medium">Quelle est la différence entre Growth et PRO ?</span>
                            <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="p-4 text-sm text-muted-foreground">
                            Le plan Growth permet de gérer un seul établissement avec accès aux fonctionnalités essentielles (horaires, avantages, nouveautés). Le plan PRO permet de gérer jusqu'à 5 établissements avec des fonctionnalités avancées (analytics détaillés, contact WhatsApp, lien de réservation).
                        </div>
                    </details>
                </CardContent>
            </Card>
        </div>
    );
}
