'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ShieldCheck,
    MessageSquare,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Gavel,
    Scale,
    Smile
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function RulesPage() {
    const guidelines = [
        {
            title: "Expériences Authentiques",
            description: "Vos avis doivent être basés sur des expériences réelles et personnelles. Évitez les rumeurs ou les avis fondés sur ce que vous avez entendu dire par d'autres.",
            icon: Smile,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10"
        },
        {
            title: "Respect et Courtoisie",
            description: "Le harcèlement, les discours de haine, les menaces et les attaques personnelles ne sont pas tolérés. Exprimez votre opinion, même négative, de manière constructive.",
            icon: ShieldCheck,
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            title: "Pas de Contenu Commercial",
            description: "N'utilisez pas les avis pour faire de l'auto-promotion ou pour publier des liens publicitaires. Les avis sponsorisés non déclarés sont interdits.",
            icon: XCircle,
            color: "text-rose-500",
            bg: "bg-rose-500/10"
        },
        {
            title: "Protection des Données",
            description: "Ne publiez pas d'informations personnelles identifiables (noms de famille, numéros de téléphone, adresses privées) vous concernant ou concernant le personnel des entreprises.",
            icon: AlertTriangle,
            color: "text-amber-500",
            bg: "bg-amber-500/10"
        }
    ];

    const doAndDont = {
        do: [
            "Soyez spécifique sur ce que vous avez aimé ou non.",
            "Ajoutez des photos de votre expérience réelle.",
            "Restez honnête et impartial.",
            "Vérifiez l'orthographe pour que votre avis soit utile.",
            "Mentionnez la date de votre visite."
        ],
        dont: [
            "N'insultez pas le personnel ou les propriétaires.",
            "Ne critiquez pas une entreprise pour des raisons religieuses ou politiques.",
            "N'écrivez pas d'avis sous l'influence de la colère immédiate.",
            "N'utilisez pas de langage grossier.",
            "Ne copiez pas le contenu d'autres sites."
        ]
    };

    return (
        <div className="bg-background min-h-screen">
            {/* Hero Header */}
            <div className="relative w-full py-20 bg-gradient-to-br from-primary via-blue-900 to-accent overflow-hidden">
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 bg-[url('/patterns/moroccan-pattern.svg')] opacity-10" />
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <Badge className="mb-4 bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-1 text-sm uppercase tracking-widest">
                        Transparence & Confiance
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-bold font-headline text-white mb-6">
                        Charte de la Communauté
                    </h1>
                    <p className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
                        Nous avons créé cet espace pour que chaque Marocain puisse partager des avis honnêtes, utiles et respectueux. Voici comment nous gardons la plateforme saine.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-10 relative z-20 pb-24">
                <div className="max-w-5xl mx-auto">
                    {/* Main Guidelines Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        {guidelines.map((item, idx) => (
                            <Card key={idx} className="border-none shadow-xl bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                                <CardContent className="p-8">
                                    <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center mb-6`}>
                                        <item.icon className={`w-8 h-8 ${item.color}`} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 font-headline">{item.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {item.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                        {/* The List of Do's */}
                        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-inner lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-emerald-600">
                                    <CheckCircle2 className="w-5 h-5" />
                                    À faire
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-4">
                                    {doAndDont.do.map((text, i) => (
                                        <li key={i} className="flex gap-3 text-sm text-foreground/80">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        {/* The List of Don'ts */}
                        <Card className="border-rose-500/20 bg-rose-500/5 shadow-inner lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-rose-600">
                                    <XCircle className="w-5 h-5" />
                                    À éviter
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-4">
                                    {doAndDont.dont.map((text, i) => (
                                        <li key={i} className="flex gap-3 text-sm text-foreground/80">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        {/* Moderation Policy */}
                        <Card className="border-none shadow-xl bg-primary/90 text-white lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <Gavel className="w-6 h-6" />
                                    Modération
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-white/80 text-sm leading-relaxed">
                                    Notre équipe de modération ainsi que nos algorithmes vérifient chaque avis signalé. Nous nous réservons le droit de supprimer tout contenu qui ne respecte pas ces règles.
                                </p>
                                <div className="p-4 bg-white/10 rounded-xl space-y-2">
                                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                                        <span>Transparence</span>
                                        <Badge className="bg-white/20 text-white border-white/10">100%</Badge>
                                    </div>
                                    <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-accent w-full" />
                                    </div>
                                </div>
                                <p className="text-xs text-white/60 italic">
                                    En cas de récidive, le compte de l'utilisateur pourra être suspendu de manière permanente.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Legal Footnote */}
                    <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-secondary/30 rounded-3xl border border-secondary/50 gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-background rounded-2xl">
                                <Scale className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div>
                                <h4 className="font-bold">Besoin de plus de détails ?</h4>
                                <p className="text-sm text-muted-foreground">Consultez nos conditions générales d'utilisation.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Badge variant="outline" className="px-4 py-1">Édition 2026</Badge>
                            <Badge variant="outline" className="px-4 py-1">Version 1.2</Badge>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
