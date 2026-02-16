'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { isPaidTier, hasTierAccess } from '@/lib/tier-utils';
import { SubscriptionTier } from '@/lib/types';

interface PremiumFeatureGateProps {
    children: React.ReactNode;
    level?: SubscriptionTier;
    fallback?: React.ReactNode;
    className?: string;
    title?: string;
    description?: string;
    inline?: boolean;
}

/**
 * A reusable component to gate features based on the business subscription tier.
 */
export function PremiumFeatureGate({
    children,
    level = 'growth', // default to at least growth
    fallback,
    className,
    title,
    description,
    inline = false,
}: PremiumFeatureGateProps) {
    const { profile, loading } = useBusinessProfile();

    if (loading) {
        return <div className="animate-pulse bg-muted rounded-lg h-32 w-full" />;
    }

    const currentTier = profile?.tier || 'standard';

    const canAccess = () => {
        if (!currentTier) return false;
        return hasTierAccess(level, currentTier);
    };

    if (canAccess()) {
        return <>{children}</>;
    }

    // If fallback is provided, use it
    if (fallback) {
        return <>{fallback}</>;
    }

    // Default fallback UI
    if (inline) {
        return (
            <span className={cn("inline-flex items-center gap-1 text-amber-600 font-bold text-xs uppercase cursor-help", className)}>
                <Lock className="w-3 h-3" />
                {level === 'gold' ? 'Gold' : 'Premium'}
            </span>
        );
    }

    return (
        <Card className={cn(
            "border-amber-200 bg-amber-50/30 backdrop-blur-sm overflow-hidden relative group p-6 text-center flex flex-col items-center justify-center ring-1 ring-amber-200/50",
            className
        )}>
            <div className="bg-amber-100 p-3 rounded-full mb-4 group-hover:scale-110 transition-transform">
                <Lock className="h-6 w-6 text-amber-600" />
            </div>

            <h3 className="font-bold text-lg mb-1 text-amber-900">
                {title || (level === 'gold' ? 'Fonctionnalité GOLD' : 'Fonctionnalité Premium')}
            </h3>

            <p className="text-sm text-amber-800/70 mb-6 max-w-[280px]">
                {description || (level === 'gold'
                    ? "Débloquez cette fonctionnalité avancée avec le plan Business GOLD."
                    : "Passez au statut Premium pour accéder à cet outil.")
                }
            </p>

            <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-full px-8 shadow-lg shadow-amber-500/20">
                <Link href="/dashboard/premium">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Mettre à jour
                </Link>
            </Button>
        </Card>
    );
}
