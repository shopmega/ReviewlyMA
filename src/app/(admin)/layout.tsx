'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getSiteSettings } from '@/lib/data';
import {
  LayoutDashboard,
  Building,
  Users,
  Star,
  FileImage,
  Flag,
  Home,
  BarChart3,
  ChevronLeft,
  Settings,
  CreditCard,
  FileText,
  ShieldCheck,
  LayoutGrid,
  MessageSquare,
  UserPlus,
  Stethoscope,
  DollarSign,
  Building2,
  Target,
  ShieldAlert,
  BriefcaseBusiness,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useI18n } from '@/components/providers/i18n-provider';
import { getSiteName } from '@/lib/site-config';

const menuGroups = [
  {
    labelKey: 'adminLayout.group.insights',
    labelFallback: 'Insights',
    items: [
      { href: '/admin', labelKey: 'adminLayout.nav.dashboard', labelFallback: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/analytics', labelKey: 'adminLayout.nav.analyticsHub', labelFallback: 'Analytics Hub', icon: BarChart3 },
      { href: '/admin/job-offers', labelKey: 'adminLayout.nav.jobOffers', labelFallback: 'Job Offers', icon: BriefcaseBusiness },
      { href: '/admin/opportunites', labelKey: 'adminLayout.nav.opportunities', labelFallback: 'Opportunites', icon: Target },
      { href: '/admin/outreach', labelKey: 'adminLayout.nav.outreach', labelFallback: 'Outreach Pipeline', icon: BriefcaseBusiness },
      { href: '/admin/statistiques', labelKey: 'adminLayout.nav.stats', labelFallback: 'Statistiques', icon: BarChart3 },
      { href: '/admin/audit', labelKey: 'adminLayout.nav.auditLogs', labelFallback: 'Audit Logs', icon: FileText },
    ],
  },
  {
    labelKey: 'adminLayout.group.management',
    labelFallback: 'Management',
    items: [
      { href: '/admin/etablissements', labelKey: 'adminLayout.nav.businesses', labelFallback: 'Entreprises', icon: Building },
      { href: '/admin/utilisateurs', labelKey: 'adminLayout.nav.users', labelFallback: 'Utilisateurs', icon: Users },
      { href: '/admin/categories', labelKey: 'adminLayout.nav.categories', labelFallback: 'Categories', icon: LayoutGrid },
      { href: '/admin/revendications', labelKey: 'adminLayout.nav.claims', labelFallback: 'Revendications', icon: ShieldCheck },
      { href: '/admin/business-suggestions', labelKey: 'adminLayout.nav.suggestions', labelFallback: 'Suggestions', icon: Building },
      { href: '/admin/business-assignment', labelKey: 'adminLayout.nav.businessAssignment', labelFallback: 'Business Assignment', icon: UserPlus },
    ],
  },
  {
    labelKey: 'adminLayout.group.moderation',
    labelFallback: 'Moderation',
    items: [
      { href: '/admin/moderation', labelKey: 'adminLayout.nav.moderationHub', labelFallback: 'Moderation Hub', icon: ShieldAlert },
      { href: '/admin/avis', labelKey: 'adminLayout.nav.allReviews', labelFallback: 'Tous les avis', icon: Star },
      { href: '/admin/salaires', labelKey: 'adminLayout.nav.salaries', labelFallback: 'Salaires', icon: DollarSign },
      { href: '/admin/avis-signalements', labelKey: 'adminLayout.nav.reviewReports', labelFallback: 'Signalements avis', icon: Flag },
      { href: '/admin/avis-appels', labelKey: 'adminLayout.nav.reviewAppeals', labelFallback: 'Appels avis', icon: FileText },
      { href: '/admin/entreprises-signalements', labelKey: 'adminLayout.nav.businessReports', labelFallback: 'Signalements entreprises', icon: Building2 },
      { href: '/admin/contenu', labelKey: 'adminLayout.nav.reportedMedia', labelFallback: 'Medias signales', icon: FileImage },
    ],
  },
  {
    labelKey: 'adminLayout.group.platform',
    labelFallback: 'Plateforme',
    items: [
      { href: '/admin/homepage', labelKey: 'adminLayout.nav.homepage', labelFallback: 'Page accueil', icon: Home },
      { href: '/admin/blog', labelKey: 'adminLayout.nav.blogCms', labelFallback: 'Blog CMS', icon: FileText },
      { href: '/admin/paiements', labelKey: 'adminLayout.nav.payments', labelFallback: 'Paiements', icon: CreditCard },
      { href: '/admin/support', labelKey: 'adminLayout.nav.support', labelFallback: 'Support Client', icon: MessageSquare },
      { href: '/admin/messages', labelKey: 'adminLayout.nav.messages', labelFallback: 'Messages entreprises', icon: MessageSquare },
      { href: '/admin/diagnostics', labelKey: 'adminLayout.nav.diagnostics', labelFallback: 'Diagnostics', icon: Stethoscope },
      { href: '/admin/parametres', labelKey: 'adminLayout.nav.settings', labelFallback: 'Parametres', icon: Settings },
    ],
  },
];

function SidebarContent({ pathname, siteName }: { pathname: string; siteName: string }) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col h-full bg-card/30 backdrop-blur-xl">
      <div className="p-6 border-b border-border/50">
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight">{siteName}</span>
            <span className="text-[10px] uppercase tracking-widest text-primary font-bold block">
              {t('adminLayout.suite', 'Admin Suite')}
            </span>
          </div>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-4 py-6">
        <div className="space-y-8">
          {menuGroups.map((group) => (
            <div key={group.labelKey} className="space-y-2">
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {t(group.labelKey, group.labelFallback)}
              </h3>
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group/item',
                        isActive
                          ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5 border border-primary/10'
                          : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-5 w-5 transition-colors',
                          isActive ? 'text-primary' : 'text-muted-foreground group-hover/item:text-primary'
                        )}
                      />
                      {t(item.labelKey, item.labelFallback)}
                      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/50 bg-muted/20">
        <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl hover:bg-primary/5 group" asChild>
          <Link href="/">
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">{t('adminLayout.backToSite', 'Retour au site')}</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [siteName, setSiteName] = useState('Reviewly');
  const { t } = useI18n();

  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const settings = await getSiteSettings();
        setSiteName(getSiteName(settings));
      } catch (error) {
        console.error('Error fetching site settings:', error);
      }
    };
    fetchSiteSettings();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 overflow-x-hidden">
      <div className="flex">
        <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 border-r border-border/50">
          <SidebarContent pathname={pathname} siteName={siteName} />
        </aside>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-72 border-none">
            <SheetTitle className="sr-only">{t('adminLayout.mobileMenu', 'Menu Admin')}</SheetTitle>
            <SidebarContent pathname={pathname} siteName={siteName} />
          </SheetContent>
        </Sheet>

        <div className="flex-1 lg:pl-72 flex flex-col min-h-screen min-w-0 overflow-hidden">
          <AdminHeader onMenuClick={() => setSidebarOpen(true)} />

          <main className="flex-1 min-w-0">
            <div className="container py-6 px-4 md:py-8 md:px-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden md:overflow-visible">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
