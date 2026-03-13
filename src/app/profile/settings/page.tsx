import { permanentRedirect } from 'next/navigation';

export default function ProfileSettingsRedirectPage() {
  permanentRedirect('/profil?tab=account');
}
