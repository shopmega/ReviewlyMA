'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Mail, Phone, LifeBuoy, Send, FileText, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { SupportTicket } from '@/lib/types';
import { createSupportTicket, getUserSupportTickets } from '@/app/actions/support';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { getSiteSettings } from '@/lib/data';

import { ClientOnly } from '@/components/ClientOnly';
import { useI18n } from '@/components/providers/i18n-provider';

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
  const [supportEmail, setSupportEmail] = useState('support@example.com');

  const { toast } = useToast();
  const { t, locale } = useI18n();

  const supportCategories = useMemo(
    () => [
      { value: 'account', label: t('supportPage.categories.account', 'Account and login') },
      { value: 'billing', label: t('supportPage.categories.billing', 'Billing and subscription') },
      { value: 'business', label: t('supportPage.categories.business', 'Business management') },
      { value: 'reviews', label: t('supportPage.categories.reviews', 'Reviews and comments') },
      { value: 'technical', label: t('supportPage.categories.technical', 'Technical issue') },
      { value: 'other', label: t('supportPage.categories.other', 'Other question') },
    ],
    [t]
  );

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    }
    getUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getSiteSettings();
        setSupportEmail(settings.contact_email || settings.email_from || 'support@example.com');
      } catch {
        setSupportEmail('support@example.com');
      }
    }

    loadSettings();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const result = await getUserSupportTickets();
      setTickets(result || []);
    } catch {
      toast({
        title: t('supportPage.errorTitle', 'Error'),
        description: t('supportPage.loadTicketsError', 'Unable to load your support tickets.'),
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      toast({
        title: t('supportPage.errorTitle', 'Error'),
        description: t('supportPage.requiredFields', 'Please fill in all required fields.'),
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: t('supportPage.loginRequiredTitle', 'Login required'),
        description: t('supportPage.loginRequiredDesc', 'You must be logged in to send a support ticket.'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const result = await createSupportTicket(newTicket.subject, newTicket.message, newTicket.category);

    if (result.status === 'success') {
      toast({
        title: t('supportPage.successTitle', 'Success'),
        description: result.message || t('supportPage.ticketCreated', 'Support ticket created successfully.'),
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
        title: t('supportPage.errorTitle', 'Error'),
        description: result.message || t('supportPage.createTicketError', 'Unable to create support ticket.'),
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
        return 'destructive';
      case 'closed':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: SupportTicket['status']) => {
    switch (status) {
      case 'pending':
        return t('supportPage.status.pending', 'Pending');
      case 'in_progress':
        return t('supportPage.status.inProgress', 'In progress');
      case 'resolved':
        return t('supportPage.status.resolved', 'Resolved');
      case 'closed':
        return t('supportPage.status.closed', 'Closed');
      default:
        return status;
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
    return new Date(dateString).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t('supportPage.title', 'Customer support')}</h1>
        <p className="text-muted-foreground mt-2">{t('supportPage.subtitle', 'Contact our support team for any question or issue.')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <Mail className="h-8 w-8 mx-auto text-blue-500" />
            <CardTitle className="text-lg mt-2">{t('supportPage.channels.email', 'Email')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">{supportEmail}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <Phone className="h-8 w-8 mx-auto text-green-500" />
            <CardTitle className="text-lg mt-2">{t('supportPage.channels.phone', 'Phone')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">+212 522-123-456</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <LifeBuoy className="h-8 w-8 mx-auto text-orange-500" />
            <CardTitle className="text-lg mt-2">{t('supportPage.channels.chat', 'Chat')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">{t('supportPage.channels.live', 'Live')}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <FileText className="h-8 w-8 mx-auto text-sky-500" />
            <CardTitle className="text-lg mt-2">{t('supportPage.channels.faq', 'FAQ')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">{t('supportPage.channels.faqDesc', 'Frequently asked questions')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'new-ticket' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('new-ticket')}
        >
          <MessageSquare className="h-4 w-4 inline-block mr-2" />
          {t('supportPage.newTicketTab', 'New ticket')}
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'my-tickets' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('my-tickets')}
        >
          {t('supportPage.myTicketsTab', 'My tickets')}
        </button>
      </div>

      {activeTab === 'new-ticket' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('supportPage.newTicketTitle', 'New support ticket')}</CardTitle>
            <CardDescription>{t('supportPage.newTicketDesc', 'Fill in the form below to submit a new support ticket.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="subject">{t('supportPage.subject', 'Subject')} *</Label>
                <Input
                  id="subject"
                  placeholder={t('supportPage.subjectPlaceholder', 'Briefly describe your issue')}
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="category">{t('supportPage.category', 'Category')}</Label>
                <Select value={newTicket.category} onValueChange={(value) => setNewTicket({ ...newTicket, category: value as SupportTicket['category'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {supportCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="message">{t('supportPage.message', 'Message')} *</Label>
                <Textarea
                  id="message"
                  placeholder={t('supportPage.messagePlaceholder', 'Describe your issue in detail...')}
                  rows={6}
                  value={newTicket.message}
                  onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                />
              </div>

              <Button onClick={handleCreateTicket} className="w-full" disabled={loading}>
                {loading ? (
                  t('supportPage.sending', 'Sending...')
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {t('supportPage.sendTicket', 'Send ticket')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'my-tickets' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t('supportPage.myTicketsTitle', 'Your support tickets')}</h2>

          {loading && tickets.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : tickets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('supportPage.emptyTitle', 'No support tickets')}</h3>
                <p className="text-muted-foreground mb-4">{t('supportPage.emptyDesc', 'You have no active support tickets.')}</p>
                <Button onClick={() => setActiveTab('new-ticket')}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t('supportPage.createNew', 'Create a new ticket')}
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
                      <span className="text-sm text-muted-foreground">{formatDate(ticket.created_at)}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{ticket.message}</p>
                    {ticket.admin_response && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                        <p className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-1">{t('supportPage.supportReply', 'Support reply:')}</p>
                        <p className="text-sm">{ticket.admin_response}</p>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {t('supportPage.categoryLabel', 'Category')}: {supportCategories.find((c) => c.value === ticket.category)?.label || ticket.category}
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
