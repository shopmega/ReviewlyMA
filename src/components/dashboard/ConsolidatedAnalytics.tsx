'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getConsolidatedAnalytics } from '@/app/actions/analytics';
import { Store, Star, Eye, Users, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ConsolidatedAnalyticsProps {
    businessIds: string[];
}

type Stats = {
    totalBusinesses: number;
    totalReviews: number;
    avgRating: number;
    totalViews: number;
    totalLeads: number;
};

export default function ConsolidatedAnalytics({ businessIds }: ConsolidatedAnalyticsProps) {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            if (businessIds.length === 0) {
                setLoading(false);
                return;
            }
            const data = await getConsolidatedAnalytics(businessIds);
            setStats(data);
            setLoading(false);
        }
        fetchStats();
    }, [businessIds]);

    if (loading) {
        return <Skeleton className="w-full h-40 rounded-xl" />;
    }

    if (!stats) return null;

    const cards = [
        {
            title: 'Total Établissements',
            value: stats.totalBusinesses,
            icon: Store,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            title: 'Avis Total',
            value: stats.totalReviews,
            icon: Star,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10'
        },
        {
            title: 'Note Moyenne (Global)',
            value: stats.avgRating.toFixed(1),
            icon: TrendingUp,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10'
        },
        {
            title: 'Vues Totales',
            value: stats.totalViews,
            icon: Eye,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        },
        {
            title: 'Leads Totaux',
            value: stats.totalLeads,
            icon: Users,
            color: 'text-pink-500',
            bg: 'bg-pink-500/10'
        }
    ];

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold font-headline flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Performance Globale du Groupe
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {cards.map((card) => (
                    <Card key={card.title} className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                                {card.title}
                            </CardTitle>
                            <div className={`p-2 rounded-full ${card.bg}`}>
                                <card.icon className={`h-4 w-4 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl font-bold">{card.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
