import { permanentRedirect } from 'next/navigation';

type Params = { role: string; city: string };

export default async function SalaryRoleCityLegacyRedirect({ params }: { params: Promise<Params> }) {
  const { role, city } = await params;
  permanentRedirect(`/salaires/${role}/${city}`);
}
