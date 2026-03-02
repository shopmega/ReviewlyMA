'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionState } from 'react';
import { requestPasswordReset, type AuthFormState } from '@/app/actions/auth';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, CheckCircle, Loader2, Mail } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { useI18n } from '@/components/providers/i18n-provider';

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('auth.forgotPassword.sending', 'Sending...')}
        </>
      ) : (
        <>
          <Mail className="mr-2 h-4 w-4" />
          {t('auth.forgotPassword.submit', 'Send reset link')}
        </>
      )}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const initialState: AuthFormState = { status: 'idle', message: '' };
  const [state, formAction] = useActionState(requestPasswordReset, initialState);
  const { toast } = useToast();
  const { t } = useI18n();
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (state.status === 'success') {
      setEmailSent(true);
      toast({
        title: t('auth.forgotPassword.sentTitle', 'Email sent'),
        description: t('auth.forgotPassword.sentToastDefault', 'Reset instructions were sent to your email.'),
      });
    } else if (state.status === 'error') {
      toast({
        variant: 'destructive',
        title: t('auth.forgotPassword.errorTitle', 'Error'),
        description: t('auth.forgotPassword.errorDesc', 'Unable to send reset email. Please try again.'),
      });
    }
  }, [state.status, state.message, toast, t]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 to-accent/10">
      <div className="w-full max-w-md space-y-8">
        <Card className="bg-card/60 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">{t('auth.forgotPassword.title', 'Forgot password')}</CardTitle>
            <CardDescription>
              {emailSent
                ? t('auth.forgotPassword.subtitleSent', 'Check your inbox')
                : t('auth.forgotPassword.subtitleIdle', 'Enter your email to receive a reset link')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {emailSent ? (
              <div className="space-y-6">
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    {t('auth.forgotPassword.sentToastDefault', 'Reset instructions were sent to your email.')}
                  </AlertDescription>
                </Alert>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    <strong>{t('auth.forgotPassword.tipTitle', 'Tip:')}</strong>{' '}
                    {t('auth.forgotPassword.tipBody', 'If you do not see the email, check your spam folder.')}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('auth.forgotPassword.expiryHint', 'The link expires in 1 hour.')}</p>
                </div>

                <div className="flex flex-col gap-3">
                  <Button variant="outline" className="w-full" onClick={() => setEmailSent(false)}>
                    {t('auth.forgotPassword.tryAnother', 'Try another address')}
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link href="/login">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {t('auth.forgotPassword.backToLogin', 'Back to login')}
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {state.status === 'error' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{t('auth.forgotPassword.errorDesc', 'Unable to send reset email. Please try again.')}</AlertDescription>
                  </Alert>
                )}

                <form action={formAction} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('auth.login.emailLabel', 'Email address')}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder={t('auth.login.emailPlaceholder', 'name@example.com')}
                      required
                      className="bg-input/80"
                    />
                  </div>
                  <SubmitButton />
                </form>

                <div className="text-center">
                  <Link href="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    <ArrowLeft className="inline-block mr-1 h-3 w-3" />
                    {t('auth.forgotPassword.backToLogin', 'Back to login')}
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
