'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Phone,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBusiness } from '@/contexts/BusinessContext';
import { TicketConversation } from '@/components/support/TicketConversation';
import { cn } from '@/lib/utils';
import {
  createSupportTicket,
  getUserSupportTickets,
  markSupportTicketAsRead,
  markAllUserSupportTicketsAsRead,
  type SupportTicketCategory,
} from '@/app/actions/support';
import { type SupportTicket } from '@/lib/types';
import { useI18n } from '@/components/providers/i18n-provider';

export default function SupportPage() {
  const { toast } = useToast();
  const { allBusinesses, currentBusiness } = useBusiness();
  const { t, locale } = useI18n();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    category: 'other' as SupportTicketCategory,
    businessId: '',
  });

  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US';

  const supportCategories: { value: SupportTicketCategory; label: string }[] = useMemo(
    () => [
      { value: 'account', label: t('dashboardSupportPage.categories.account', 'Account and login') },
      { value: 'billing', label: t('dashboardSupportPage.categories.billing', 'Billing and subscription') },
      { value: 'business', label: t('dashboardSupportPage.categories.business', 'Business management') },
      { value: 'reviews', label: t('dashboardSupportPage.categories.reviews', 'Reviews and comments') },
      { value: 'technical', label: t('dashboardSupportPage.categories.technical', 'Technical issue') },
      { value: 'other', label: t('dashboardSupportPage.categories.other', 'Other question') },
    ],
    [t]
  );

  useEffect(() => {
    if (currentBusiness) {
      setNewTicket((prev) => ({ ...prev, businessId: currentBusiness.id }));
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

      const unreadCount = (data || []).filter((x) => !x.is_read_by_user).length;
      if (unreadCount > 0) {
        const markAllResult = await markAllUserSupportTicketsAsRead();
        if (markAllResult.status === 'success') {
          setTickets((prev) => prev.map((x) => ({ ...x, is_read_by_user: true })));
        }
      }
    } catch {
      toast({
        title: t('dashboardSupportPage.errorTitle', 'Error'),
        description: t('dashboardSupportPage.loadError', 'Unable to load your tickets.'),
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTicket.subject || !newTicket.message) {
      toast({
        title: t('dashboardSupportPage.requiredTitle', 'Required fields'),
        description: t('dashboardSupportPage.requiredDesc', 'Please complete all required fields.'),
        variant: 'destructive',
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
          title: t('dashboardSupportPage.ticketCreated', 'Ticket created'),
          description: result.message || t('dashboardSupportPage.ticketCreatedDesc', 'Your support request has been submitted.'),
        });

        setNewTicket({
          subject: '',
          message: '',
          category: 'other',
          businessId: currentBusiness?.id || '',
        });
        fetchTickets();
      } else {
        toast({
          title: t('dashboardSupportPage.errorTitle', 'Error'),
          description: result.message || t('dashboardSupportPage.submitError', 'Unable to submit your request.'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: t('dashboardSupportPage.errorTitle', 'Error'),
        description: t('dashboardSupportPage.submitError', 'Unable to submit your request.'),
        variant: 'destructive',
      });
    }
    setSubmitting(false);
  };

  const handleMarkAsRead = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    if (!ticket.is_read_by_user) {
      await markSupportTicketAsRead(ticket.id, 'user');
      setTickets((prev) => prev.map((x) => (x.id === ticket.id ? { ...x, is_read_by_user: true } : x)));
    }
  };

  const getStatusBadge = (status: SupportTicket['status']) => {
    const variants = {
      pending: {
        color: 'border-warning/20 bg-warning/10 text-warning',
        icon: Clock,
        label: t('dashboardSupportPage.status.pending', 'Pending'),
      },
      in_progress: {
        color: 'border-info/20 bg-info/10 text-info',
        icon: MessageCircle,
        label: t('dashboardSupportPage.status.inProgress', 'In progress'),
      },
      resolved: {
        color: 'border-success/20 bg-success/10 text-success',
        icon: CheckCircle2,
        label: t('dashboardSupportPage.status.resolved', 'Resolved'),
      },
      closed: {
        color: 'border-border bg-secondary text-muted-foreground',
        icon: XCircle,
        label: t('dashboardSupportPage.status.closed', 'Closed'),
      },
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

  const unreadCount = tickets.filter((x) => !x.is_read_by_user).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          {t('dashboardSupportPage.pageTitle', 'Support center')}
          {unreadCount > 0 && (
            <Badge variant="default" className="bg-primary hover:bg-primary">
              {t('dashboardSupportPage.newCount', '{count} new').replace('{count}', String(unreadCount))}
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('dashboardSupportPage.pageSubtitle', 'Need help? Open a support ticket and our team will reply quickly.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-info/10 text-info">
                <Mail className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t('dashboardSupportPage.channelEmail', 'Email')}</p>
                <p className="text-sm text-muted-foreground">support@reviewly.ma</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-success/10 text-success">
                <Phone className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t('dashboardSupportPage.channelPhone', 'Phone')}</p>
                <p className="text-sm text-muted-foreground">+212 5XX-XXXXXX</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {selectedTicket ? (
          <div className="lg:col-span-3 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <Button variant="ghost" onClick={() => setSelectedTicket(null)} className="rounded-xl group">
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              {t('dashboardSupportPage.backToList', 'Back to list')}
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-1 shadow-sm rounded-[2rem]">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                      {supportCategories.find((c) => c.value === selectedTicket.category)?.label}
                    </Badge>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                  <CardTitle className="text-xl font-headline">{selectedTicket.subject}</CardTitle>
                  <CardDescription>
                    {t('dashboardSupportPage.createdOn', 'Created on')} {new Date(selectedTicket.created_at).toLocaleString(dateLocale)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-2xl border text-sm leading-relaxed">
                    <p className="font-bold mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                      {t('dashboardSupportPage.initialDescription', 'Initial description')}:
                    </p>
                    "{selectedTicket.message}"
                  </div>

                  {selectedTicket.business_name && (
                    <div className="flex items-center gap-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-sm">
                      <Building className="h-4 w-4 text-indigo-600" />
                      <div>
                        <p className="text-[10px] font-bold uppercase text-indigo-600">{t('dashboardSupportPage.linkedBusiness', 'Linked business')}</p>
                        <p className="font-medium text-indigo-900">{selectedTicket.business_name}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2 px-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  {t('dashboardSupportPage.conversationTitle', 'Conversation with support')}
                </h3>
                <TicketConversation ticketId={selectedTicket.id} currentUserRole="user" />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="lg:col-span-2">
              <Card className="rounded-xl border border-border bg-card shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <HelpCircle className="h-6 w-6 text-primary" />
                    {t('dashboardSupportPage.newTicket', 'New ticket')}
                  </CardTitle>
                  <CardDescription>{t('dashboardSupportPage.newTicketDesc', 'We are here to help.')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-xs font-bold uppercase tracking-widest ml-1">
                          {t('dashboardSupportPage.category', 'Category')}
                        </Label>
                        <Select value={newTicket.category} onValueChange={(value) => setNewTicket({ ...newTicket, category: value as SupportTicketCategory })}>
                          <SelectTrigger id="category" className="h-11 rounded-md">
                            <SelectValue placeholder={t('dashboardSupportPage.select', 'Select')} />
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

                      <div className="space-y-2">
                        <Label htmlFor="business" className="text-xs font-bold uppercase tracking-widest ml-1">
                          {t('dashboardSupportPage.linkedBusinessOptional', 'Linked business (optional)')}
                        </Label>
                        <Select value={newTicket.businessId || 'none'} onValueChange={(value) => setNewTicket({ ...newTicket, businessId: value === 'none' ? '' : value })}>
                          <SelectTrigger id="business" className="h-11 rounded-md">
                            <SelectValue placeholder={t('dashboardSupportPage.chooseBusiness', 'Choose a business')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t('dashboardSupportPage.noneGeneral', 'None (General account)')}</SelectItem>
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
                      <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-widest ml-1">
                        {t('dashboardSupportPage.subject', 'Subject')}
                      </Label>
                      <Input
                        id="subject"
                        value={newTicket.subject}
                        onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                        placeholder={t('dashboardSupportPage.subjectPlaceholder', 'What is this about?')}
                        className="h-11 rounded-md"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-xs font-bold uppercase tracking-widest ml-1">
                        {t('dashboardSupportPage.message', 'Message')}
                      </Label>
                      <Textarea
                        id="message"
                        value={newTicket.message}
                        onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                        placeholder={t('dashboardSupportPage.messagePlaceholder', 'Describe your request...')}
                        rows={5}
                        className="resize-none rounded-md"
                        required
                      />
                    </div>

                    <Button type="submit" disabled={submitting} className="h-12 w-full rounded-md font-bold">
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('dashboardSupportPage.sending', 'Sending...')}
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          {t('dashboardSupportPage.openTicket', 'Open ticket')}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="h-fit overflow-hidden rounded-xl border border-border shadow-none">
                <CardHeader className="border-b border-border bg-secondary/40">
                  <CardTitle className="text-lg">{t('dashboardSupportPage.myTickets', 'My tickets')}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="text-center py-12 px-6">
                      <AlertCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm font-medium text-muted-foreground/60">{t('dashboardSupportPage.noTicket', 'No ticket')}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {tickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          onClick={() => handleMarkAsRead(ticket)}
                          className={cn('group p-5 transition-all cursor-pointer hover:bg-muted/10 relative', !ticket.is_read_by_user && 'bg-primary/[0.02]')}
                        >
                          {!ticket.is_read_by_user && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex flex-col gap-1 w-full mr-2">
                              <div className="flex items-center gap-2">
                                <p className={cn('text-sm line-clamp-1 transition-colors group-hover:text-primary', !ticket.is_read_by_user ? 'font-bold' : 'font-medium')}>
                                  {ticket.subject}
                                </p>
                                {!ticket.is_read_by_user && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
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
                              {new Date(ticket.created_at).toLocaleDateString(dateLocale)}
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

      <Card>
        <CardHeader>
          <CardTitle>{t('dashboardSupportPage.faqTitle', 'Frequently asked questions')}</CardTitle>
          <CardDescription>{t('dashboardSupportPage.faqDesc', 'Read answers to common questions')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-4 rounded-lg hover:bg-muted transition-colors">
              <span className="font-medium">{t('dashboardSupportPage.faq.q1', 'How can I update my business hours?')}</span>
              <span className="text-muted-foreground group-open:rotate-180 transition-transform">?</span>
            </summary>
            <div className="p-4 text-sm text-muted-foreground">{t('dashboardSupportPage.faq.a1', 'Go to Business in your dashboard, then Services tab. You can edit opening hours for each day there.')}</div>
          </details>

          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-4 rounded-lg hover:bg-muted transition-colors">
              <span className="font-medium">{t('dashboardSupportPage.faq.q2', 'How can I reply to reviews?')}</span>
              <span className="text-muted-foreground group-open:rotate-180 transition-transform">?</span>
            </summary>
            <div className="p-4 text-sm text-muted-foreground">{t('dashboardSupportPage.faq.a2', 'Go to My Reviews in your dashboard, open a review, then click Reply to publish your public response.')}</div>
          </details>

          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-4 rounded-lg hover:bg-muted transition-colors">
              <span className="font-medium">{t('dashboardSupportPage.faq.q3', 'What is the difference between Growth and Gold?')}</span>
              <span className="text-muted-foreground group-open:rotate-180 transition-transform">?</span>
            </summary>
            <div className="p-4 text-sm text-muted-foreground">{t('dashboardSupportPage.faq.a3', 'Growth supports one business with core features. Gold supports up to 5 businesses with advanced analytics, salary benchmarks, and communication features.')}</div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
