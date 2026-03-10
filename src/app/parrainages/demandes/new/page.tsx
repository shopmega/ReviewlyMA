import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NewDemandListingPage() {
  redirect('/parrainages/new?type=demand');
}
