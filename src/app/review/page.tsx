import { redirect } from 'next/navigation';
import { getCurrentAuthUser } from '@/lib/auth-helpers';
import GeneralReviewPageClient from './GeneralReviewPageClient';

export default async function GeneralReviewPage() {
  const user = await getCurrentAuthUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent('/review')}`);
  }

  return <GeneralReviewPageClient />;
}
