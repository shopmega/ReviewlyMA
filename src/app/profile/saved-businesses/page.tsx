import { permanentRedirect } from 'next/navigation';

export default function ProfileSavedBusinessesRedirectPage() {
  permanentRedirect('/profil?tab=saved');
}
