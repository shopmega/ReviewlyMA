'use client';

import { Business } from '@/lib/types';
import { CardContent } from '@/components/ui/card';
import { BusinessMap } from '@/components/shared/BusinessMap';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Clock, Phone, Globe, ShieldCheck, Share2, MessageCircle, ExternalLink, MapPin, GraduationCap, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ShareButton } from '@/components/shared/ShareButton';
import { isPaidTier } from '@/lib/tier-utils';
import { StarRating } from '@/components/shared/StarRating';
import { RatingDistribution } from '@/components/shared/RatingDistribution';
import { BusinessSubRatings } from '@/components/shared/BusinessSubRatings';
import Link from 'next/link';
import { trackBusinessEvent } from '@/app/actions/analytics';
import { getUserBusinessClaim } from '@/app/actions/claim';
import { AdSlot } from '../shared/AdSlot';
import { useState, useEffect } from 'react';

import { getSiteSettings, SiteSettings } from '@/lib/data';
import { useI18n } from '@/components/providers/i18n-provider';

interface BusinessSidebarProps {
    business: Business;
    settings?: SiteSettings;
}

export function BusinessSidebar({ business, settings }: BusinessSidebarProps) {
    const { t } = useI18n();
    const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(settings || null);
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

    useEffect(() => {
        if (!settings) {
            getSiteSettings().then(setSiteSettings);
        }
    }, [settings]);

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
                                <span className="font-bold font-headline">{t('business.sidebar.visitWebsite', 'Visiter le site web')}</span>
                            </a>
                        )}

                        {displayLocation && (
                            <div className="flex items-start gap-4 text-sm font-medium text-foreground p-4 rounded-xl bg-secondary/30 border border-transparent">
                                <div className="p-2 rounded-full bg-background border border-border shadow-sm shrink-0">
                                    <MapPin className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('business.sidebar.address', 'Adresse')}</span>
                                    <span className="font-bold font-headline leading-tight">{displayLocation}</span>
                                    {business.quartier && business.city && (
                                        <span className="text-xs text-muted-foreground">{business.quartier}, {business.city}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* PREMIUM FEATURES: WhatsApp & Affiliate - ALL PAID TIERS (Growth & Gold) */}
                        {isPaidTier(business.tier || 'standard') && (
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
                                            {business.affiliate_cta || (business.category === 'Hôtels' ? t('business.sidebar.bookNow', 'Reserver sur Booking') : t('business.sidebar.applyNow', 'Postuler maintenant'))}
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
                            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">{t('business.sidebar.hours', "Horaires d'ouverture")}</h3>
                        </div>
                        {business.hours && business.hours.length > 0 ? (
                            <ul className="space-y-2.5 text-sm">
                                {business.hours.map(hour => {
                                    const isToday = hour.day.toLowerCase() === today;
                                    return (
                                        <li key={hour.day} className={`flex justify-between items-center py-1.5 ${isToday ? 'font-bold text-primary font-headline border-y border-primary/10 bg-primary/5 px-2 rounded-lg' : 'text-muted-foreground px-2'}`}>
                                            <span className="capitalize">{hour.day}</span>
                                            <span className={hour.isOpen ? "font-medium text-foreground" : "text-rose-500"}>
                                                {hour.isOpen ? `${hour.open} - ${hour.close}` : t('business.hero.closed', 'Ferme')}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-xs text-muted-foreground italic bg-secondary/50 p-3 rounded-lg text-center">{t('business.sidebar.hoursUnknown', 'Horaires non renseignes')}</p>
                        )}
                    </div>


                </CardContent>
            </div>

            {/* Reputaton Card */}
            <div className="glass-card p-6 rounded-2xl border border-border/50 space-y-6">
                <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-6">{t('business.sidebar.reputation', 'Reputation & avis')}</h3>
                    <div className="flex items-center gap-6">
                        {business.overallRating > 0 ? (
                            <>
                                <div className="text-5xl font-black font-headline text-transparent bg-clip-text bg-gradient-to-br from-primary to-violet-600 leading-none">
                                    {business.overallRating.toFixed(1)}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <StarRating rating={business.overallRating} readOnly size={18} />
                                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">{business.reviews.length} {t('business.sidebar.verifiedReviews', 'AVIS VERIFIES')}</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="text-3xl font-black font-headline text-muted-foreground/30">
                                        N/A
                                    </div>
                                    <StarRating rating={0} readOnly size={16} />
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed font-medium capitalize">
                                    {t('business.sidebar.noReviewsYet', "Pas encore d'avis pour cet etablissement.")}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {business.reviews.length > 0 && (
                    <>
                        <Separator className="bg-border/50" />
                        <RatingDistribution reviews={business.reviews} />
                        <BusinessSubRatings reviews={business.reviews} />
                    </>
                )}

                {!business.owner_id && !loadingClaim && (
                    <>
                        {userClaim ? (
                            <Button variant="outline" className="w-full text-xs text-amber-600 bg-amber-50 border-amber-200 mt-4 rounded-xl cursor-default hover:bg-amber-50">
                                <ShieldCheck className="w-4 h-4 mr-2" />
                                {userClaim.status === 'pending' ? t('business.sidebar.claimPending', 'Demande en cours') : t('business.sidebar.claimedAlready', 'Deja revendique')}
                            </Button>
                        ) : (
                            <Button asChild variant="ghost" className="w-full text-xs text-primary hover:bg-primary/10 mt-4 border border-primary/20 rounded-xl">
                                <Link href={`/claim/new?businessId=${business.id}`}>
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                    {t('business.sidebar.isYourBusiness', "C'est votre entreprise ?")}
                                </Link>
                            </Button>
                        )}
                    </>
                )}
                {loadingClaim && !business.owner_id && (
                    <div className="h-10 w-full bg-secondary/50 animate-pulse rounded-xl mt-4" />
                )}
            </div>

            {/* Salarie.ma Integration Widget */}
            <div className="relative group overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-primary/5 p-6 space-y-4">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-20 h-20 text-indigo-500" />
                </div>

                <div className="relative z-10 space-y-2">
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[10px] font-black uppercase tracking-tighter">{t('business.sidebar.employeeTools', 'Outils employes')}</Badge>
                    <h3 className="text-lg font-bold font-headline text-foreground leading-tight">{t('business.sidebar.knowYourRights', 'Connaissez-vous vos droits ?')}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('business.sidebar.rightsDesc', 'Calculez votre salaire net, vos indemnites de depart ou generez vos documents juridiques en quelques clics.')}
                    </p>
                </div>

                <div className="relative z-10 grid grid-cols-1 gap-2 pt-2">
                    <a
                        href={siteSettings?.partner_app_url || "https://monrh.vercel.app/simulateurs"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-border hover:border-indigo-500/50 hover:shadow-md transition-all group/item"
                    >
                        <span className="text-xs font-bold text-foreground">{t('business.sidebar.salarySimulator', 'Simulateur de salaire')}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover/item:text-indigo-500 group-hover/item:translate-x-1 transition-all" />
                    </a>
                    <a
                        href={`${siteSettings?.partner_app_url || "https://monrh.vercel.app"}/documents`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-border hover:border-indigo-500/50 hover:shadow-md transition-all group/item"
                    >
                        <span className="text-xs font-bold text-foreground">{t('business.sidebar.documentTemplates', 'Modeles de documents')}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover/item:text-indigo-500 group-hover/item:translate-x-1 transition-all" />
                    </a>
                </div>

                <div className="relative z-10 pt-2 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5">
                        {t('business.sidebar.poweredBy', 'Propulse par')} <span className="font-bold text-indigo-600">{siteSettings?.partner_app_name || "MOR RH"}</span>
                    </span>
                </div>
            </div>

            {/* Sidebar Ad Slot */}
            <AdSlot slot="business-sidebar-ad" className="min-h-[250px] rounded-2xl overflow-hidden" />
        </div>
    );
}
