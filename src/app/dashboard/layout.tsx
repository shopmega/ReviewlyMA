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
import { Edit, Home, Megaphone, PieChart, Star, CodeXml, MessageSquare, Zap, Store, HelpCircle, BarChart3, Crown, Bell, Menu } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { syncProProfile } from '@/app/actions/user';
import { LucideIcon } from 'lucide-react';
import { BusinessSelector } from '@/components/shared/BusinessSelector';
import { useBusiness } from '@/contexts/BusinessContext';
import { DashboardAuthGuard } from '@/components/auth/DashboardAuthGuard';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { appendBusinessIdToHref } from '@/lib/dashboard-business-routing';

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  goldOnly?: boolean;
}


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isMultiBusiness, currentBusiness } = useBusiness();
  const { hasGoldAccess } = useBusinessProfile();
  const selectedBusinessId = currentBusiness?.id || searchParams.get('id');

  const menuItems: MenuItem[] = [
    { href: '/dashboard', label: 'Vue d\'ensemble', icon: Home },
    { href: '/dashboard/avis', label: 'Mes Avis', icon: Star },
    { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
    { href: '/dashboard/premium', label: 'Abonnement', icon: Zap },
    {
      href: hasGoldAccess ? '/dashboard/salary-benchmark' : '/dashboard/premium',
      label: 'Benchmark salaires',
      icon: BarChart3,
      goldOnly: true
    },
    { href: '/dashboard/salary-alerts', label: 'Alertes salaires', icon: Bell },
    { href: '/dashboard/updates', label: 'Nouveautes', icon: Megaphone },
    { href: '/dashboard/etablissement', label: 'Etablissement', icon: Edit },
    { href: '/dashboard/statistiques', label: 'Statistiques', icon: PieChart },
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

  const getMenuHref = (href: string) => appendBusinessIdToHref(href, selectedBusinessId);
  const mobilePrimaryItems: MenuItem[] = [
    { href: '/dashboard', label: 'Accueil', icon: Home },
    { href: '/dashboard/avis', label: 'Avis', icon: Star },
    { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
    { href: '/dashboard/etablissement', label: 'Profil', icon: Edit },
  ];

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
        className="mt-16 h-[calc(100svh-4rem)] border-r border-border bg-card"
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
                  className="border-l-2 border-l-transparent data-[active=true]:border-l-primary data-[active=true]:bg-secondary data-[active=true]:text-foreground hover:bg-secondary/50 transition-colors"
                >
                  <Link href={getMenuHref(item.href)}>
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium inline-flex items-center gap-2">
                      {item.label}
                      {item.goldOnly && (
                        <span className="inline-flex items-center rounded-md border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
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
      <SidebarInset className="min-h-screen bg-background">
        <div className="sticky top-[65px] z-10 flex h-12 items-center gap-4 border-b border-border bg-background px-4 lg:hidden">
          <SidebarTrigger />
          <div className="text-sm font-medium text-foreground">Menu Dashboard</div>
        </div>
        <div className="mx-auto w-full max-w-7xl p-4 pb-24 sm:p-6 sm:pb-28 lg:p-8 lg:pb-8">
          {children}
        </div>
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
          <div className="grid h-16 grid-cols-5">
            {mobilePrimaryItems.map((item) => {
              const active = isMenuItemActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={getMenuHref(item.href)}
                  className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                    active ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="flex items-center justify-center">
              <SidebarTrigger className="h-full w-full rounded-none text-muted-foreground hover:bg-secondary/60 hover:text-foreground">
                <div className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium">
                  <Menu className="h-4 w-4" />
                  <span>Menu</span>
                </div>
              </SidebarTrigger>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
    </DashboardAuthGuard>
  );
}
