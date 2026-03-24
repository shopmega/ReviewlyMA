'use client';

import Link from 'next/link';
import {
    Pencil,
    MessageSquare,
    Briefcase,
    MessageCircle,
    ExternalLink,
    Flag,
    ShieldCheck,
    Wallet,
    Star,
    BarChart3,
} from 'lucide-react';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { Button } from '@/components/ui/button';
import { ContactBusinessDialog } from '@/components/shared/ContactBusinessDialog';
import { ShareButton } from '@/components/shared/ShareButton';
import { FollowButton } from '@/components/shared/FollowButton';
import { BusinessReportDialog } from '@/components/shared/BusinessReportDialog';
import { Business } from '@/lib/types';
import { isPaidTier } from '@/lib/tier-utils';
import { analytics } from '@/lib/analytics';
import { useI18n } from '@/components/providers/i18n-provider';

interface BusinessPageActionsProps {
    business: Business;
    isFollowing: boolean;
}

export function BusinessPageActions({ business, isFollowing }: BusinessPageActionsProps) {
    const { businessId: userBusinessId, loading } = useBusinessProfile();
    const { t } = useI18n();
    const ctaExperiment = 'business_profile_actions_v1';

    const isOwner = !loading && userBusinessId === business.id;
    const canClaimBusiness = !isOwner && !business.owner_id && !business.is_claimed;

    const trackBusinessCta = (ctaId: string, placement: string, extra: Record<string, any> = {}) => {
        analytics.trackCtaClick(
            ctaId,
            placement,
            'business_profile',
            'business_profile_action_bar',
            ctaExperiment,
            business.id,
            extra
        );
    };

    return (
        <div className="flex w-full flex-wrap items-center justify-center gap-2 lg:justify-start lg:mt-0">
            {isOwner ? (
                <Button variant="default" className="h-11 px-6 rounded-full font-bold shadow-sm max-sm:flex-1 max-sm:min-w-[140px]" asChild>
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        {t('businessActions.manage', 'Gerer')}
                    </Link>
                </Button>
            ) : (
                <>
                    <Button className="h-11 px-6 rounded-full font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 max-sm:flex-1 max-sm:min-w-[140px]" asChild>
                        <Link href={`/businesses/${business.id}/review`} className="flex items-center gap-2" onClick={() => trackBusinessCta('write_review', 'action_bar_primary')}>
                            <Pencil className="w-4 h-4" />
                            <span>{t('businessActions.writeReview', 'Donner mon avis')}</span>
                        </Link>
                    </Button>

                    <Button variant="outline" className="h-11 px-6 rounded-full font-semibold max-sm:flex-1 max-sm:min-w-[140px]" asChild>
                        <Link href={`/businesses/${business.id}?tab=salaries&shareSalary=1#salaries`} className="flex items-center gap-2" onClick={() => trackBusinessCta('share_salary', 'action_bar_secondary')}>
                            <Wallet className="w-4 h-4" />
                            <span>{t('businessActions.shareSalary', 'Partager salaire')}</span>
                        </Link>
                    </Button>

                    <Button variant="outline" className="h-11 px-6 rounded-full font-semibold max-sm:flex-1 max-sm:min-w-[140px]" asChild>
                        <Link href={`/businesses/${business.id}?tab=reviews#insights`} className="flex items-center gap-2" onClick={() => trackBusinessCta('view_reviews', 'action_bar_secondary')}>
                            <Star className="w-4 h-4" />
                            <span>{t('businessActions.viewReviews', 'Voir avis')}</span>
                        </Link>
                    </Button>

                    <Button variant="outline" className="h-11 px-6 rounded-full font-semibold max-sm:flex-1 max-sm:min-w-[140px]" asChild>
                        <Link href={`/businesses/${business.id}?tab=salaries#salaries`} className="flex items-center gap-2" onClick={() => trackBusinessCta('view_salaries', 'action_bar_secondary')}>
                            <BarChart3 className="w-4 h-4" />
                            <span>{t('businessActions.viewSalaries', 'Voir salaires')}</span>
                        </Link>
                    </Button>

                    {canClaimBusiness && (
                        <Button variant="ghost" className="h-11 px-6 rounded-full border border-primary/30 text-primary hover:bg-primary/5 max-sm:flex-1 max-sm:min-w-[140px]" asChild>
                            <Link href={`/claim/new?businessId=${business.id}`} className="flex items-center gap-2" onClick={() => trackBusinessCta('claim_listing', 'action_bar_secondary')}>
                                <ShieldCheck className="w-4 h-4" />
                                <span>{t('businessActions.claim', 'Revendiquer cette fiche')}</span>
                            </Link>
                        </Button>
                    )}

                    {isPaidTier(business.tier || 'standard') && (
                        <>
                            {business.whatsapp_number && (
                                <Button className="h-11 px-6 rounded-full font-bold bg-[#25D366] text-white hover:bg-[#20bd5a] shadow-lg shadow-green-900/20 transition-transform hover:scale-105 active:scale-95 border border-white/10 max-sm:flex-1 max-sm:min-w-[140px]" asChild>
                                    <Link
                                        href={`https://wa.me/${business.whatsapp_number.replace(/\s+/g, '').replace(/^0/, '212')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2"
                                        onClick={() => trackBusinessCta('whatsapp_contact', 'action_bar_premium')}
                                    >
                                        <MessageCircle className="w-5 h-5 fill-white" />
                                        <span className="hidden sm:inline">WhatsApp</span>
                                    </Link>
                                </Button>
                            )}

                            {business.affiliate_link && !business.whatsapp_number && (
                                <Button className="h-11 px-6 rounded-full font-bold bg-gradient-to-r from-blue-600 to-sky-600 text-white hover:from-blue-700 hover:to-sky-700 shadow-lg shadow-blue-900/20 transition-transform hover:scale-105 active:scale-95 border border-white/10 max-sm:flex-1 max-sm:min-w-[140px]" asChild>
                                    <Link
                                        href={business.affiliate_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2"
                                        onClick={() => trackBusinessCta('affiliate_click', 'action_bar_premium')}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        <span>{business.affiliate_cta || t('businessActions.book', 'Reserver')}</span>
                                    </Link>
                                </Button>
                            )}
                        </>
                    )}

                    {!business.whatsapp_number && !business.affiliate_link && business.is_premium && (
                        <ContactBusinessDialog
                            businessId={business.id}
                            businessName={business.name}
                            trigger={
                                <Button variant="outline" className="h-11 px-6 rounded-full backdrop-blur-md transition-all max-sm:flex-1 max-sm:min-w-[140px]" onClick={() => trackBusinessCta('direct_message', 'action_bar_premium')}>
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    <span>{t('businessActions.message', 'Message')}</span>
                                </Button>
                            }
                        />
                    )}
                </>
            )}

            <div className="flex items-center justify-center gap-2 w-full sm:w-auto sm:ml-1">
                <FollowButton
                    businessId={business.id}
                    initialIsFollowing={isFollowing}
                    className="h-11 w-11 p-0 rounded-full border-border bg-secondary/50 text-foreground hover:bg-secondary backdrop-blur-md"
                />

                <ShareButton
                    businessId={business.id}
                    businessName={business.name}
                    className="h-11 w-11 p-0 rounded-full border-border bg-secondary/50 text-foreground hover:bg-secondary backdrop-blur-md"
                />

                <BusinessReportDialog
                    businessId={business.id}
                    businessName={business.name}
                    trigger={
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 p-0 rounded-full border-border bg-secondary/50 text-foreground hover:bg-secondary backdrop-blur-md"
                        >
                            <Flag className="h-4 w-4" />
                        </Button>
                    }
                />
            </div>
        </div>
    );
}
