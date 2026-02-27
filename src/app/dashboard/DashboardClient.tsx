'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Star, TrendingUp, AlertCircle, MessageSquare, ArrowRight, Zap, Sparkles, ShieldCheck, Users, Heart, ChevronDown, Building2, BarChart3, Crown, CircleCheckBig, CircleAlert } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StarRating } from '@/components/shared/StarRating';
import { cn } from '@/lib/utils';
import { getAuthorDisplayName, getAuthorInitials } from '@/lib/utils/anonymous-reviews';
import { type Profile } from '@/lib/types';
import { isPaidTier } from '@/lib/tier-utils';

// Re-defining internal types if not available globally
export type BusinessData = {
    id: string;
    name: string;
    overall_rating: number;
    slug?: string;
};

export type RecentReview = {
    id: number;
    title: string | null;
    content: string | null;
    rating: number;
    author_name: string;
    is_anonymous?: boolean;
    user_id?: string;
    date: string;
};

export type DashboardKpiWindow = {
    views: number;
    viewsPrev: number;
    leads: number;
    leadsPrev: number;
    newReviews: number;
    newReviewsPrev: number;
    newFollowers: number;
    newFollowersPrev: number;
    ratingAvg: number | null;
    ratingAvgPrev: number | null;
};

const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'Non defini';
    return new Intl.NumberFormat('fr-MA', {
        style: 'currency',
        currency: 'MAD',
        maximumFractionDigits: 0,
    }).format(value);
};

const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'Non defini';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
};

export type DashboardStats = {
    business: BusinessData;
    totalReviews: number;
    averageRating: number;
    recentReviews: RecentReview[];
    views: number;
    leads: number;
    followers: number;
    unreadTickets: number;
    kpiByWindow: Record<'7' | '30' | '90', DashboardKpiWindow>;
    actionChecklist: {
        pendingReviewReplies: number;
        profileCompletion: number;
        missingProfileFields: string[];
        hasContactChannel: boolean;
        hasPremiumAccess: boolean;
    };
    salaryBenchmark?: {
        medianMonthlySalary: number | null;
        minMonthlySalary: number | null;
        maxMonthlySalary: number | null;
        pctAboveCityAvg: number | null;
        pctAboveSectorAvg: number | null;
        submissionCount: number;
    } | null;
    proAlerts?: Array<{
        id: string;
        level: 'low' | 'medium' | 'high';
        message: string;
    }>;
};

interface DashboardClientProps {
    stats: DashboardStats | null;
    profile: Profile | null;
    error?: string | null;
    loading?: boolean;
    otherBusinesses?: { id: string, name: string }[];
}

