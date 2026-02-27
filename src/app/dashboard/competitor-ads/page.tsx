import { redirect } from 'next/navigation';

export default function CompetitorAdsPage() {
  redirect('/dashboard/advertising?tab=competitor');
}
