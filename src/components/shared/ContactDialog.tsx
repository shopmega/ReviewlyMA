'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { trackBusinessEvent } from '@/app/actions/analytics';
import { useI18n } from '@/components/providers/i18n-provider';

interface ContactDialogProps {
  businessId: string;
  businessName: string;
}

export function ContactDialog({ businessId, businessName }: ContactDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t, tf } = useI18n();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));
    await trackBusinessEvent(businessId, 'contact_form');

    toast({
      title: t('contact.sentTitle', 'Message envoye !'),
      description: tf('contact.sentDesc', 'Votre message a ete envoye avec succes a {businessName}.', { businessName }),
    });

    setLoading(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full bg-card/80 backdrop-blur-sm">
          <Mail className="mr-2 h-4 w-4" />
          {t('contact.trigger', 'Contacter')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{tf('contact.title', 'Contacter {businessName}', { businessName })}</DialogTitle>
            <DialogDescription>
              {t('contact.description', 'Envoyez un message direct a cette entreprise. Ils vous repondront par email.')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t('contact.name', 'Votre nom')}</Label>
              <Input id="name" placeholder={t('contact.namePlaceholder', 'Prenom Nom')} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{t('contact.email', 'Votre email')}</Label>
              <Input id="email" type="email" placeholder="votre@email.com" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">{t('contact.message', 'Message')}</Label>
              <Textarea
                id="message"
                placeholder={t('contact.messagePlaceholder', 'Comment pouvons-nous vous aider ?')}
                className="min-h-[100px]"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('contact.sending', 'Envoi en cours...')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('contact.submit', 'Envoyer le message')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
