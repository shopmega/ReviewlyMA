'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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


export default function ProSignupPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const initialState: AuthFormState = { status: 'idle', message: '' };
  const [state, formAction] = useActionState(proSignup, initialState);
  const { toast } = useToast();

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
      const { data: { user } } = await supabase.auth.getUser();
      
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
        title: 'Succès', 
        description: state.message || 'Compte pro créé avec succès! Redirection vers la revendication...' 
      });
      setTimeout(() => {
        router.push('/claim/new');
      }, 1000);
    } else if (!loading && state.status === 'error') {
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
        title: 'Erreur', 
        description: state.message || 'Échec de la création du compte pro. Veuillez vérifier vos informations.' 
      });
    }
  }, [loading, state, toast, router, form]);

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
          <p className="text-muted-foreground">Vérification de l'état de connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 to-accent/10">
      <div className="w-full max-w-lg space-y-8">
        <Card className="bg-card/60 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Créez votre compte pro</CardTitle>
            <CardDescription>
              Acces a des outils gratuits pour gerer la reputation de votre entreprise.
              <br />
              Vous avez deja un compte?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Connectez-vous
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {state.status === 'error' && !state.errors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.message}</AlertDescription>
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
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Prenom Nom" className="bg-input/80" {...field} />
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
                        <FormLabel>Poste occupe</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Gerant, Responsable Marketing" className="bg-input/80" {...field} />
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
                      <FormLabel>Nom de l'entreprise</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Société SARL" className="bg-input/80" {...field} />
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
                      <FormLabel>Adresse e-mail professionnelle</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="nom@votresociete.com" className="bg-input/80" {...field} />
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
                        <Input type="password" required className="bg-input/80" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <p className="text-xs text-muted-foreground pt-2">
                  En cliquant sur "Creer mon compte", vous acceptez nos <Link href="/terms" className="underline">Conditions dutilisation</Link> et notre <Link href="/privacy" className="underline">Politique de confidentialite</Link>.
                </p>

                <Button type="submit" className="w-full !mt-6" size="lg" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    'Créer mon compte professionnel'
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
