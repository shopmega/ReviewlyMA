'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, Star, User, Flag, ShieldCheck, Clock } from 'lucide-react';
import { getRecentActivity, ActivityEvent } from '@/app/actions/admin-activity';
import { ActivityFeedSkeleton } from './AdminSkeleton';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const iconMap = {
    star: <Star className="h-4 w-4 text-amber-500" />,
    user: <User className="h-4 w-4 text-blue-500" />,
    report: <Flag className="h-4 w-4 text-destructive" />,
    claim: <ShieldCheck className="h-4 w-4 text-emerald-500" />,
};

export function ActivityFeed() {
    const [activities, setActivities] = useState<ActivityEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await getRecentActivity();
                setActivities(data);
            } catch (error) {
                console.error('Failed to fetch activity:', error);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <ActivityFeedSkeleton />;

    return (
        <Card className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/30">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-headline flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Activité Récente
                        </CardTitle>
                        <CardDescription>Flux d'activité en temps réel sur la plateforme</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                    {activities.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            Aucune activité récente.
                        </div>
                    ) : (
                        activities.map((item) => (
                            <div key={item.id} className="p-4 hover:bg-muted/30 transition-colors group">
                                <div className="flex gap-4">
                                    <div className="h-10 w-10 rounded-full bg-background border border-border/50 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                        {iconMap[item.icon_type as keyof typeof iconMap] || <Activity className="h-4 w-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-bold leading-tight break-words line-clamp-2">{item.title}</p>
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 mt-0.5">
                                                <Clock className="h-3 w-3" />
                                                <span className="whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: fr })}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
