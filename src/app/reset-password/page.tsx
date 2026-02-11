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

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mise à jour...
                </>
            ) : (
                <>
                    <Key className="mr-2 h-4 w-4" />
                    Mettre à jour le mot de passe
                </>
            )}
        </Button>
    );
}

function ResetPasswordContent() {
    const initialState: AuthFormState = { status: 'idle', message: '' };
    const [state, formAction] = useActionState(updatePassword, initialState);
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [passwordUpdated, setPasswordUpdated] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check for error in URL (from Supabase callback)
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
                title: 'Succès',
                description: state.message
            });
            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } else if (state.status === 'error') {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: state.message
            });
        }
    }, [state.status, state.message, toast, router]);

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 to-accent/10">
                <div className="w-full max-w-md space-y-8">
                    <Card className="bg-card/60 backdrop-blur-lg border-white/20 shadow-2xl">
                        <CardHeader className="text-center">
                            <CardTitle className="text-3xl font-bold text-destructive">Lien expiré</CardTitle>
                            <CardDescription>
                                Le lien de réinitialisation n'est plus valide
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>

                            <p className="text-sm text-muted-foreground text-center">
                                Les liens de réinitialisation expirent après 1 heure. Veuillez demander un nouveau lien.
                            </p>

                            <Button asChild className="w-full">
                                <Link href="/forgot-password">
                                    Demander un nouveau lien
                                </Link>
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
                            {passwordUpdated ? 'Mot de passe mis à jour' : 'Nouveau mot de passe'}
                        </CardTitle>
                        <CardDescription>
                            {passwordUpdated
                                ? "Vous allez être redirigé vers la connexion"
                                : "Choisissez un nouveau mot de passe sécurisé"
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {passwordUpdated ? (
                            <div className="space-y-6">
                                <Alert className="border-green-200 bg-green-50 text-green-800">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <AlertDescription className="text-green-700">
                                        {state.message}
                                    </AlertDescription>
                                </Alert>

                                <div className="flex justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>

                                <p className="text-sm text-muted-foreground text-center">
                                    Redirection vers la page de connexion...
                                </p>

                                <Button asChild variant="outline" className="w-full">
                                    <Link href="/login">
                                        Aller à la connexion
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <>
                                {state.status === 'error' && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{state.message}</AlertDescription>
                                    </Alert>
                                )}

                                <form action={formAction} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Nouveau mot de passe</Label>
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            placeholder="••••••••"
                                            required
                                            minLength={6}
                                            className="bg-input/80"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Minimum 6 caractères
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type="password"
                                            placeholder="••••••••"
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
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 to-accent/10">
                <div className="w-full max-w-md space-y-8">
                    <Card className="bg-card/60 backdrop-blur-lg border-white/20 shadow-2xl">
                        <CardHeader className="text-center">
                            <CardTitle className="text-3xl font-bold">Chargement...</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
