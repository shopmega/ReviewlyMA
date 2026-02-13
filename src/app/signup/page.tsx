'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupFormData, type AuthFormState } from '@/lib/types';
import { signup } from '@/app/actions/auth';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useTransition, useState } from 'react';
import { getSiteSettings } from '@/lib/data';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createClient } from '@/lib/supabase/client';
import { getClientOAuthRedirectUrl } from '@/lib/site-config';


export default function SignupPage() {
  const initialState: AuthFormState = { status: 'idle', message: '' };
  const [state, formAction] = useActionState(signup, initialState);
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [oauthPending, setOauthPending] = useState(false);
  const supabase = createClient();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    async function loadSettings() {
      const s = await getSiteSettings();
      setSettings(s);
    }
    loadSettings();
  }, []);

  useEffect(() => {
    if (state.status === 'success') {
      toast({
        title: 'Succès',
        description: state.message || 'Compte créé avec succès! Veuillez vérifier votre email.'
      });
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } else if (state.status === 'error') {
      if (state.errors) {
        const errors = state.errors as Record<string, string[]>;
        Object.entries(errors).forEach(([key, messages]) => {
          if (messages && messages.length > 0) {
            form.setError(key as keyof SignupFormData, {
              type: 'server',
              message: messages[0],
            });
          }
        });
      }
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: state.message || 'Une erreur est survenue lors de la création du compte.'
      });
    }
  }, [state, toast, router, form]);

  const onSubmit = (data: SignupFormData) => {
    const formData = new FormData();
    formData.append('fullName', data.fullName);
    formData.append('email', data.email);
    formData.append('password', data.password);
    startTransition(() => {
      formAction(formData);
    });
  };

  const handleLinkedInSignup = async () => {
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
        description: error.message || 'Impossible de démarrer l’inscription LinkedIn.',
      });
    }
  };

  if (settings && settings.allow_new_registrations === false) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="w-full max-w-md space-y-8">
          <Card className="bg-card/60 backdrop-blur-lg border-white/20 shadow-2xl overflow-hidden">
            <div className="bg-rose-500 h-2 w-full" />
            <CardHeader className="text-center pt-10">
              <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-rose-500" />
              </div>
              <CardTitle className="text-3xl font-black text-slate-900 leading-tight">Inscriptions <span className="text-rose-500 italic">Suspendues</span></CardTitle>
              <CardDescription className="text-lg font-medium pt-4">
                Nous ne sommes pas en mesure d'accepter de nouveaux membres pour le moment.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-10 pt-4 text-center">
              <p className="text-slate-600 font-medium mb-8 leading-relaxed px-4">
                Les inscriptions sont temporairement fermées par l'administration. Merci de votre patience et à très bientôt !
              </p>
              <Button asChild variant="outline" size="lg" className="rounded-2xl border-2 px-10 font-bold hover:bg-slate-50 transition-all">
                <Link href="/">Retour à l'accueil</Link>
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
            <CardTitle className="text-3xl font-bold">Créer un compte</CardTitle>
            <CardDescription>
              Vous avez déjà un compte?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Connectez-vous
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
                onClick={handleLinkedInSignup}
                disabled={oauthPending || isPending}
              >
                {oauthPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Inscription LinkedIn...
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
            {state.status === 'error' && !state.errors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Jean Dupont"
                          className="bg-input/80"
                          {...field}
                        />
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
                      <FormLabel>Adresse e-mail</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="nom@exemple.com"
                          className="bg-input/80"
                          {...field}
                        />
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
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          className="bg-input/80"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full !mt-6" size="lg" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    'Créer mon compte'
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
