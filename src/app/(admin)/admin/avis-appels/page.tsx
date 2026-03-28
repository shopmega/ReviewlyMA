import { getAdminReviewAppeals } from '@/app/actions/admin-review-appeals';
import { verifyAdminPermission } from '@/lib/supabase/admin';
import ReviewAppealsPageClient from './ReviewAppealsPageClient';

export default async function ReviewAppealsAdminPage() {
  await verifyAdminPermission('moderation.review.bulk');
  const initialAppeals = await getAdminReviewAppeals();

  return <ReviewAppealsPageClient initialAppeals={initialAppeals} />;
}
