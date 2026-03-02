'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionState } from 'react';
import { updatePassword, type AuthFormState } from '@/app/actions/auth';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, Suspense } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Key, Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/components/providers/i18n-provider';

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('auth.resetPassword.updating', 'Updating...')}
        </>
      ) : (
        <>
          <Key className="mr-2 h-4 w-4" />
          {t('auth.resetPassword.submit', 'Update password')}
        </>
      )}
    </Button>
  );
}

function ResetPasswordContent() {
  const initialState: AuthFormState = { status: 'idle', message: '' };
  const [state, formAction] = useActionState(updatePassword, initialState);
  const { toast } = useToast();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorDescription = searchParams.get('error_description');
    if (errorDescription) {
      setError(decodeURIComponent(errorDescription));
    }
  }, [searchParams]);

  useEffect(() => {
    if (state.status === 'success') {
      setPasswordUpdated(true);
      toast({
        title: t('auth.login.successTitle', 'Success'),
        description: t('auth.resetPassword.updatedSuccess', 'Password updated successfully.'),
      });
      const timer = setTimeout(() => {
        router.push('/login');
      }, 3000);
      return () => clearTimeout(timer);
    }

    if (state.status === 'error') {
      toast({
        variant: 'destructive',
        title: t('auth.resetPassword.errorTitle', 'Error'),
        description: t('auth.resetPassword.errorDesc', 'Unable to update password. Please try again.'),
      });
    }
  }, [state.status, state.message, toast, router, t]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="w-full max-w-md space-y-8">
          <Card className="bg-card/60 backdrop-blur-lg border-white/20 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-destructive">{t('auth.resetPassword.titleExpired', 'Expired link')}</CardTitle>
              <CardDescription>{t('auth.resetPassword.expiredSubtitle', 'This reset link is no longer valid')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>

              <p className="text-sm text-muted-foreground text-center">
                {t('auth.resetPassword.expiredHint', 'Reset links expire after 1 hour. Please request a new link.')}
              </p>

              <Button asChild className="w-full">
                <Link href="/forgot-password">{t('auth.resetPassword.requestNewLink', 'Request a new link')}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 to-accent/10">
      <div className="w-full max-w-md space-y-8">
        <Card className="bg-card/60 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">
              {passwordUpdated
                ? t('auth.resetPassword.titleUpdated', 'Password updated')
                : t('auth.resetPassword.titleNew', 'New password')}
            </CardTitle>
            <CardDescription>
              {passwordUpdated
                ? t('auth.resetPassword.subtitleUpdated', 'You will be redirected to login')
                : t('auth.resetPassword.subtitleNew', 'Choose a secure new password')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {passwordUpdated ? (
              <div className="space-y-6">
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    {t('auth.resetPassword.updatedSuccess', 'Password updated successfully.')}
                  </AlertDescription>
                </Alert>

                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>

                <p className="text-sm text-muted-foreground text-center">{t('auth.resetPassword.redirecting', 'Redirecting to login...')}</p>

                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">{t('auth.resetPassword.goLogin', 'Go to login')}</Link>
                </Button>
              </div>
            ) : (
              <>
                {state.status === 'error' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{t('auth.resetPassword.errorDesc', 'Unable to update password. Please try again.')}</AlertDescription>
                  </Alert>
                )}

                <form action={formAction} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('auth.resetPassword.newPasswordLabel', 'New password')}</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="********"
                      required
                      minLength={6}
                      className="bg-input/80"
                    />
                    <p className="text-xs text-muted-foreground">{t('auth.resetPassword.passwordMin', 'Minimum 6 characters')}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('auth.resetPassword.confirmPasswordLabel', 'Confirm password')}</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="********"
                      required
                      minLength={6}
                      className="bg-input/80"
                    />
                  </div>

                  <SubmitButton />
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const { t } = useI18n();

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="w-full max-w-md space-y-8">
            <Card className="bg-card/60 backdrop-blur-lg border-white/20 shadow-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold">{t('common.loading', 'Loading...')}</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
