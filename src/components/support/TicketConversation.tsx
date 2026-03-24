'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { sendSupportMessage, getSupportTicketMessages } from '@/app/actions/support';
import { type SupportMessage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/components/providers/i18n-provider';

interface TicketConversationProps {
  ticketId: string;
  currentUserRole: 'user' | 'admin';
}

export function TicketConversation({ ticketId, currentUserRole }: TicketConversationProps) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const { locale, t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);

  const fetchMessages = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    try {
      const data = await getSupportTicketMessages(ticketId);
      setMessages(data);
      setLoading(false);
    } catch {
      setLoading(false);
    } finally {
      isFetchingRef.current = false;
    }
  }, [ticketId]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (intervalId) {
        return;
      }

      intervalId = setInterval(() => {
        if (!document.hidden) {
          void fetchMessages();
        }
      }, 30000);
    };

    const stopPolling = () => {
      if (!intervalId) {
        return;
      }

      clearInterval(intervalId);
      intervalId = null;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
        return;
      }

      void fetchMessages();
      startPolling();
    };

    void fetchMessages();

    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      return;
    }

    setSending(true);
    const result = await sendSupportMessage(ticketId, newMessage);

    if (result.status === 'success') {
      setNewMessage('');
      void fetchMessages();
    } else {
      toast({
        title: t('common.error', 'Error'),
        description: result.message,
        variant: 'destructive',
      });
    }

    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] border rounded-2xl bg-muted/30 overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground italic text-sm">
            {t('ticketConversation.empty', 'Start of the conversation...')}
          </div>
        ) : (
          messages.map((message) => {
            const isMe = message.sender_role === currentUserRole;

            return (
              <div
                key={message.id}
                className={cn(
                  'flex flex-col max-w-[80%]',
                  isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                )}
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {message.sender_name}
                  </span>
                  {message.sender_role === 'admin' && (
                    <ShieldCheck className="h-3 w-3 text-blue-500" />
                  )}
                </div>
                <div
                  className={cn(
                    'p-3 rounded-2xl text-sm shadow-sm',
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-tr-none'
                      : 'bg-background border rounded-tl-none'
                  )}
                >
                  {message.message}
                </div>
                <span className="text-[9px] mt-1 text-muted-foreground px-1">
                  {new Date(message.created_at).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 bg-background border-t">
        <div className="flex gap-2">
          <Textarea
            placeholder={t('ticketConversation.placeholder', 'Your message...')}
            className="resize-none min-h-[44px] max-h-[120px] rounded-xl"
            rows={1}
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSendMessage();
              }
            }}
          />
          <Button
            size="icon"
            className="shrink-0 rounded-xl"
            disabled={sending || !newMessage.trim()}
            onClick={() => void handleSendMessage()}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          {t('ticketConversation.enterToSend', 'Press Enter to send')}
        </p>
      </div>
    </div>
  );
}
