'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { suggestBusiness } from '@/app/actions/business';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Store, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
    "Technologie", "Finance", "Consulting", "Santé", "Ingénierie", "Marketing", "RH", "Éducation", "Services", "Industrie"
];

const CITIES = [
    "Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir", "Meknès", "Oujda", "Kenitra", "Tetouan", "Autre"
];

export default function SuggestBusinessPage() {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();

    async function handleSubmit(formData: FormData) {
        startTransition(async () => {
            const result = await suggestBusiness(formData);

            if (result.status === 'success' && result.data?.slug) {
                toast({
                    title: "Établissement ajouté !",
                    description: "Redirection vers la page de l'entreprise..."
                });
                setTimeout(() => {
                    router.push(`/businesses/${result.data.slug}`);
                }, 1500);
            } else {
                toast({
                    title: "Erreur",
                    description: result.message,
                    variant: "destructive",
                });
            }
        });
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="container max-w-2xl mx-auto space-y-8">

                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
                        <Store className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-bold font-headline tracking-tight text-slate-900">
                        Suggérer une entreprise
                    </h1>
                    <p className="text-lg text-slate-600 max-w-lg mx-auto">
                        Aidez la communauté à découvrir de nouvelles entreprises. Ajoutez votre entreprise ou service préféré.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col items-center text-center">
                        <CheckCircle2 className="h-6 w-6 text-green-500 mb-2" />
                        <span className="font-semibold text-sm">Contribution Directe</span>
                        <span className="text-xs text-muted-foreground">Ajout immédiat</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col items-center text-center">
                        <MapPin className="h-6 w-6 text-blue-500 mb-2" />
                        <span className="font-semibold text-sm">Localisation</span>
                        <span className="text-xs text-muted-foreground">Aidez à les trouver</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col items-center text-center">
                        <Store className="h-6 w-6 text-amber-500 mb-2" />
                        <span className="font-semibold text-sm">Croissance</span>
                        <span className="text-xs text-muted-foreground">Supportez le local</span>
                    </div>
                </div>

                <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Détails de l'entreprise</CardTitle>
                        <CardDescription>
                            Remplissez les informations ci-dessous. Soyez aussi précis que possible.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={handleSubmit} className="space-y-6">

                            <div className="space-y-2">
                                <Label htmlFor="name">Nom de l'entreprise <span className="text-red-500">*</span></Label>
                                <Input id="name" name="name" placeholder="Ex: TechCorp Solutions" required className="bg-white" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Catégorie <span className="text-red-500">*</span></Label>
                                    <Select name="category" required>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Choisir..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="city">Ville <span className="text-red-500">*</span></Label>
                                    <Select name="city" required>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Choisir..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Adresse (Optionnel)</Label>
                                <Input id="address" name="address" placeholder="Ex: 123 Bd Zerktouni" className="bg-white" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description (Optionnel)</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="Que propose cette entreprise ?"
                                    className="bg-white min-h-[100px]"
                                />
                            </div>

                            <div className="pt-4">
                                <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={isPending}>
                                    {isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Création en cours...
                                        </>
                                    ) : (
                                        <>
                                            Ajouter l'entreprise
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </>
                                    )}
                                </Button>
                                <p className="text-xs text-center text-muted-foreground mt-4">
                                    En soumettant cette entreprise, vous acceptez nos conditions d'utilisation.
                                </p>
                            </div>

                        </form>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
