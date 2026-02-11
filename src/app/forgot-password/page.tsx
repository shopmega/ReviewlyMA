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

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                </>
            ) : (
                <>
                    <Mail className="mr-2 h-4 w-4" />
                    Envoyer le lien de réinitialisation
                </>
            )}
        </Button>
    );
}

export default function ForgotPasswordPage() {
    const initialState: AuthFormState = { status: 'idle', message: '' };
    const [state, formAction] = useActionState(requestPasswordReset, initialState);
    const { toast } = useToast();
    const [emailSent, setEmailSent] = useState(false);

    useEffect(() => {
        if (state.status === 'success') {
            setEmailSent(true);
            toast({
                title: 'E-mail envoyé',
                description: state.message
            });
        } else if (state.status === 'error') {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: state.message
            });
        }
    }, [state.status, state.message, toast]);

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 to-accent/10">
            <div className="w-full max-w-md space-y-8">
                <Card className="bg-card/60 backdrop-blur-lg border-white/20 shadow-2xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-bold">Mot de passe oublié</CardTitle>
                        <CardDescription>
                            {emailSent
                                ? "Vérifiez votre boîte de réception"
                                : "Entrez votre e-mail pour recevoir un lien de réinitialisation"
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {emailSent ? (
                            <div className="space-y-6">
                                <Alert className="border-green-200 bg-green-50 text-green-800">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <AlertDescription className="text-green-700">
                                        {state.message}
                                    </AlertDescription>
                                </Alert>

                                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        <strong>Conseil :</strong> Si vous ne voyez pas l'e-mail, vérifiez votre dossier spam ou courrier indésirable.
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Le lien expirera dans 1 heure.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => setEmailSent(false)}
                                    >
                                        Essayer avec une autre adresse
                                    </Button>
                                    <Button asChild variant="ghost" className="w-full">
                                        <Link href="/login">
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Retour à la connexion
                                        </Link>
                                    </Button>
                                </div>
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
                                        <Label htmlFor="email">Adresse e-mail</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="nom@exemple.com"
                                            required
                                            className="bg-input/80"
                                        />
                                    </div>
                                    <SubmitButton />
                                </form>

                                <div className="text-center">
                                    <Link
                                        href="/login"
                                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        <ArrowLeft className="inline-block mr-1 h-3 w-3" />
                                        Retour à la connexion
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
