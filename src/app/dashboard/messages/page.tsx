'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import { Lock, Loader2, Sparkles, MessageSquare, User, Send, Clock } from "lucide-react";
import { getMessages, sendMessage, type Message } from "@/app/actions/messages";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isPaidTier } from '@/lib/tier-utils';
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Link from 'next/link';

export default function MessagesPage() {
  const { profile, businessId, loading, currentBusiness } = useBusinessProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function checkStatus() {
      // Use the tier field instead of legacy is_premium
      const currentTier = profile?.tier;
      if (isPaidTier(currentTier)) {
        setIsPremium(true);
        return;
      }

      if (businessId) {
        const supabase = createClient();
        const { data: business } = await supabase
          .from('businesses')
          .select('tier')
          .eq('id', businessId)
          .single();

        if (isPaidTier(business?.tier)) {
          setIsPremium(true);
        }
      }
    }
    if (!loading) {
      checkStatus();
    }
  }, [profile, businessId, loading]);

  useEffect(() => {
    if (businessId && isPremium) {
      fetchMessages();
    }
  }, [businessId, isPremium]);

  async function fetchMessages() {
    if (!businessId) return;
    setFetching(true);
    const result = await getMessages(businessId);
    if (result.status === 'success') {
      const msgs = result.data || [];
      setMessages(msgs);
      // Mark as read if business owner is viewing
      const unreadIds = msgs.filter((m: Message) => !m.read_at && !m.is_from_business).map((m: Message) => m.id);
      if (unreadIds.length > 0) {
        const supabase = createClient();
        supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
      }
    }
    setFetching(false);
  }

  const handleSendReply = async (originalMessage: Message) => {
    if (!replyText.trim() || !businessId) return;
    setSending(true);
    const result = await sendMessage({
      business_id: businessId,
      content: replyText,
      is_from_business: true,
      sender_name: profile?.full_name || 'Établissement',
    });

    if (result.status === 'success') {
      toast({ title: "Réponse envoyée" });
      setReplyText('');
      fetchMessages();
    } else {
      toast({ title: "Erreur", description: result.message, variant: "destructive" });
    }
    setSending(false);
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
            Messages pour {currentBusiness?.name || 'votre entreprise'}
            {!isPremium && <Lock className="h-5 w-5 text-muted-foreground" />}
          </h1>
          <p className="text-muted-foreground">
            {isPremium
              ? `Gérez vos conversations en temps réel.`
              : "La messagerie Premium vous permet de communiquer directement avec les candidats."}
          </p>
        </div>
        {isPremium && (
          <Badge className="bg-amber-500 text-white border-none rounded-full px-3 py-1 flex gap-1 items-center">
            <Sparkles className="w-3 h-3 fill-current" /> PREMIUM
          </Badge>
        )}
      </div>

      {!isPremium ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-3xl bg-card/30 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6">
            <div className="bg-amber-500/10 p-4 rounded-full mb-4">
              <Sparkles className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Messagerie Premium</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              La messagerie directe est une fonctionnalité exclusive aux membres Premium. Communiquez directement avec les candidats et employés potentiels pour renforcer votre attractivité.
            </p>
            <Button asChild className="bg-amber-500 hover:bg-amber-600 rounded-full px-8 h-12 text-lg font-semibold shadow-lg shadow-amber-500/20 transition-all hover:scale-105">
              <Link href="/dashboard/premium">Passer à Premium</Link>
            </Button>
          </div>

          {/* Blur background content */}
          <div className="w-full max-w-2xl space-y-4 opacity-20 blur-sm pointer-events-none">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] p-4 rounded-2xl ${i % 2 === 0 ? 'bg-primary' : 'bg-muted'}`} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-card/30 backdrop-blur-sm rounded-3xl border border-border/50 overflow-hidden shadow-xl">
          {/* Chat Messages Area */}
          <ScrollArea className="flex-1 p-6">
            {fetching ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="font-bold uppercase tracking-widest text-[10px]">Chargement des conversations...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                <div className="bg-primary/10 p-6 rounded-full">
                  <MessageSquare className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Aucun message</h3>
                <p className="text-sm max-w-xs mx-auto">Encouragez les candidats à vous contacter via votre page publique.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {[...messages].reverse().map((msg, index) => {
                  const isLastInGroup = index === messages.length - 1;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.is_from_business ? 'items-end' : 'items-start'} group animate-in slide-in-from-bottom-2 duration-300`}
                    >
                      <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
                        {!msg.is_from_business && (
                          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mb-1 border border-border/50">
                            <User className="h-4 w-4 text-secondary-foreground" />
                          </div>
                        )}
                        <div className="space-y-1">
                          {!msg.is_from_business && (
                            <div className="flex items-center gap-2 ml-2">
                              {!msg.read_at && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                                {msg.sender_name || 'Candidat'}
                              </span>
                            </div>
                          )}
                          <div
                            className={cn(
                              "p-4 rounded-2xl shadow-sm relative",
                              msg.is_from_business
                                ? "bg-primary text-primary-foreground rounded-br-none"
                                : "bg-white dark:bg-slate-900 border border-border/50 text-foreground rounded-bl-none"
                            )}
                          >
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                            <div
                              className={cn(
                                "text-[9px] mt-2 opacity-60 font-medium whitespace-nowrap",
                                msg.is_from_business ? "text-right" : "text-left"
                              )}
                            >
                              {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
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

          {/* Quick Reply Area (Simplified for basic interface) */}
          <div className="p-4 bg-background/50 border-t border-border/50 backdrop-blur-md">
            <div className="max-w-4xl mx-auto flex gap-3">
              <Input
                placeholder="Répondre au dernier message..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (messages.length > 0) handleSendReply(messages[0]);
                  }
                }}
                className="bg-background/80 border-none h-12 rounded-2xl px-6 focus-visible:ring-1 focus-visible:ring-primary/20 shadow-inner"
              />
              <Button
                onClick={() => messages.length > 0 && handleSendReply(messages[0])}
                disabled={sending || !replyText.trim() || messages.length === 0}
                className="h-12 w-12 rounded-2xl shrink-0 shadow-lg shadow-primary/20"
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
            {messages.length > 0 && !messages[0].is_from_business && (
              <p className="text-[10px] text-center mt-2 text-muted-foreground font-medium">
                En répondant, vous envoyez un message à <span className="text-primary">{messages[0].sender_name || 'ce candidat'}</span>.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
