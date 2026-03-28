import { verifyAdminPermission } from '@/lib/supabase/admin';
import { getSiteSettings, normalizeSiteSettings } from '@/lib/data/settings';
import SettingsPageClient from './SettingsPageClient';

export default async function SettingsPage() {
  await verifyAdminPermission('settings.write');
  const initialSettings = normalizeSiteSettings(await getSiteSettings());

  return <SettingsPageClient initialSettings={initialSettings} />;
}