export default function DashboardClient({ stats, profile, error, otherBusinesses = [] }: DashboardClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [timeframe, setTimeframe] = useState<'7' | '30' | '90'>('30');

    const buildDeltaLabel = (current: number, previous: number) => {
        if (previous <= 0) {
            if (current <= 0) return 'stable vs periode precedente';
            return `+${current} vs periode precedente`;
        }
        const diffPercent = ((current - previous) / previous) * 100;
        const rounded = Math.round(diffPercent);
        return `${rounded > 0 ? '+' : ''}${rounded}% vs periode precedente`;
    };

    const handleBusinessSwitch = (businessId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('id', businessId);
        router.replace(`${pathname}?${params.toString()}`);
    };

    if (error || !stats) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-lg text-center space-y-6">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-bold font-headline">Accès Restreint</h1>
                    <p className="text-muted-foreground text-lg">
                        {error || "Nous n'avons pas trouvé votre entreprise associée."}
                    </p>
                    <Button asChild size="lg" className="px-8 font-bold">
                        <Link href="/pour-les-pros">Revendiquer mon entreprise</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const selectedWindow = stats.kpiByWindow[timeframe];
    const ratingValue = selectedWindow.ratingAvg ?? stats.averageRating;
    const ratingPrevious = selectedWindow.ratingAvgPrev ?? stats.averageRating;
    const ratingDelta = ratingValue - ratingPrevious;
    const ratingTrendLabel = `${ratingDelta > 0 ? '+' : ''}${ratingDelta.toFixed(1)} vs periode precedente`;
    const ratingTrendClass = ratingDelta > 0 ? 'text-emerald-600' : ratingDelta < 0 ? 'text-rose-600' : 'text-slate-500';

    const checklistItems = [
        {
            key: 'reviews',
            label: 'Repondre aux avis en attente',
            done: stats.actionChecklist.pendingReviewReplies === 0,
            details: stats.actionChecklist.pendingReviewReplies > 0
                ? `${stats.actionChecklist.pendingReviewReplies} avis attendent une reponse.`
                : 'Aucun avis en attente.',
            cta: stats.actionChecklist.pendingReviewReplies > 0 ? 'Traiter' : 'Voir',
            href: '/dashboard/reviews',
        },
        {
            key: 'profile',
            label: 'Completer le profil entreprise',
            done: stats.actionChecklist.profileCompletion >= 85,
            details: stats.actionChecklist.profileCompletion >= 85
                ? `Profil a ${stats.actionChecklist.profileCompletion}%`
                : `Profil a ${stats.actionChecklist.profileCompletion}%. Champs manquants: ${stats.actionChecklist.missingProfileFields.slice(0, 2).join(', ') || 'a verifier'}.`,
            cta: 'Mettre a jour',
            href: '/dashboard/edit-profile',
        },
        {
            key: 'contact',
            label: 'Activer un canal de contact',
            done: stats.actionChecklist.hasContactChannel,
            details: stats.actionChecklist.hasContactChannel
                ? 'Canal de contact actif.'
                : 'Ajoutez au moins un telephone, site web ou WhatsApp.',
            cta: 'Configurer',
            href: '/dashboard/edit-profile',
        },
    ];
    const pendingChecklistItems = checklistItems.filter((item) => !item.done);
    const primaryChecklistItem = pendingChecklistItems[0] ?? null;

    const statCards = [
        {
            name: 'Nouveaux abonnes',
            value: selectedWindow.newFollowers.toString(),
            icon: Heart,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            trend: buildDeltaLabel(selectedWindow.newFollowers, selectedWindow.newFollowersPrev),
            trendColor: selectedWindow.newFollowers >= selectedWindow.newFollowersPrev ? 'text-rose-600' : 'text-slate-500',
        },
        {
            name: 'Nouveaux avis',
            value: selectedWindow.newReviews.toString(),
            icon: Star,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            trend: buildDeltaLabel(selectedWindow.newReviews, selectedWindow.newReviewsPrev),
            trendColor: selectedWindow.newReviews >= selectedWindow.newReviewsPrev ? 'text-blue-600' : 'text-slate-500',
        },
        {
            name: 'Note moyenne',
            value: ratingValue.toFixed(1),
            icon: TrendingUp,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            trend: ratingTrendLabel,
            trendColor: ratingTrendClass,
        },
        {
            name: 'Vues profil',
            value: selectedWindow.views.toString(),
            icon: Eye,
            color: 'text-slate-600',
            bg: 'bg-slate-50',
            trend: buildDeltaLabel(selectedWindow.views, selectedWindow.viewsPrev),
            trendColor: selectedWindow.views >= selectedWindow.viewsPrev ? 'text-slate-600' : 'text-slate-500',
        },
        {
            name: 'Leads generes',
            value: selectedWindow.leads.toString(),
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            trend: buildDeltaLabel(selectedWindow.leads, selectedWindow.leadsPrev),
            trendColor: selectedWindow.leads >= selectedWindow.leadsPrev ? 'text-blue-600' : 'text-slate-500',
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-16 pt-4">

            {/* Unread Support Alert */}
            {stats.unreadTickets > 0 && (
                <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-none">
                    <CardHeader className="flex flex-row items-center gap-4 py-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg font-bold text-foreground">Nouvelle réponse du support</CardTitle>
                            <p className="text-sm text-muted-foreground">Vous avez {stats.unreadTickets} message(s) non lu(s) de notre équipe d'assistance.</p>
                        </div>
                        <Button asChild className="rounded-xl font-bold">
                            <Link href="/dashboard/support">Consulter</Link>
                        </Button>
                    </CardHeader>
                </Card>
            )}

            {/* Modern SaaS Header */}
            <div className="flex flex-col items-start gap-6 rounded-xl border border-border bg-card p-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground font-headline md:text-4xl">
                            Dashboard
                            {otherBusinesses.length > 1 ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="group h-auto gap-2 px-2 text-3xl font-bold text-primary transition-colors hover:bg-secondary md:text-4xl font-headline">
                                            {stats.business.name}
                                            <ChevronDown className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-64 rounded-md border border-border shadow-sm">
                                        <div className="mb-1 border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Mes Établissements
                                        </div>
                                        {otherBusinesses.map((b) => (
                                            <DropdownMenuItem
                                                key={b.id}
                                                onClick={() => handleBusinessSwitch(b.id)}
                                                className={cn(
                                                    "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors",
                                                    b.id === stats.business.id ? "bg-secondary text-foreground font-semibold" : "text-muted-foreground hover:bg-secondary"
                                                )}
                                            >
                                                <Building2 className={cn("h-4 w-4", b.id === stats.business.id ? "text-primary" : "text-muted-foreground")} />
                                                <span className="truncate">{b.name}</span>
                                                {b.id === stats.business.id && (
                                                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                                                )}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <span className="text-primary">{stats.business.name}</span>
                            )}
                        </h1>
                        {profile?.tier && isPaidTier(profile.tier) && (
                            <Badge className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide" variant="info">
                                <Sparkles className="w-3 h-3 fill-white" />
                                {profile?.tier.toUpperCase()}
                            </Badge>
                        )}
                    </div>
                    <p className="text-base font-medium text-muted-foreground">
                        {profile?.tier && isPaidTier(profile.tier)
                            ? `Propulsé par Avis ${profile.tier.toUpperCase()} • Votre entreprise se démarque.`
                            : "Voici les performances de votre entreprise aujourd'hui."}
                    </p>
                </div>
                <div className="flex flex-col items-start gap-3 lg:items-end">
                    <div className="flex items-center gap-1 rounded-md border border-border bg-secondary/50 p-1">
                        {(['7', '30', '90'] as Array<'7' | '30' | '90'>).map((windowDays) => (
                            <Button
                                key={windowDays}
                                type="button"
                                variant={timeframe === windowDays ? 'default' : 'ghost'}
                                size="sm"
                                className="h-8 rounded-lg px-3 text-xs font-bold"
                                onClick={() => setTimeframe(windowDays)}
                            >
                                {windowDays}j
                            </Button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-3">
                    {(!profile?.tier || !isPaidTier(profile.tier)) && (
                        <Button
                            asChild
                            className="h-11 rounded-md border border-border bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80"
                        >
                            <Link href="/dashboard/premium">
                                <Sparkles className="w-4 h-4 mr-2" />
                                Découvrir Premium
                            </Link>
                        </Button>
                    )}
                    <Button asChild className="h-11 rounded-md font-semibold">
                        <Link href={`/businesses/${stats.business.id}`}>
                            Voir ma page publique <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                    </Button>
                    {stats.actionChecklist.hasPremiumAccess && (
                        <Button asChild variant="outline" className="rounded-xl h-11">
                            <a href={`/api/business/export?businessId=${encodeURIComponent(stats.business.id)}&format=json`}>
                                Export JSON
                            </a>
                        </Button>
                    )}
                    </div>
                </div>
            </div>

            {(stats.proAlerts || []).length > 0 && (
                <Card className="rounded-xl border border-border bg-card shadow-none">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-headline text-foreground">Alertes Pro</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {(stats.proAlerts || []).map((alert) => (
                            <div key={alert.id} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground">
                                {alert.level === 'high' ? <CircleAlert className="h-4 w-4 text-rose-600" /> : <CircleCheckBig className="h-4 w-4 text-amber-600" />}
                                <span>{alert.message}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card className={cn(
                "rounded-2xl border shadow-sm",
                primaryChecklistItem ? "border-amber-200 bg-amber-50/40" : "border-emerald-200 bg-emerald-50/30"
            )}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-headline text-slate-900">
                        {primaryChecklistItem ? 'Prochaine action prioritaire' : 'Priorites sous controle'}
                    </CardTitle>
                    <p className="text-sm text-slate-600">
                        {primaryChecklistItem
                            ? 'Suivez cette action pour augmenter la confiance et la conversion de votre fiche.'
                            : `Toutes les actions critiques sont traitees pour les ${timeframe} derniers jours.`}
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {primaryChecklistItem ? (
                        <div className="rounded-xl border border-amber-200 bg-white p-4">
                            <p className="text-sm font-semibold text-slate-900">{primaryChecklistItem.label}</p>
                            <p className="mt-1 text-xs text-slate-600">{primaryChecklistItem.details}</p>
                            <Button asChild size="sm" className="mt-3 rounded-lg">
                                <Link href={primaryChecklistItem.href}>
                                    {primaryChecklistItem.cta}
                                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-emerald-200 bg-white p-4">
                            <p className="text-sm font-semibold text-emerald-700">Aucune action bloquante detectee</p>
                            <p className="mt-1 text-xs text-slate-600">Vous pouvez maintenant concentrer vos efforts sur la croissance.</p>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline" className="rounded-lg">
                            <Link href="/dashboard/reviews">Repondre aux avis</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="rounded-lg">
                            <Link href="/dashboard/edit-profile">Completer le profil</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="rounded-lg">
                            <Link href={`/businesses/${stats.business.id}`}>Voir la page publique</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm rounded-2xl">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-headline text-slate-900">Checklist operateur</CardTitle>
                    <p className="text-sm text-slate-500">Priorites pour les {timeframe} derniers jours.</p>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                    {checklistItems.map((item) => (
                        <div key={item.key} className={cn(
                            "rounded-xl border p-4",
                            item.done ? "border-emerald-100 bg-emerald-50/40" : "border-amber-100 bg-amber-50/40"
                        )}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    {item.done ? (
                                        <CircleCheckBig className="h-4 w-4 text-emerald-600" />
                                    ) : (
                                        <CircleAlert className="h-4 w-4 text-amber-600" />
                                    )}
                                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "rounded-full text-[10px] uppercase tracking-wide",
                                        item.done ? "border-emerald-200 text-emerald-700" : "border-amber-200 text-amber-700"
                                    )}
                                >
                                    {item.done ? 'ok' : 'action'}
                                </Badge>
                            </div>
                            <p className="mt-2 text-xs text-slate-600">{item.details}</p>
                            <Button asChild size="sm" variant="outline" className="mt-3 h-8 rounded-lg text-xs font-semibold">
                                <Link href={item.href}>{item.cta}</Link>
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Clean Stats Grid */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {statCards.map((stat) => (
                    <Card key={stat.name} className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden group">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-body">
                                {stat.name}
                            </span>
                            <div className={cn("p-2 rounded-xl transition-all group-hover:bg-opacity-100 bg-opacity-80", stat.bg, stat.color)}>
                                <stat.icon className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold font-headline text-slate-900">{stat.value}</div>
                            <p className={cn("text-[10px] font-bold mt-2 flex items-center gap-1 uppercase tracking-wider", stat.trendColor)}>
                                {stat.trend}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {profile?.tier === 'gold' && (
                <Card className="border-amber-200 bg-amber-50/50 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-amber-900 text-xl font-bold flex items-center gap-2">
                            <Crown className="w-5 h-5 text-amber-600" />
                            Benchmark salaires
                        </CardTitle>
                        <p className="text-sm text-amber-800/80">
                            Comparez votre competitivite salariale avec votre ville et votre secteur.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-xl border border-amber-100 bg-white/80 p-3">
                                <p className="text-[10px] uppercase tracking-widest text-amber-700/70 font-bold">Mediane</p>
                                <p className="text-lg font-bold text-amber-900">
                                    {formatCurrency(stats.salaryBenchmark?.medianMonthlySalary)}
                                </p>
                            </div>
                            <div className="rounded-xl border border-amber-100 bg-white/80 p-3">
                                <p className="text-[10px] uppercase tracking-widest text-amber-700/70 font-bold">Plage</p>
                                <p className="text-sm font-bold text-amber-900">
                                    {formatCurrency(stats.salaryBenchmark?.minMonthlySalary)} - {formatCurrency(stats.salaryBenchmark?.maxMonthlySalary)}
                                </p>
                            </div>
                            <div className="rounded-xl border border-amber-100 bg-white/80 p-3">
                                <p className="text-[10px] uppercase tracking-widest text-amber-700/70 font-bold">Vs ville</p>
                                <p className="text-lg font-bold text-amber-900">
                                    {formatPercent(stats.salaryBenchmark?.pctAboveCityAvg)}
                                </p>
                            </div>
                            <div className="rounded-xl border border-amber-100 bg-white/80 p-3">
                                <p className="text-[10px] uppercase tracking-widest text-amber-700/70 font-bold">Vs secteur</p>
                                <p className="text-lg font-bold text-amber-900">
                                    {formatPercent(stats.salaryBenchmark?.pctAboveSectorAvg)}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <p className="text-xs font-semibold text-amber-800/80 uppercase tracking-wider">
                                {stats.salaryBenchmark?.submissionCount || 0} soumissions publiees
                            </p>
                            <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl">
                                <Link href="/dashboard/salary-benchmark">
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    Voir le benchmark
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Reviews Section */}
                <Card className="lg:col-span-2 border-slate-200 bg-white shadow-sm rounded-2xl">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50">
                        <CardTitle className="font-headline text-xl text-slate-900">Derniers Avis Employés</CardTitle>
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 font-bold rounded-lg" asChild>
                            <Link href="/dashboard/reviews">Gérer les avis</Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {stats.recentReviews.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                                    <Star className="w-10 h-10 text-slate-200" />
                                </div>
                                <p className="font-bold text-slate-900">Aucun avis pour l'instant</p>
                                <p className="text-sm mt-1">Encouragez vos employés à partager leur expérience.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {stats.recentReviews.map((review) => (
                                    <div key={review.id} className="group flex flex-col sm:flex-row gap-5 p-6 rounded-2xl bg-white hover:bg-slate-50 transition-all duration-300 border border-slate-100 hover:border-blue-100">
                                        <div className="flex-shrink-0">
                                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100 shadow-sm">
                                                {getAuthorInitials(
                                                    review,
                                                    'pro', // Assuming Pro view
                                                    null,  // Current User (not strictly needed for initials)
                                                    null   // Business id
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-grow space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-base text-slate-900 font-headline">
                                                        {getAuthorDisplayName(
                                                            review,
                                                            'pro',
                                                            null,
                                                            null
                                                        )}
                                                    </h4>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(review.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] font-bold rounded-full border-slate-200 text-slate-600">
                                                    {review.is_anonymous ? 'Anonyme' : 'Profil public'}
                                                </Badge>
                                            </div>
                                            <div className="py-1">
                                                <StarRating rating={review.rating} size={14} readOnly />
                                            </div>
                                            <p className="text-sm text-slate-600 line-clamp-2 italic leading-relaxed font-body">
                                                "{review.content || 'Pas de commentaire.'}"
                                            </p>
                                            <div className="pt-3 flex justify-end">
                                                <Button size="sm" variant="outline" className="text-blue-600 hover:text-white hover:bg-blue-600 h-9 px-4 rounded-xl text-xs font-bold border-blue-100" asChild>
                                                    <Link href="/dashboard/reviews">
                                                        Répondre <ArrowRight className="ml-1.5 w-3 h-3" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Side Info & Actions */}
                <div className="space-y-8">
                    <Card className="border-primary/20 bg-primary/5/20 overflow-hidden relative group rounded-2xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-blue-900 text-lg font-bold flex items-center gap-2 font-headline">
                                <Sparkles className="w-5 h-5 text-blue-600" /> Booster vos résultats
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <p className="text-sm text-blue-900/70 leading-relaxed font-medium">
                                {profile?.tier === 'growth'
                                    ? <>Passez au niveau <span className="font-bold text-blue-700">Business GOLD</span> pour débloquer :</>
                                    : <>Passez au niveau supérieur avec <span className="font-bold text-blue-700">GOLD</span> :</>
                                }
                            </p>
                            <ul className="text-xs space-y-3 text-blue-950 font-semibold">
                                <li className="flex items-center gap-3 bg-white/60 p-2.5 rounded-xl border border-blue-100/50 shadow-sm">
                                    <ShieldCheck className="w-4 h-4 text-blue-600" /> Badge de confiance GOLD
                                </li>
                                <li className="flex items-center gap-3 bg-white/60 p-2.5 rounded-xl border border-blue-100/50 shadow-sm">
                                    <MessageSquare className="w-4 h-4 text-blue-600" /> Communication avec les employés
                                </li>
                                <li className="flex items-center gap-3 bg-white/60 p-2.5 rounded-xl border border-blue-100/50 shadow-sm">
                                    <Star className="w-4 h-4 text-blue-600" /> Meilleure visibilité pour attirer les talents
                                </li>
                            </ul>
                            {!profile?.tier || profile.tier !== 'gold' ? (
                                <Button
                                    asChild
                                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 shadow-xl shadow-blue-600/20"
                                >
                                    <Link href="/dashboard/premium">
                                        {profile?.tier === 'growth' ? "Passer GOLD" : "Découvrir Avis Premium"}
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="outline" className="w-full rounded-xl border-blue-200 text-blue-600 font-bold h-12 pointer-events-none opacity-80">
                                    <Sparkles className="w-4 h-4 mr-2" /> Statut GOLD Actif
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-slate-900 text-white overflow-hidden relative rounded-2xl shadow-xl">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Zap className="w-20 h-20 rotate-12" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-white font-headline text-lg uppercase tracking-widest">Raccourcis</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            <Button variant="secondary" className="w-full justify-start h-12 bg-white/10 text-white font-bold hover:bg-white/20 border-white/10" asChild>
                                <Link href="/dashboard/reviews">
                                    <MessageSquare className="mr-3 w-4 h-4 text-blue-400" /> Répondre aux avis
                                </Link>
                            </Button>
                            <Button variant="secondary" className="w-full justify-start h-12 bg-white/10 text-white font-bold hover:bg-white/20 border-white/10" asChild>
                                <Link href="/dashboard/updates">
                                    <TrendingUp className="mr-3 w-4 h-4 text-blue-400" /> Publier une promotion
                                </Link>
                            </Button>
                            <Button variant="secondary" className="w-full justify-start h-12 bg-white/10 text-white font-bold hover:bg-white/20 border-white/10" asChild>
                                <Link href="/dashboard/edit-profile">
                                    <Eye className="mr-3 w-4 h-4 text-blue-400" /> Éditer mon profil
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}

