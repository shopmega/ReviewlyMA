'use client';

import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Pencil, MessageSquare, Briefcase, MessageCircle, ExternalLink, Flag } from 'lucide-react';
import { ContactBusinessDialog } from '@/components/shared/ContactBusinessDialog';
import { ShareButton } from '@/components/shared/ShareButton';
import { FollowButton } from '@/components/shared/FollowButton';
import { BusinessReportDialog } from '@/components/shared/BusinessReportDialog';
import { Business } from '@/lib/types';

interface BusinessPageActionsProps {
    business: Business;
    isFollowing: boolean;
}

export function BusinessPageActions({ business, isFollowing }: BusinessPageActionsProps) {
    const { businessId: userBusinessId, loading } = useBusinessProfile();

    // Strict check: User owns THIS business (IDs match)
    const isOwner = userBusinessId === business.id;

    if (loading) {
        return <div className="h-12 w-32 bg-white/10 animate-pulse rounded-full" />;
    }

    return (
        <div className="flex w-full flex-wrap items-center justify-center lg:justify-start gap-2 lg:mt-0">
            {isOwner ? (
                <Button variant="default" className="h-11 px-6 rounded-full font-bold shadow-sm max-sm:flex-1 max-sm:min-w-[140px]" asChild>
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Gérer
                    </Link>
                </Button>
            ) : (
                <>
                    {/* Primary Action: Review */}
                    <Button className="h-11 px-6 rounded-full font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 max-sm:flex-1 max-sm:min-w-[140px]" asChild>
                        <Link href={`/businesses/${business.id}/review`} className="flex items-center gap-2">
                            <Pencil className="w-4 h-4" />
                            <span>Avis</span>
                        </Link>
                    </Button>

                    {/* GOLD Actions: WhatsApp or Affiliate - Use Primary Gradient */}
                    {business.tier === 'gold' && (
                        <>
                            {business.whatsapp_number && (
                                <Button className="h-11 px-6 rounded-full font-bold bg-[#25D366] text-white hover:bg-[#20bd5a] shadow-lg shadow-green-900/20 transition-transform hover:scale-105 active:scale-95 border border-white/10 max-sm:flex-1 max-sm:min-w-[140px]" asChild>
                                    <Link
                                        href={`https://wa.me/${business.whatsapp_number.replace(/\s+/g, '').replace(/^0/, '212')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2"
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
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        <span>{business.affiliate_cta || 'Réserver'}</span>
                                    </Link>
                                </Button>
                            )}
                        </>
                    )}

                    {/* Fallback Contact for Premium (if no WhatsApp/Affiliate took slot) */}
                    {!business.whatsapp_number && !business.affiliate_link && business.is_premium && (
                        <ContactBusinessDialog
                            businessId={business.id}
                            businessName={business.name}
                            trigger={
                                <Button variant="outline" className="h-11 px-6 rounded-full backdrop-blur-md transition-all max-sm:flex-1 max-sm:min-w-[140px]">
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    <span>Message</span>
                                </Button>
                            }
                        />
                    )}
                </>
            )}

            {/* Icon Actions Group */}
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
