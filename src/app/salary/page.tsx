import { permanentRedirect } from 'next/navigation';

export default function SalaryHubLegacyRedirect() {
  permanentRedirect('/salaires');
}
