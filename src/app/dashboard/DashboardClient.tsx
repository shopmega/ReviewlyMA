'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Star, TrendingUp, AlertCircle, MessageSquare, ArrowRight, Zap, Sparkles, ShieldCheck, Users, Heart, ChevronDown, Building2, Loader2, BarChart3, Crown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StarRating } from '@/components/shared/StarRating';
import { cn } from '@/lib/utils';
import { getAuthorDisplayName, getAuthorInitials } from '@/lib/utils/anonymous-reviews';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
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
    salaryBenchmark?: {
        medianMonthlySalary: number | null;
        minMonthlySalary: number | null;
        maxMonthlySalary: number | null;
        pctAboveCityAvg: number | null;
        pctAboveSectorAvg: number | null;
        submissionCount: number;
    } | null;
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
    const [isVerified, setIsVerified] = useState(false);
    const [isValidating, setIsValidating] = useState(true);

    // Client-side authentication verification
    useEffect(() => {
        async function verifyAccess() {
            try {
                const supabase = createClient();
                const { data: { user }, error: authError } = await supabase.auth.getUser();

                if (authError || !user) {
                    console.error('DashboardClient: No authenticated user found');
                    router.push('/login');
                    return;
                }

                // Verify that the user has legitimate access to this data
                if (!stats || !profile) {
                    console.error('DashboardClient: No valid data provided');
                    return;
                }

                // Additional verification: ensure user has access to the business data
                if (stats.business?.id) {
                    const [{ data: userBusinesses }, { data: approvedClaims }] = await Promise.all([
                        supabase
                            .from('user_businesses')
                            .select('business_id')
                            .eq('user_id', user.id),
                        supabase
                            .from('business_claims')
                            .select('business_id')
                            .eq('user_id', user.id)
                            .eq('status', 'approved')
                    ]);

                    const hasBusinessAccess =
                        userBusinesses?.some((ub) => ub.business_id === stats.business.id) ||
                        approvedClaims?.some((claim) => claim.business_id === stats.business.id) ||
                        profile?.business_id === stats.business.id;

                    if (!hasBusinessAccess) {
                        console.error('DashboardClient: User does not have access to this business data');
                        router.push('/dashboard');
                        return;
                    }
                }

                setIsVerified(true);
            } catch (error) {
                console.error('DashboardClient: Verification error:', error);
                router.push('/login');
            } finally {
                setIsValidating(false);
            }
        }

        verifyAccess();
    }, [stats, profile, router]);

    const handleBusinessSwitch = (businessId: string) => {
        window.location.href = `/dashboard?id=${businessId}`;
    };

    // Show loading state during verification
    if (isValidating) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Vérification de sécurité...</p>
                </div>
            </div>
        );
    }

    // Don't render if verification failed
    if (!isVerified) {
        return null; // Redirect will happen in useEffect
    }

    if (error || !stats) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-lg text-center space-y-6">
                    <div className="mx-auto w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-bold font-headline">Accès Restreint</h1>
                    <p className="text-muted-foreground text-lg">
                        {error || "Nous n'avons pas trouvé votre entreprise associée."}
                    </p>
                    <Button asChild size="lg" className="rounded-full font-bold px-8">
                        <Link href="/pour-les-pros">Revendiquer mon entreprise</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const statCards = [
        {
            name: 'Abonnés',
            value: stats.followers.toString(),
            icon: Heart,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            trend: stats.followers > 0 ? 'Fidélisation active' : 'À développer',
            trendColor: 'text-rose-600'
        },
        {
            name: 'Avis reçus',
            value: stats.totalReviews.toString(),
            icon: Star,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            trend: stats.totalReviews > 0 ? '+ Nouveau avis' : 'En attente',
            trendColor: 'text-blue-600'
        },
        {
            name: 'Note moyenne',
            value: stats.averageRating.toFixed(1),
            icon: TrendingUp,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            trend: stats.averageRating >= 4 ? 'Excellente' : 'À améliorer',
            trendColor: 'text-emerald-600'
        },
        {
            name: 'Vues de l\'entreprise',
            value: stats.views.toString(),
            icon: Eye,
            color: 'text-slate-600',
            bg: 'bg-slate-50',
            trend: 'Total vues',
            trendColor: 'text-slate-500'
        },
        {
            name: 'Leads générés',
            value: stats.leads.toString(),
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            trend: 'Clics & Contacts',
            trendColor: 'text-blue-600'
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-16 pt-4">

            {/* Unread Support Alert */}
            {stats.unreadTickets > 0 && (
                <Card className="border-blue-200 bg-blue-50 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center gap-4 py-4">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 animate-bounce">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg font-bold text-blue-900">Nouvelle réponse du support</CardTitle>
                            <p className="text-sm text-blue-700">Vous avez {stats.unreadTickets} message(s) non lu(s) de notre équipe d'assistance.</p>
                        </div>
                        <Button asChild className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold">
                            <Link href="/dashboard/support">Consulter</Link>
                        </Button>
                    </CardHeader>
                </Card>
            )}

            {/* Modern SaaS Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl md:text-4xl font-bold font-headline text-slate-900 tracking-tight flex items-center gap-2">
                            Dashboard
                            {otherBusinesses.length > 1 ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="text-blue-600 hover:bg-blue-50 px-2 h-auto text-3xl md:text-4xl font-bold font-headline transition-colors flex items-center gap-2 group">
                                            {stats.business.name}
                                            <ChevronDown className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-64 rounded-xl shadow-xl border-slate-200">
                                        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">
                                            Mes Établissements
                                        </div>
                                        {otherBusinesses.map((b) => (
                                            <DropdownMenuItem
                                                key={b.id}
                                                onClick={() => handleBusinessSwitch(b.id)}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg transition-colors",
                                                    b.id === stats.business.id ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                                                )}
                                            >
                                                <Building2 className={cn("w-4 h-4", b.id === stats.business.id ? "text-blue-600" : "text-slate-400")} />
                                                <span className="truncate">{b.name}</span>
                                                {b.id === stats.business.id && (
                                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                                                )}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <span className="text-blue-600">{stats.business.name}</span>
                            )}
                        </h1>
                        {profile?.tier && isPaidTier(profile.tier) && (
                            <Badge className="bg-blue-600 text-white border-none px-3 py-1 rounded-full flex gap-1.5 items-center shadow-lg shadow-blue-600/20 text-[10px] uppercase font-bold tracking-widest">
                                <Sparkles className="w-3 h-3 fill-white" />
                                {profile?.tier.toUpperCase()}
                            </Badge>
                        )}
                    </div>
                    <p className="text-slate-500 text-base font-medium">
                        {profile?.tier && isPaidTier(profile.tier)
                            ? `Propulsé par Avis ${profile.tier.toUpperCase()} • Votre entreprise se démarque.`
                            : "Voici les performances de votre entreprise aujourd'hui."}
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    {(!profile?.tier || !isPaidTier(profile.tier)) && (
                        <Button
                            asChild
                            className="rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold border border-blue-100 h-11"
                        >
                            <Link href="/dashboard/premium">
                                <Sparkles className="w-4 h-4 mr-2" />
                                Découvrir Premium
                            </Link>
                        </Button>
                    )}
                    <Button asChild className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold shadow-xl h-11">
                        <Link href={`/businesses/${stats.business.id}`}>
                            Voir ma page publique <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Clean Stats Grid */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {statCards.map((stat, i) => (
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
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-bold rounded-full">VÉRIFIÉ</Badge>
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
                    <Card className="border-blue-200 bg-blue-50/20 overflow-hidden relative group rounded-2xl">
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
