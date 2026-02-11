
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userProfileUpdateSchema, type UserProfileUpdateData } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useActionState, useTransition } from 'react';
import { updateUserProfile } from '@/app/actions/user';

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
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }
      
      // Fetch profile
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
        title: 'Modifications enregistrées !',
        description: state.message,
      });
    } else if (state?.status === 'error') {
      if (state.errors && typeof state.errors === 'object' && state.errors !== null) {
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="bg-background min-h-screen">
      <div className="relative w-full h-40 bg-gradient-to-r from-primary/80 to-blue-900/80 overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-[url('/patterns/moroccan-pattern.svg')] opacity-10" />
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-16 relative z-10 pb-12">
        <div className="max-w-3xl mx-auto">
          <header className="mb-8 text-white drop-shadow-md">
            <h1 className="text-3xl font-bold font-headline mb-1">Paramètres du compte</h1>
            <p className="text-white/80">Gérez vos préférences et informations personnelles.</p>
          </header>

          <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Mettez à jour vos informations personnelles et préférences de compte.
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
                  
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Enregistrer les modifications
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              Pour gérer votre entreprise, rendez-vous sur la page{' '}
              <Button variant="link" className="h-auto p-0" asChild>
                <a href="/dashboard">Tableau de bord</a>
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
