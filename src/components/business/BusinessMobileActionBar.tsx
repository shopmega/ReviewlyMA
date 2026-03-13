'use client';

import Link from 'next/link';
import { Briefcase, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FollowButton } from '@/components/shared/FollowButton';
import { ShareButton } from '@/components/shared/ShareButton';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { analytics } from '@/lib/analytics';
import type { Business } from '@/lib/types';

type BusinessMobileActionBarProps = {
  business: Business;
  isFollowing: boolean;
};

export function BusinessMobileActionBar({
  business,
  isFollowing,
}: BusinessMobileActionBarProps) {
  const { businessId: userBusinessId, loading } = useBusinessProfile();
  const isOwner = !loading && userBusinessId === business.id;

  const trackMobileAction = (ctaId: string) => {
    analytics.trackCtaClick(
      ctaId,
      'mobile_bottom_bar',
      'business_profile',
      'business_profile_mobile_action_bar',
      'business_profile_mobile_action_bar_v1',
      business.id
    );
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden">
      <div className="mx-auto flex max-w-xl items-center gap-2 rounded-[1.75rem] border border-border/70 bg-background/95 p-3 shadow-[0_-16px_40px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        {isOwner ? (
          <Button asChild className="h-12 flex-1 rounded-2xl font-semibold">
            <Link href="/dashboard" onClick={() => trackMobileAction('manage_business')}>
              <Briefcase className="mr-2 h-4 w-4" />
              Gerer
            </Link>
          </Button>
        ) : (
          <Button asChild className="h-12 flex-1 rounded-2xl font-semibold">
            <Link href={`/businesses/${business.id}/review`} onClick={() => trackMobileAction('write_review')}>
              <Pencil className="mr-2 h-4 w-4" />
              Donner mon avis
            </Link>
          </Button>
        )}

        <FollowButton
          businessId={business.id}
          initialIsFollowing={isFollowing}
          className="h-12 w-12 rounded-2xl border-border bg-secondary/60 p-0 text-foreground hover:bg-secondary"
        />

        <ShareButton
          businessId={business.id}
          businessName={business.name}
          className="h-12 w-12 rounded-2xl border border-border bg-secondary/60 text-foreground hover:bg-secondary"
        />
      </div>
    </div>
  );
}
