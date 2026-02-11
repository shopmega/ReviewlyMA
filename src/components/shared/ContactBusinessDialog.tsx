'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { sendMessage } from "@/app/actions/messages";
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client';

interface ContactBusinessDialogProps {
  businessId: string;
  businessName: string;
}

export function ContactBusinessDialog({ businessId, businessName, trigger }: ContactBusinessDialogProps & { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAuthenticated(true);
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();

        if (profile) {
          setName(profile.full_name || '');
          setEmail(profile.email || user.email || '');
        } else {
          setEmail(user.email || '');
        }
      }
    }
    if (open) {
      getUser();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    const result = await sendMessage({
      business_id: businessId,
      content,
      sender_name: name || undefined,
      sender_email: email || undefined,
    });

    if (result.status === 'success') {
      toast({
        title: "Message envoyé !",
        description: "L'entreprise a bien reçu votre message."
      });
      setOpen(false);
      setContent('');
    } else {
      toast({
        title: "Erreur",
        description: result.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="rounded-full bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8">
            <MessageSquare className="mr-2 h-4 w-4" />
            Envoyer un message
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Contacter {businessName}</DialogTitle>
            <DialogDescription>
              Posez une question ou demandez une information directement à l'entreprise.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {isAuthenticated ? (
              <p className="text-sm text-muted-foreground italic px-1">
                En tant que <span className="font-semibold text-foreground">{name}</span> ({email})
              </p>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="name">Votre Nom (Optionnel)</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Jean Dupont"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Votre Email (Optionnel)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Ex: jean@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Écrivez votre message ici..."
                required
                className="min-h-[150px]"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !content.trim()} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Envoyer le message
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
