'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MessageSquare,
  Mail,
  Phone,
  LifeBuoy,
  Send,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { ActionState, SupportTicket } from '@/lib/types';
import { createSupportTicket, getUserSupportTickets } from '@/app/actions/support';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

import { ClientOnly } from '@/components/ClientOnly';

const SUPPORT_CATEGORIES = [
  { value: 'account', label: 'Compte et connexion' },
  { value: 'billing', label: 'Facturation et abonnement' },
  { value: 'business', label: 'Gestion de l\'établissement' },
  { value: 'reviews', label: 'Avis et commentaires' },
  { value: 'technical', label: 'Problème technique' },
  { value: 'other', label: 'Autre question' },
] as const;

export function SupportContent() {
  return (
    <ClientOnly>
      <SupportContentInner />
    </ClientOnly>
  );
}

function SupportContentInner() {
  const [activeTab, setActiveTab] = useState('new-ticket');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    category: 'other' as SupportTicket['category'],
  });

  const { toast } = useToast();

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    getUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const result = await getUserSupportTickets();
      setTickets(result || []);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger vos tickets de support',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Vous devez être connecté pour envoyer un ticket de support',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const result = await createSupportTicket(
      newTicket.subject,
      newTicket.message,
      newTicket.category
    );

    if (result.status === 'success') {
      toast({
        title: 'Succès',
        description: result.message,
      });
      setNewTicket({
        subject: '',
        message: '',
        category: 'other',
      });
      setActiveTab('my-tickets');
      loadTickets();
    } else {
      toast({
        title: 'Erreur',
        description: result.message || 'Impossible de créer le ticket de support',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const getStatusBadgeVariant = (status: SupportTicket['status']) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'resolved':
        return 'destructive'; // Using destructive for green/success if available, or just check colors
      case 'closed':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: SupportTicket['status']) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'in_progress': return 'En cours';
      case 'resolved': return 'Résolu';
      case 'closed': return 'Fermé';
      default: return status;
    }
  };

  const getStatusIcon = (status: SupportTicket['status']) => {
    switch (status) {
      case 'pending':
        return <AlertTriangle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'closed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Support Clientèle</h1>
        <p className="text-muted-foreground mt-2">
          Contactez notre équipe de support pour toute question ou problème
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <Mail className="h-8 w-8 mx-auto text-blue-500" />
            <CardTitle className="text-lg mt-2">Email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              support@avis.ma
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <Phone className="h-8 w-8 mx-auto text-green-500" />
            <CardTitle className="text-lg mt-2">Téléphone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              +212 522-123-456
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <LifeBuoy className="h-8 w-8 mx-auto text-orange-500" />
            <CardTitle className="text-lg mt-2">Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              En direct
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <FileText className="h-8 w-8 mx-auto text-purple-500" />
            <CardTitle className="text-lg mt-2">FAQ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Questions fréquentes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'new-ticket'
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground'
            }`}
          onClick={() => setActiveTab('new-ticket')}
        >
          <MessageSquare className="h-4 w-4 inline-block mr-2" />
          Nouveau Ticket
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'my-tickets'
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground'
            }`}
          onClick={() => setActiveTab('my-tickets')}
        >
          Mes Tickets
        </button>
      </div>

      {activeTab === 'new-ticket' && (
        <Card>
          <CardHeader>
            <CardTitle>Nouveau Ticket de Support</CardTitle>
            <CardDescription>
              Remplissez le formulaire ci-dessous pour soumettre un nouveau ticket de support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="subject">Sujet *</Label>
                <Input
                  id="subject"
                  placeholder="Décrivez brièvement votre problème"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="category">Catégorie</Label>
                <Select value={newTicket.category} onValueChange={(value) => setNewTicket({ ...newTicket, category: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
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

              <div>
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Décrivez votre problème en détail..."
                  rows={6}
                  value={newTicket.message}
                  onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                />
              </div>

              <Button onClick={handleCreateTicket} className="w-full" disabled={loading}>
                {loading ? 'Envoi en cours...' : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Envoyer le Ticket
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'my-tickets' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Vos Tickets de Support</h2>

          {loading && tickets.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : tickets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun ticket de support</h3>
                <p className="text-muted-foreground mb-4">
                  Vous n'avez aucun ticket de support actif
                </p>
                <Button onClick={() => setActiveTab('new-ticket')}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Créer un nouveau ticket
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <Card key={ticket.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getStatusBadgeVariant(ticket.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(ticket.status)}
                              {getStatusLabel(ticket.status)}
                            </span>
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {ticket.priority}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(ticket.created_at)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{ticket.message}</p>
                    {ticket.admin_response && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                        <p className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-1">Réponse du support :</p>
                        <p className="text-sm">{ticket.admin_response}</p>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Catégorie: {SUPPORT_CATEGORIES.find(c => c.value === ticket.category)?.label || ticket.category}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}