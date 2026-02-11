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
  Menu,
  Settings,
  CreditCard,
  FileText,
  ShieldCheck,
  Zap,
  LayoutGrid,
  Megaphone,
  MessageSquare,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdminHeader } from '@/components/admin/AdminHeader';

const menuGroups = [
  {
    label: 'Insights',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/analytics', label: 'Analytics Hub', icon: BarChart3 },
      { href: '/admin/audit', label: 'Audit Logs', icon: FileText },
    ]
  },
  {
    label: 'Management',
    items: [
      { href: '/admin/etablissements', label: 'Entreprises', icon: Building },
      { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
      { href: '/admin/categories', label: 'Catégories', icon: LayoutGrid },
      { href: '/admin/revendications', label: 'Revendications', icon: ShieldCheck },
      { href: '/admin/business-suggestions', label: 'Suggestions', icon: Building },
      { href: '/admin/business-assignment', label: 'Business Assignment', icon: UserPlus },
    ]
  },
  {
    label: 'Modération',
    items: [
      { href: '/admin/avis', label: 'Tous les avis', icon: Star },
      { href: '/admin/avis-signalements', label: 'Signalements avis', icon: Flag },
      { href: '/admin/contenu', label: 'Médias signalés', icon: FileImage },
    ]
  },
  {
    label: 'Plateforme',
    items: [
      { href: '/admin/homepage', label: 'Page d’accueil', icon: Home },
      { href: '/admin/paiements', label: 'Paiements', icon: CreditCard },
      { href: '/admin/support', label: 'Support Client', icon: MessageSquare },
      { href: '/admin/parametres', label: 'Paramètres', icon: Settings },
    ]
  }
];

function SidebarContent({ pathname, siteName }: { pathname: string; siteName: string }) {
  return (
    <div className="flex flex-col h-full bg-card/30 backdrop-blur-xl">
      <div className="p-6 border-b border-border/50">
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight">{siteName}</span>
            <span className="text-[10px] uppercase tracking-widest text-primary font-bold block">Admin Suite</span>
          </div>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-4 py-6">
        <div className="space-y-8">
          {menuGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </h3>
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/admin' && pathname.startsWith(item.href));
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
                      <item.icon className={cn(
                        'h-5 w-5 transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover/item:text-primary'
                      )} />
                      {item.label}
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
            <span className="text-sm">Retour au site</span>
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
  const [siteName, setSiteName] = useState('Platform');

  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const settings = await getSiteSettings();
        setSiteName(settings.site_name || 'Platform');
      } catch (error) {
        console.error('Error fetching site settings:', error);
      }
    };
    fetchSiteSettings();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 overflow-x-hidden">
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 border-r border-border/50">
          <SidebarContent pathname={pathname} siteName={siteName} />
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-72 border-none">
            <SheetTitle className="sr-only">Menu Admin</SheetTitle>
            <SidebarContent pathname={pathname} siteName={siteName} />
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
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
