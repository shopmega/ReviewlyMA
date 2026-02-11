'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { submitContactForm } from '@/app/actions/platform-contact';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';

export default function ContactPage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [resetKey, setResetKey] = useState(0); // Quick way to reset uncontrolled inputs

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await submitContactForm(formData);

      if (result.status === 'success') {
        toast({
          title: "Message envoyé",
          description: result.message,
          variant: "default", // or "success" if defined
        });
        // Reset form
        setResetKey(prev => prev + 1);
      } else {
        toast({
          title: "Erreur",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-4xl font-bold mb-8 font-headline text-center">Contactez-nous</h1>
      <p className="text-center text-muted-foreground mb-12">
        Vous avez des questions ou des suggestions ? N'hésitez pas à nous contacter.
      </p>

      <form action={handleSubmit} className="space-y-6" key={resetKey}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <Input id="name" name="name" placeholder="Votre nom" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
            <Input id="email" name="email" type="email" placeholder="votre@email.com" required />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Sujet</Label>
          <Input id="subject" name="subject" placeholder="De quoi souhaitez-vous discuter ?" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message <span className="text-red-500">*</span></Label>
          <Textarea
            id="message"
            name="message"
            placeholder="Votre message..."
            className="min-h-[150px]"
            required
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Envoyer le message
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
