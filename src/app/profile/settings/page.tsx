'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useActionState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, LayoutDashboard, Loader2, User } from 'lucide-react';

import { updateUserProfile } from '@/app/actions/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { userProfileUpdateSchema, type UserProfileUpdateData } from '@/lib/types';

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const initialState = { status: 'idle' as const, message: '', errors: {} };
  const [state, formAction] = useActionState(updateUserProfile, initialState);

  const form = useForm<UserProfileUpdateData>({
    resolver: zodResolver(userProfileUpdateSchema),
    defaultValues: {
      full_name: '',
      email: '',
    },
  });

  useEffect(() => {
    async function fetchUserData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      if (!error && profile) {
        form.reset({
          full_name: profile.full_name || '',
          email: profile.email || user.email || '',
        });
      }

      setLoading(false);
    }

    fetchUserData();
  }, [form]);

  useEffect(() => {
    if (state?.status === 'success') {
      toast({
        title: 'Modifications enregistrees',
        description: state.message,
      });
      return;
    }

    if (state?.status === 'error') {
      if (state.errors && typeof state.errors === 'object') {
        Object.entries(state.errors).forEach(([key, messages]) => {
          const fieldMessages = messages as string[] | undefined;
          if (fieldMessages && fieldMessages.length > 0) {
            form.setError(key as keyof UserProfileUpdateData, {
              type: 'server',
              message: fieldMessages[0],
            });
          }
        });
      }

      toast({
        title: 'Erreur',
        description: state.message,
        variant: 'destructive',
      });
    }
  }, [state, toast, form]);

  const onSubmit = (data: UserProfileUpdateData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

    startTransition(() => {
      formAction(formData);
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-r from-primary/80 to-blue-900/80">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-[url('/patterns/moroccan-pattern.svg')] opacity-10" />
      </div>

      <div className="container relative z-10 mx-auto -mt-16 px-4 pb-12 md:px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="mb-8 text-white drop-shadow-md">
            <h1 className="mb-1 text-3xl font-bold font-headline">Parametres du compte</h1>
            <p className="text-white/80">
              Mettez a jour vos informations personnelles et revenez rapidement a vos actions principales.
            </p>
          </header>

          <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-sky-500/5">
            <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Action recommandee</p>
                <p className="font-semibold">Mettez a jour vos coordonnees puis retournez a votre profil.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Voir mon profil
                  </Link>
                </Button>
                <Button asChild className="rounded-full">
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Aller au dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card className="border-none bg-card/50 shadow-lg backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
                <CardDescription>
                  Ces informations sont utilisees pour votre compte et vos notifications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom complet</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending || !form.formState.isDirty}
                        onClick={() => form.reset()}
                      >
                        Reinitialiser
                      </Button>
                      <Button type="submit" disabled={isPending || !form.formState.isDirty}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enregistrer les modifications
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card className="border border-border/60">
              <CardHeader>
                <CardTitle className="text-base">Navigation rapide</CardTitle>
                <CardDescription>Accedez rapidement aux espaces les plus utilises.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="ghost" className="w-full justify-between">
                  <Link href="/profile">
                    Mon profil
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-between">
                  <Link href="/profile/saved-businesses">
                    Mes favoris
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-between">
                  <Link href="/dashboard">
                    Dashboard entreprise
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              Pour gerer votre entreprise, rendez-vous sur le{' '}
              <Button variant="link" className="h-auto p-0" asChild>
                <Link href="/dashboard">tableau de bord</Link>
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
