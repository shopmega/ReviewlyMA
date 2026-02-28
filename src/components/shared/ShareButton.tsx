'use client';

import { getClientSiteUrl } from '@/lib/site-config';
import { ContentShareButton } from '@/components/shared/ContentShareButton';

interface ShareButtonProps {
  businessId: string;
  businessName: string;
  className?: string;
}

export function ShareButton({ businessId, businessName, className }: ShareButtonProps) {
  const shareUrl = `${getClientSiteUrl()}/businesses/${businessId}`;

  return (
    <ContentShareButton
      url={shareUrl}
      title={`${businessName} | Avis et salaires`}
      text={`Decouvrez ${businessName} sur AVis.`}
      contentType="company_profile"
      contentId={businessId}
      cardType="company_snapshot"
      label="Partager cette entreprise"
      iconOnly
      className={`rounded-full h-12 w-12 p-0 shrink-0 ${className || ''}`}
    />
  );
}