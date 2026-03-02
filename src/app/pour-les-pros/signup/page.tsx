'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { proSignupSchema, type ProSignupFormData, type AuthFormState } from '@/lib/types';
import { proSignup } from '@/app/actions/auth';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useI18n } from '@/components/providers/i18n-provider';

export default function ProSignupPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialState: AuthFormState = { status: 'idle', message: '' };
  const [state, formAction] = useActionState(proSignup, initialState);
  const { toast } = useToast();
  const { t } = useI18n();

  const form = useForm<ProSignupFormData>({
    resolver: zodResolver(proSignupSchema),
    defaultValues: {
      fullName: '',
      jobTitle: '',
      businessName: '',
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.push('/claim');
        return;
      }

      setLoading(false);
    };

    checkUser();
  }, [router]);

  useEffect(() => {
    if (!loading && state.status === 'success') {
      toast({
        title: t('auth.proSignup.successTitle', 'Success'),
        description: t('auth.proSignup.successDesc', 'Pro account created. Redirecting...'),
      });
      setTimeout(() => {
        router.push('/dashboard/pending');
      }, 1000);
      return;
    }

    if (!loading && state.status === 'error') {
      if (state.errors) {
        const errors = state.errors as Record<string, string[]>;
        Object.entries(errors).forEach(([key, messages]) => {
          if (messages && messages.length > 0) {
            form.setError(key as keyof ProSignupFormData, {
              type: 'server',
              message: messages[0],
            });
          }
        });
      }
      toast({
        variant: 'destructive',
        title: t('auth.proSignup.errorTitle', 'Error'),
        description: t('auth.proSignup.errorDesc', 'Failed to create pro account. Please check your information.'),
      });
    }
  }, [loading, state, toast, router, form, t]);

  const onSubmit = (data: ProSignupFormData) => {
    const formData = new FormData();
    formData.append('fullName', data.fullName);
    formData.append('jobTitle', data.jobTitle || '');
    formData.append('businessName', data.businessName);
    formData.append('email', data.email);
    formData.append('password', data.password);
    startTransition(() => {
      formAction(formData);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t('auth.proSignup.loading', 'Checking authentication state...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 to-accent/10">
      <div className="w-full max-w-lg space-y-8">
        <Card className="bg-card/60 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">{t('auth.proSignup.title', 'Create your pro account')}</CardTitle>
            <CardDescription>
              {t('auth.proSignup.subtitle', 'Access free tools to manage your business reputation.')}
              <br />
              {t('auth.proSignup.loginPrompt', 'Already have an account?')}{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                {t('auth.proSignup.loginCta', 'Log in')}
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {state.status === 'error' && !state.errors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{t('auth.proSignup.errorDesc', 'Failed to create pro account. Please check your information.')}</AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.signup.fullNameLabel', 'Full name')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('auth.proSignup.fullNamePlaceholder', 'Ex: First Last')} className="bg-input/80" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.proSignup.jobTitleLabel', 'Current role')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('auth.proSignup.jobTitlePlaceholder', 'Ex: Manager, Marketing Lead')} className="bg-input/80" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.proSignup.businessNameLabel', 'Business name')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('auth.proSignup.businessNamePlaceholder', 'Ex: Company LLC')} className="bg-input/80" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.proSignup.businessEmailLabel', 'Work email')}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={t('auth.proSignup.businessEmailPlaceholder', 'name@company.com')} className="bg-input/80" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.login.passwordLabel', 'Password')}</FormLabel>
                      <FormControl>
                        <Input type="password" required className="bg-input/80" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <p className="text-xs text-muted-foreground pt-2">
                  {t('auth.proSignup.termsPrefix', 'By clicking')}{' '}
                  <span className="font-medium">"{t('auth.proSignup.submit', 'Create my professional account')}"</span>, {t('auth.proSignup.termsMiddle', 'you agree to our')}{' '}
                  <Link href="/terms" className="underline">{t('auth.proSignup.termsLink', 'Terms of Use')}</Link>{' '}
                  {t('auth.proSignup.and', 'and our')}{' '}
                  <Link href="/privacy" className="underline">{t('auth.proSignup.privacyLink', 'Privacy Policy')}</Link>.
                </p>

                <Button type="submit" className="w-full !mt-6" size="lg" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('auth.signup.submitting', 'Creating account...')}
                    </>
                  ) : (
                    t('auth.proSignup.submit', 'Create my professional account')
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
