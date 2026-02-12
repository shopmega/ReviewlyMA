'use client';

import { Business } from '@/lib/types';
import { CardContent } from '@/components/ui/card';
import { BusinessMap } from '@/components/shared/BusinessMap';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Clock, Phone, Globe, ShieldCheck, Share2, MessageCircle, ExternalLink, MapPin } from 'lucide-react';
import { StarRating } from '@/components/shared/StarRating';
import { RatingDistribution } from '@/components/shared/RatingDistribution';
import { BusinessSubRatings } from '@/components/shared/BusinessSubRatings';
import Link from 'next/link';
import { trackBusinessEvent } from '@/app/actions/analytics';
import { getUserBusinessClaim } from '@/app/actions/claim';
import { AdSlot } from '../shared/AdSlot';
import { useState, useEffect } from 'react';

interface BusinessSidebarProps {
    business: Business;
}

export function BusinessSidebar({ business }: BusinessSidebarProps) {
    const [userClaim, setUserClaim] = useState<any>(null);
    const [loadingClaim, setLoadingClaim] = useState(true);

    useEffect(() => {
        async function checkClaim() {
            try {
                const claim = await getUserBusinessClaim(business.id);
                setUserClaim(claim);
            } catch (err) {
                console.error('Error checking claim:', err);
            } finally {
                setLoadingClaim(false);
            }
        }
        checkClaim();
    }, [business.id]);

    const daysFr = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const todayIndex = new Date().getDay();
    const today = daysFr[todayIndex];

    const handlePhoneClick = () => {
        trackBusinessEvent(business.id, 'phone_click');
    };

    const handleWebsiteClick = () => {
        trackBusinessEvent(business.id, 'website_click');
    };

    const handleWhatsappClick = () => {
        trackBusinessEvent(business.id, 'whatsapp_click');
    };

    const handleAffiliateClick = () => {
        trackBusinessEvent(business.id, 'affiliate_click');
    };

    const displayLocation = business.location || business.address || '';
    const normalizedWebsite = business.website
        ? (business.website.startsWith('http://') || business.website.startsWith('https://')
            ? business.website
            : `https://${business.website}`)
        : null;

    return (
        <div className="sticky top-28 space-y-6">
            {/* Quick Info Card */}
            <div className="glass-card rounded-2xl overflow-hidden p-0 border border-border/50">
                <BusinessMap location={displayLocation} businessName={business.name} />
                <CardContent className="p-6 space-y-6">
                    {/* Contact Info */}
                    <div className="space-y-3">
                        {business.phone && (
                            <a
                                href={`tel:${business.phone}`}
                                onClick={handlePhoneClick}
                                className="flex items-center gap-3 text-sm font-medium text-foreground hover:text-primary transition-all p-4 rounded-xl bg-secondary/30 hover:bg-secondary/60 group border border-transparent hover:border-primary/20"
                            >
                                <div className="p-2 rounded-full bg-background border border-border shadow-sm group-hover:scale-110 transition-transform">
                                    <Phone className="w-4 h-4 text-primary" />
                                </div>
                                <span className="font-bold font-headline">{business.phone}</span>
                            </a>
                        )}
                        {normalizedWebsite && (
                            <a
                                href={normalizedWebsite}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={handleWebsiteClick}
                                className="flex items-center gap-3 text-sm font-medium text-foreground hover:text-primary transition-all p-4 rounded-xl bg-secondary/30 hover:bg-secondary/60 group border border-transparent hover:border-primary/20"
                            >
                                <div className="p-2 rounded-full bg-background border border-border shadow-sm group-hover:scale-110 transition-transform">
                                    <Globe className="w-4 h-4 text-primary" />
                                </div>
                                <span className="font-bold font-headline">Visiter le site web</span>
                            </a>
                        )}

                        {displayLocation && (
                            <div className="flex items-start gap-4 text-sm font-medium text-foreground p-4 rounded-xl bg-secondary/30 border border-transparent">
                                <div className="p-2 rounded-full bg-background border border-border shadow-sm shrink-0">
                                    <MapPin className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Adresse</span>
                                    <span className="font-bold font-headline leading-tight">{displayLocation}</span>
                                    {business.quartier && business.city && (
                                        <span className="text-xs text-muted-foreground">{business.quartier}, {business.city}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* PREMIUM FEATURES: WhatsApp & Affiliate - GOLD TIER ONLY */}
                        {business.tier === 'gold' && (
                            <div className="pt-2 space-y-3">
                                {business.whatsapp_number && (
                                    <a
                                        href={`https://wa.me/${business.whatsapp_number.replace(/\s+/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={handleWhatsappClick}
                                        className="flex items-center gap-3 text-sm text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition-all p-4 rounded-xl group shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <MessageCircle className="w-5 h-5 text-emerald-100 group-hover:text-white" />
                                        <span className="font-bold font-headline">WhatsApp Direct</span>
                                    </a>
                                )}

                                {business.affiliate_link && (
                                    <a
                                        href={business.affiliate_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={handleAffiliateClick}
                                        className="flex items-center gap-3 text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 transition-all p-4 rounded-xl group shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <ExternalLink className="w-5 h-5 text-indigo-100 group-hover:text-white" />
                                        <span className="font-bold font-headline">
                                            {business.affiliate_cta || (business.category === 'Hôtels' ? 'Réserver sur Booking' : 'Postuler maintenant')}
                                        </span>
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    <Separator className="bg-border/50" />

                    {/* Hours */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Horaires d'ouverture</h3>
                        </div>
                        {business.hours && business.hours.length > 0 ? (
                            <ul className="space-y-2.5 text-sm">
                                {business.hours.map(hour => {
                                    const isToday = hour.day.toLowerCase() === today;
                                    return (
                                        <li key={hour.day} className={`flex justify-between items-center py-1.5 ${isToday ? 'font-bold text-primary font-headline border-y border-primary/10 bg-primary/5 px-2 rounded-lg' : 'text-muted-foreground px-2'}`}>
                                            <span className="capitalize">{hour.day}</span>
                                            <span className={hour.isOpen ? "font-medium text-foreground" : "text-rose-500"}>
                                                {hour.isOpen ? `${hour.open} – ${hour.close}` : 'Fermé'}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-xs text-muted-foreground italic bg-secondary/50 p-3 rounded-lg text-center">Horaires non renseignés</p>
                        )}
                    </div>


                </CardContent>
            </div>

            {/* Reputaton Card */}
            <div className="glass-card p-6 rounded-2xl border border-border/50 space-y-6">
                <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-6">Réputation & Avis</h3>
                    <div className="flex items-center gap-6">
                        <div className="text-5xl font-black font-headline text-transparent bg-clip-text bg-gradient-to-br from-primary to-violet-600 leading-none">
                            {business.overallRating.toFixed(1)}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <StarRating rating={business.overallRating} readOnly size={18} />
                            <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">{business.reviews.length} AVIS VÉRIFIÉS</span>
                        </div>
                    </div>
                </div>

                <Separator className="bg-border/50" />

                <RatingDistribution reviews={business.reviews} />

                <BusinessSubRatings reviews={business.reviews} />

                {!business.owner_id && !loadingClaim && (
                    <>
                        {userClaim ? (
                            <Button variant="outline" className="w-full text-xs text-amber-600 bg-amber-50 border-amber-200 mt-4 rounded-xl cursor-default hover:bg-amber-50">
                                <ShieldCheck className="w-4 h-4 mr-2" />
                                {userClaim.status === 'pending' ? 'Demande en cours' : 'Déjà revendiqué'}
                            </Button>
                        ) : (
                            <Button asChild variant="ghost" className="w-full text-xs text-primary hover:bg-primary/10 mt-4 border border-primary/20 rounded-xl">
                                <Link href={`/claim/new?businessId=${business.id}`}>
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                    C'est votre entreprise ?
                                </Link>
                            </Button>
                        )}
                    </>
                )}
                {loadingClaim && !business.owner_id && (
                    <div className="h-10 w-full bg-secondary/50 animate-pulse rounded-xl mt-4" />
                )}
            </div>

            {/* Sidebar Ad Slot */}
            <AdSlot slot="business-sidebar-ad" className="min-h-[250px] rounded-2xl overflow-hidden" />
        </div>
    );
}
