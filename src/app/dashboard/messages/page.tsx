'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { Lock, Loader2, Sparkles, MessageSquare, User, Send } from 'lucide-react';
import { getMessages, sendMessage, type Message } from '@/app/actions/messages';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useI18n } from '@/components/providers/i18n-provider';

export default function MessagesPage() {
  const { profile, businessId, loading, currentBusiness, hasPaidAccess, effectiveTier } = useBusinessProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [fetching, setFetching] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const { t, tf, locale } = useI18n();

  useEffect(() => {
    if (businessId && hasPaidAccess) {
      fetchMessages();
    }
  }, [businessId, hasPaidAccess]);

  async function fetchMessages() {
    if (!businessId) return;

    setFetching(true);
    const result = await getMessages(businessId);
    if (result.status === 'success') {
      const msgs = result.data || [];
      setMessages(msgs);

      const latestInbound = msgs.find((m: Message) => !m.is_from_business) || null;
      setActiveTargetId((prev) => {
        if (prev && msgs.some((m: Message) => m.id === prev && !m.is_from_business)) return prev;
        return latestInbound?.id || null;
      });

      const unreadIds = msgs.filter((m: Message) => !m.read_at && !m.is_from_business).map((m: Message) => m.id);
      if (unreadIds.length > 0) {
        const supabase = createClient();
        const now = new Date().toISOString();
        supabase.from('messages').update({ read_at: now }).in('id', unreadIds);
        setMessages((prev) =>
          prev.map((message) => (unreadIds.includes(message.id) ? { ...message, read_at: now } : message))
        );
      }
    }
    setFetching(false);
  }

  const activeTarget = useMemo(() => {
    return messages.find((m) => m.id === activeTargetId && !m.is_from_business) || messages.find((m) => !m.is_from_business) || null;
  }, [messages, activeTargetId]);
  const inboundMessages = useMemo(() => messages.filter((message) => !message.is_from_business), [messages]);
  const unreadInboundMessages = useMemo(() => inboundMessages.filter((message) => !message.read_at), [inboundMessages]);
  const outboundMessages = useMemo(() => messages.filter((message) => message.is_from_business), [messages]);

  const handleSendReply = async (targetMessage: Message | null) => {
    if (!replyText.trim() || !businessId || !targetMessage) return;

    setSending(true);
    const result = await sendMessage({
      business_id: businessId,
      content: replyText,
      is_from_business: true,
      sender_name: profile?.full_name || t('dashboardMessagesPage.businessSender', 'Business'),
    });

    if (result.status === 'success') {
      toast({ title: t('dashboardMessagesPage.replySent', 'Reply sent') });
      setReplyText('');
      fetchMessages();
    } else {
      toast({
        title: t('dashboardMessagesPage.errorTitle', 'Error'),
        description: t('dashboardMessagesPage.replyError', 'Unable to send reply.'),
        variant: 'destructive',
      });
    }
    setSending(false);
  };

  const focusNextUnread = () => {
    if (unreadInboundMessages.length === 0) return;
    setActiveTargetId(unreadInboundMessages[0].id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            {tf('dashboardMessagesPage.title', 'Messages for {name}', {
              name: currentBusiness?.name || t('dashboardMessagesPage.yourBusiness', 'your business'),
            })}
            {!hasPaidAccess && <Lock className="h-5 w-5 text-muted-foreground" />}
          </h1>
          <p className="text-muted-foreground">
            {hasPaidAccess
              ? t('dashboardMessagesPage.subtitlePremium', 'Manage your conversations in real time.')
              : t('dashboardMessagesPage.subtitleLocked', 'Upgrade to Growth or Gold to communicate directly with candidates.')}
          </p>
        </div>
        {hasPaidAccess && (
          <Badge className="bg-amber-500 text-white border-none rounded-full px-3 py-1 flex gap-1 items-center">
            <Sparkles className="w-3 h-3 fill-current" /> {effectiveTier.toUpperCase()}
          </Badge>
        )}
      </div>

      {!hasPaidAccess ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-3xl bg-card/30 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6">
            <div className="bg-amber-500/10 p-4 rounded-full mb-4">
              <Sparkles className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-2xl font-bold mb-2">{t('dashboardMessagesPage.lockedTitle', 'Direct messaging')}</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              {t('dashboardMessagesPage.lockedDesc', 'Direct messaging is available on Growth and Gold plans to help you engage candidates and talent.')}
            </p>
            <Button asChild className="bg-amber-500 hover:bg-amber-600 rounded-full px-8 h-12 text-lg font-semibold shadow-lg shadow-amber-500/20 transition-all hover:scale-105">
              <Link href="/dashboard/premium">{t('dashboardMessagesPage.lockedCta', 'Upgrade your plan')}</Link>
            </Button>
          </div>

          <div className="w-full max-w-2xl space-y-4 opacity-20 blur-sm pointer-events-none">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] p-4 rounded-2xl ${i % 2 === 0 ? 'bg-primary' : 'bg-muted'}`} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-card/30 backdrop-blur-sm rounded-3xl border border-border/50 overflow-hidden shadow-xl">
          <div className="border-b border-border/50 bg-background/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{tf('dashboardMessagesPage.stats.total', 'Total: {count}', { count: messages.length })}</Badge>
              <Badge variant="outline">{tf('dashboardMessagesPage.stats.inbound', 'Inbound: {count}', { count: inboundMessages.length })}</Badge>
              <Badge variant={unreadInboundMessages.length > 0 ? 'default' : 'outline'}>
                {tf('dashboardMessagesPage.stats.unread', 'Unread: {count}', { count: unreadInboundMessages.length })}
              </Badge>
              <Badge variant="outline">{tf('dashboardMessagesPage.stats.sent', 'Sent replies: {count}', { count: outboundMessages.length })}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={focusNextUnread} disabled={unreadInboundMessages.length === 0}>
                {t('dashboardMessagesPage.nextUnread', 'Go to next unread')}
              </Button>
              {activeTarget && (
                <p className="text-xs text-muted-foreground">
                  {t('dashboardMessagesPage.currentTarget', 'Current target')}: <span className="font-semibold text-foreground">{activeTarget.sender_name || t('dashboardMessagesPage.candidate', 'Candidate')}</span>
                </p>
              )}
            </div>
          </div>
          <ScrollArea className="flex-1 p-6">
            {fetching ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="font-bold uppercase tracking-widest text-[10px]">{t('dashboardMessagesPage.loadingConversations', 'Loading conversations...')}</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                <div className="bg-primary/10 p-6 rounded-full">
                  <MessageSquare className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-bold">{t('dashboardMessagesPage.emptyTitle', 'No messages')}</h3>
                <p className="text-sm max-w-xs mx-auto">{t('dashboardMessagesPage.emptyDesc', 'Encourage candidates to contact you through your public page.')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {[...messages].reverse().map((msg) => {
                  const isActiveTarget = !msg.is_from_business && msg.id === activeTarget?.id;
                  return (
                    <div key={msg.id} className={`flex flex-col ${msg.is_from_business ? 'items-end' : 'items-start'} group animate-in slide-in-from-bottom-2 duration-300`}>
                      <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
                        {!msg.is_from_business && (
                          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mb-1 border border-border/50">
                            <User className="h-4 w-4 text-secondary-foreground" />
                          </div>
                        )}
                        <div className="space-y-1">
                          {!msg.is_from_business && (
                            <button
                              type="button"
                              onClick={() => setActiveTargetId(msg.id)}
                              className={cn('flex items-center gap-2 ml-2 rounded-md px-1 py-0.5 text-left transition-colors', isActiveTarget ? 'bg-primary/10' : 'hover:bg-muted/50')}
                            >
                              {!msg.read_at && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">{msg.sender_name || t('dashboardMessagesPage.candidate', 'Candidate')}</span>
                            </button>
                          )}
                          <div
                            className={cn(
                              'p-4 rounded-2xl shadow-sm relative border',
                              msg.is_from_business ? 'bg-primary text-primary-foreground rounded-br-none border-primary/20' : 'bg-white dark:bg-slate-900 text-foreground rounded-bl-none border-border/50',
                              isActiveTarget && 'ring-2 ring-primary/30'
                            )}
                          >
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                            <div className={cn('text-[9px] mt-2 opacity-60 font-medium whitespace-nowrap', msg.is_from_business ? 'text-right' : 'text-left')}>
                              {new Date(msg.created_at).toLocaleTimeString(locale === 'fr' ? 'fr-FR' : locale === 'ar' ? 'ar-MA' : 'en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                        {msg.is_from_business && (
                          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0 mb-1 border border-white/10 shadow-lg">
                            <Sparkles className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="p-4 bg-background/50 border-t border-border/50 backdrop-blur-md">
            <div className="max-w-4xl mx-auto flex gap-3">
              <Input
                placeholder={
                  activeTarget
                    ? tf('dashboardMessagesPage.replyPlaceholder', 'Reply to {name}...', {
                        name: activeTarget.sender_name || t('dashboardMessagesPage.candidateLower', 'this candidate'),
                      })
                    : t('dashboardMessagesPage.noTargetPlaceholder', 'No candidate to reply to')
                }
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={!activeTarget}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply(activeTarget);
                  }
                }}
                className="bg-background/80 border-none h-12 rounded-2xl px-6 focus-visible:ring-1 focus-visible:ring-primary/20 shadow-inner"
              />
              <Button onClick={() => handleSendReply(activeTarget)} disabled={sending || !replyText.trim() || !activeTarget} className="h-12 w-12 rounded-2xl shrink-0 shadow-lg shadow-primary/20">
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
            {activeTarget && (
              <p className="text-[10px] text-center mt-2 text-muted-foreground font-medium">
                {t('dashboardMessagesPage.targetedReply', 'Targeted reply to')} <span className="text-primary">{activeTarget.sender_name || t('dashboardMessagesPage.candidateLower', 'this candidate')}</span>.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
