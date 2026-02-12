'use client';

import { Business } from '@/lib/types';
import { BusinessCover } from '@/components/shared/BusinessCover';
import { BusinessLogo } from '@/components/shared/BusinessLogo';
import { StarRating } from '@/components/shared/StarRating';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Zap, MapPin, Clock, Flag, ShieldCheck, Sparkles } from 'lucide-react';
import { MediaReportDialog } from '@/components/shared/MediaReportDialog';
import { BusinessReportDialog } from '@/components/shared/BusinessReportDialog';
import { BusinessPageActions } from '@/components/shared/BusinessPageActions';
import { useMemo, useEffect } from 'react';
import { trackBusinessEvent } from '@/app/actions/analytics';

interface BusinessHeroProps {
    business: Business;
    isFollowing?: boolean;
}

export function BusinessHero({ business, isFollowing = false }: BusinessHeroProps) {
    const { isOpen, todayHours, hasHours } = useMemo(() => {
        const daysFr = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        const todayIndex = new Date().getDay();
        const today = daysFr[todayIndex];

        const todayHours = business.hours?.find(h => h.day.toLowerCase() === today);

        // Check if business has working hours data at all
        const hasHours = business.hours && business.hours.length > 0;

        // Get current time in HH:mm format (local server time)
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        const isOpen = todayHours?.isOpen &&
            todayHours.open <= currentTime &&
            todayHours.close > currentTime;

        return { isOpen, todayHours, hasHours };
    }, [business.hours]);

    return (
        <div className="relative w-full h-[38vh] md:h-[48vh] min-h-[340px] md:min-h-[420px] flex items-end group shadow-2xl">
            <div className="absolute inset-0 z-0 overflow-hidden">
                <BusinessCover
                    business={business}
                    alt={business.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority
                />

                {/* Premium Gradient Overlay - More contrast for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/20 to-transparent opacity-95 z-10" />
            </div>

            {/* Hero Content Overlay - Better padding for mobile */}
            <div className="relative z-20 container mx-auto px-4 md:px-6 pb-6 md:pb-12 pt-24 w-full mt-auto">
                <div className="flex flex-col lg:flex-row items-center lg:items-end gap-4 md:gap-6 justify-between text-center lg:text-left">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-end w-full">
                        {/* Integrated Logo - More compact on mobile */}
                        <div className="shrink-0 relative z-30">
                            <div className="p-1 bg-background/80 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/20 group/logo overflow-hidden">
                                <BusinessLogo
                                    logo={business.logo}
                                    businessName={business.name}
                                    width={80}
                                    height={80}
                                    className="rounded-xl w-20 h-20 md:w-32 md:h-32 object-cover transition-transform duration-500 group-hover/logo:scale-110"
                                    priority
                                />
                            </div>
                        </div>

                        <div className="space-y-2 md:space-y-3 max-w-4xl relative z-10 w-full">
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 sm:gap-2">
                                <Badge variant="secondary" className="backdrop-blur-md bg-primary/20 text-primary-foreground border border-primary/20 text-xs py-0.5">
                                    {business.category}
                                </Badge>
                                {hasHours && (
                                    isOpen ? (
                                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10 backdrop-blur-sm text-xs py-0.5">Ouvert</Badge>
                                    ) : (
                                        <Badge variant="outline" className="border-rose-500/50 text-rose-400 bg-rose-500/10 backdrop-blur-sm text-xs py-0.5">Fermé</Badge>
                                    )
                                )}
                                {business.is_claimed && (
                                    <Badge variant="default" className="bg-blue-500/80 hover:bg-blue-600 border-none backdrop-blur-sm shadow-sm text-xs py-0.5">
                                        <ShieldCheck className="w-3 h-3 inline mr-1" />
                                        <span>Vérifié</span>
                                    </Badge>
                                )}
                            </div>

                            <h1 className="text-3xl md:text-6xl font-black font-headline leading-tight tracking-tight text-foreground">
                                {business.name}
                            </h1>

                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 md:gap-4 text-xs md:text-sm font-medium pt-1">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-0.5 text-yellow-500">
                                        {[...Array(5)].map((_, i) => (
                                            <Sparkles
                                                key={i}
                                                className={`w-3.5 h-3.5 md:w-4 md:h-4 ${i < Math.round(business.overallRating) ? 'fill-current' : 'text-muted-foreground/30 fill-muted-foreground/10'}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="font-bold text-foreground text-base md:text-lg">{business.overallRating.toFixed(1)}</span>
                                    <span className="text-muted-foreground underline underline-offset-4 decoration-muted-foreground/30">{business.reviews.length} avis</span>
                                </div>

                                <div className="hidden sm:block w-1 h-1 bg-muted-foreground/30 rounded-full" />

                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <MapPin className="w-3.5 h-3.5 text-primary" />
                                    {business.city || business.location}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 w-full lg:w-auto relative z-10">
                        {/* Mobile Signal Button Integrated */}
                        <div className="lg:hidden">
                            <BusinessReportDialog
                                businessId={business.id}
                                businessName={business.name}
                                trigger={
                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full bg-secondary/50 border border-border/50 backdrop-blur-md text-foreground/60 transition-all hover:bg-secondary">
                                        <Flag className="h-4 w-4" />
                                    </Button>
                                }
                            />
                        </div>
                        <BusinessPageActions business={business} isFollowing={isFollowing} />
                    </div>
                </div>
            </div>
        </div>
    );
}
