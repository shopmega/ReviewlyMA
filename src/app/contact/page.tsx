'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { submitContactForm } from '@/app/actions/platform-contact';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { useI18n } from '@/components/providers/i18n-provider';

export default function ContactPage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { t } = useI18n();
  const [resetKey, setResetKey] = useState(0);

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await submitContactForm(formData);

      if (result.status === 'success') {
        toast({
          title: t('platformContactPage.sentTitle', 'Message sent'),
          description: t('platformContactPage.successDefault', 'Your message has been sent successfully.'),
          variant: 'default',
        });
        setResetKey((prev) => prev + 1);
      } else {
        toast({
          title: t('platformContactPage.errorTitle', 'Error'),
          description: t('platformContactPage.errorDefault', 'An error occurred while sending your message.'),
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-4xl font-bold mb-8 font-headline text-center">{t('platformContactPage.title', 'Contact us')}</h1>
      <p className="text-center text-muted-foreground mb-12">
        {t('platformContactPage.subtitle', 'Questions or suggestions? Get in touch with us.')}
      </p>

      <form action={handleSubmit} className="space-y-6" key={resetKey}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t('platformContactPage.fullName', 'Full name')}</Label>
            <Input id="name" name="name" placeholder={t('platformContactPage.namePlaceholder', 'Your name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">
              {t('platformContactPage.email', 'Email')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t('platformContactPage.emailPlaceholder', 'you@email.com')}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">{t('platformContactPage.subject', 'Subject')}</Label>
          <Input id="subject" name="subject" placeholder={t('platformContactPage.subjectPlaceholder', 'What would you like to discuss?')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">
            {t('platformContactPage.message', 'Message')} <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="message"
            name="message"
            placeholder={t('platformContactPage.messagePlaceholder', 'Your message...')}
            className="min-h-[150px]"
            required
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('platformContactPage.sending', 'Sending...')}
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {t('platformContactPage.submit', 'Send message')}
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
