'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createClient } from '@/lib/supabase/client';
import { getClientOAuthRedirectUrl } from '@/lib/site-config';
import { loginSchema, type AuthFormState, type LoginFormData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { login } from '@/app/actions/auth';

export default function LoginPage() {
  const initialState: AuthFormState = { status: 'idle', message: '' };
  const [state, formAction] = useActionState(login, initialState);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [oauthPending, setOauthPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [nextPath, setNextPath] = useState('/');
  const supabase = createClient();

  useEffect(() => {
    const rawNext = new URLSearchParams(window.location.search).get('next');
    if (!rawNext || !rawNext.startsWith('/')) {
      setNextPath('/');
      return;
    }
    setNextPath(rawNext);
  }, []);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (state.status === 'success') {
      setErrorMessage('');
      toast({
        title: 'Succes',
        description: state.message || 'Connexion reussie. Redirection en cours...',
      });
      window.location.assign(nextPath);
      return;
    }

    if (state.status === 'error') {
      const message = state.message || 'Echec de la connexion. Veuillez verifier vos identifiants.';
      setErrorMessage(message);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: message,
      });
    }
  }, [state.status, state.message, nextPath, toast]);

  const onSubmit = (data: LoginFormData) => {
    setErrorMessage('');
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);
    startTransition(() => {
      formAction(formData);
    });
  };

  const handleLinkedInLogin = async () => {
    setOauthPending(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: getClientOAuthRedirectUrl('/'),
      },
    });

    if (error) {
      setOauthPending(false);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Impossible de demarrer la connexion LinkedIn.',
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] bg-gradient-to-br from-primary/10 to-accent/10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <Card className="border-white/20 bg-card/60 shadow-2xl backdrop-blur-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Connexion</CardTitle>
            <CardDescription>
              Ou{' '}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                creez un compte
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card/60 px-2 text-muted-foreground">Continuer avec</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Button
                variant="outline"
                className="bg-card/80"
                type="button"
                onClick={handleLinkedInLogin}
                disabled={oauthPending || isPending}
              >
                {oauthPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion LinkedIn...
                  </>
                ) : (
                  'Continuer avec LinkedIn'
                )}
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card/60 px-2 text-muted-foreground">Ou avec votre e-mail</span>
              </div>
            </div>

            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse e-mail</FormLabel>
                      <FormControl>
                        <Input placeholder="nom@exemple.com" className="bg-input/80" {...field} />
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
                      <div className="flex items-center">
                        <FormLabel>Mot de passe</FormLabel>
                        <Link href="/forgot-password" className="ml-auto inline-block text-sm underline">
                          Mot de passe oublie?
                        </Link>
                      </div>
                      <FormControl>
                        <Input type="password" className="bg-input/80" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion en cours...
                    </>
                  ) : (
                    'Se connecter'
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
