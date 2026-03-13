import { permanentRedirect } from 'next/navigation';
import { findBusinessRouteByCompanySlug } from '@/lib/data';

type Params = { companySlug: string };

export default async function ReferralCompanyLegacyRedirect({ params }: { params: Promise<Params> }) {
  const { companySlug } = await params;
  const businessRoute = await findBusinessRouteByCompanySlug(companySlug);

  if (businessRoute) {
    permanentRedirect(`/businesses/${businessRoute}?tab=referrals`);
  }

  permanentRedirect(`/parrainages?search=${encodeURIComponent(companySlug.replace(/-/g, ' '))}`);
}
