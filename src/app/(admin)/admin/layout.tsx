import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { verifyAdminSession } from '@/lib/supabase/admin';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    await verifyAdminSession();
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    const adminNext = '/login?next=/admin';

    // Invalid/missing session or profile verification failure: force re-auth.
    if (
      message.includes('session invalide') ||
      message.includes('profil introuvable') ||
      message.includes('impossible de verifier le profil')
    ) {
      redirect(adminNext);
    }

    // Authenticated but insufficient role: send to dashboard, not homepage.
    if (message.includes('acces reserve aux administrateurs') || message.includes('insuffisant')) {
      redirect('/dashboard');
    }

    // Safe fallback: try to refresh auth instead of bouncing to homepage.
    redirect(adminNext);
  }

  return <>{children}</>;
}
