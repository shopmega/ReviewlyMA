import { redirect } from 'next/navigation';
import { getCurrentAuthUser } from '@/lib/auth-helpers';
import GeneralReviewPageClient from './GeneralReviewPageClient';
import { getSiteSettings } from '@/lib/data';

export default async function GeneralReviewPage() {
  const user = await getCurrentAuthUser();
  const settings = await getSiteSettings();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent('/review')}`);
  }

  if (settings.enable_reviews === false) {
    redirect('/businesses');
  }

  return <GeneralReviewPageClient />;
}
