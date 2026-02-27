'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Edit, Home, Megaphone, PieChart, Star, CodeXml, MessageSquare, Zap, Store, HelpCircle, BarChart3, Crown, Bell } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { syncProProfile } from '@/app/actions/user';
import { LucideIcon } from 'lucide-react';
import { BusinessSelector } from '@/components/shared/BusinessSelector';
import { useBusiness } from '@/contexts/BusinessContext';
import { DashboardAuthGuard } from '@/components/auth/DashboardAuthGuard';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  goldOnly?: boolean;
}


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isMultiBusiness } = useBusiness();
  const { profile } = useBusinessProfile();
  const hasGoldAccess = profile?.tier === 'gold';

  const menuItems: MenuItem[] = [
    { href: '/dashboard', label: 'Vue d\'ensemble', icon: Home },
    { href: '/dashboard/reviews', label: 'Mes Avis', icon: Star },
    { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
    { href: '/dashboard/premium', label: 'Premium', icon: Zap },
    { href: '/dashboard/advertising', label: 'Advertising', icon: Megaphone },
    {
      href: hasGoldAccess ? '/dashboard/salary-benchmark' : '/dashboard/premium',
      label: 'Benchmark salaires',
      icon: BarChart3,
      goldOnly: true
    },
    { href: '/dashboard/salary-alerts', label: 'Alertes salaires', icon: Bell },
    { href: '/dashboard/updates', label: 'Nouveautes', icon: Megaphone },
    { href: '/dashboard/edit-profile', label: 'Etablissement', icon: Edit },
    { href: '/dashboard/analytics', label: 'Statistiques', icon: PieChart },
    { href: '/dashboard/widget', label: 'Badge Site Web', icon: CodeXml },
    { href: '/dashboard/support', label: 'Assistance', icon: HelpCircle },
  ];

  if (isMultiBusiness) {
    menuItems.push({ href: '/dashboard/companies', label: 'Mes Etablissements', icon: Store });
  }

  const isMenuItemActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    async function checkProSync() {
      // Only run sync if user has access (auth guard handles this)
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) {
        const { data: approvedClaim } = await supabase
          .from('business_claims')
          .select('id')
          .eq('user_id', user.id)
          .or('claim_state.eq.verified,status.eq.approved')
          .maybeSingle();

        if (approvedClaim) {
          const result = await syncProProfile();
          if (result.status === 'success') {
            window.location.reload();
          }
        }
      }
    }
    
    checkProSync();
  }, []);

  return (
    <DashboardAuthGuard>
      <SidebarProvider>
      <Sidebar
        side="left"
        collapsible="icon"
        variant="sidebar"
        className="border-r border-border/40 mt-16 h-[calc(100svh-4rem)] bg-card shadow-sm"
      >
        <SidebarHeader className="py-2 px-2">
          <div className="flex items-center gap-2 px-2 py-1">
            <BusinessSelector variant="dropdown" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isMenuItemActive(item.href)}
                  tooltip={item.label}
                  className="data-[active=true]:bg-accent/10 data-[active=true]:text-accent hover:bg-secondary/50 transition-colors"
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium inline-flex items-center gap-2">
                      {item.label}
                      {item.goldOnly && (
                        <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                          <Crown className="mr-1 h-3 w-3" />
                          Gold
                        </span>
                      )}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="bg-gradient-to-br from-background to-secondary/5 min-h-screen">
        <div className="sticky top-[65px] z-10 flex h-12 items-center gap-4 border-b bg-background px-4 lg:hidden shadow-sm">
          <SidebarTrigger />
          <div className="text-sm font-medium">Menu Dashboard</div>
        </div>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
    </DashboardAuthGuard>
  );
}
