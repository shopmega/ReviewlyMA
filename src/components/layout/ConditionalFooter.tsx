'use client';

import { usePathname } from 'next/navigation';

export function ConditionalFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const isDashboard = pathname?.startsWith('/dashboard');
  const isAdmin = pathname?.startsWith('/admin');
  
  if (isDashboard || isAdmin) {
    return null;
  }
  
  return <>{children}</>;
}
