import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { verifyAdminSession } from '@/lib/supabase/admin';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    await verifyAdminSession();
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';

    if (message.includes('session invalide')) {
      redirect('/login?next=/admin');
    }

    redirect('/');
  }

  return <>{children}</>;
}
