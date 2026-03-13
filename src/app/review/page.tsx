import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import GeneralReviewPageClient from './GeneralReviewPageClient';

export default async function GeneralReviewPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect(`/login?next=${encodeURIComponent('/review')}`);
  }

  return <GeneralReviewPageClient />;
}
