import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSiteSettings } from "@/lib/data";
import {
  Building,
  Star,
  Users,
  Zap,
  MessageSquare,
  FileText,
  CreditCard,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  PlusCircle,
  LayoutGrid,
  FileImage,
  Settings,
  Stethoscope
} from "lucide-react";
import Link from "next/link";
import { getAdminStats } from "@/lib/admin-utils";
import { verifyAdminSession } from "@/lib/supabase/admin";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

// Server action to get pending report count
async function getPendingReportCount() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('review_reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  return error ? 0 : count || 0;
}

export default async function AdminDashboard() {
  // Enforce admin session
  await verifyAdminSession();

  const stats = await getAdminStats();
  const siteSettings = await getSiteSettings();
  const pendingReports = await getPendingReportCount();
  const siteName = siteSettings.site_name || 'Platform';

  const statCards = [
    {
      name: 'Entreprises',
      value: stats.businessCount,
      change: '+12%',
      icon: Building,
      href: '/admin/etablissements',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      name: 'Avis publiés',
      value: stats.reviewCount,
      change: '+24%',
      icon: Star,
      href: '/admin/avis',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    },
    {
      name: 'Utilisateurs',
      value: stats.userCount,
      change: '+8%',
      icon: Users,
      href: '/admin/utilisateurs',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      name: 'Abonnements Premium',
      value: stats.premiumCount,
      change: '+15%',
      icon: Zap,
      href: '/admin/utilisateurs',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      name: 'Tickets Support',
      value: stats.unreadSupportCount || 0,
      change: 'À traiter',
      icon: MessageSquare,
      href: '/admin/support',
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10'
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Centre de Commande
          </h1>
          <p className="text-muted-foreground mt-2 font-medium text-sm md:text-base">
            Pilotage global de la plateforme {siteName}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button variant="outline" className="rounded-xl h-11 border-border/50 bg-white/50 dark:bg-white/5 backdrop-blur-sm shadow-sm" asChild>
            <Link href="/admin/homepage">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Editer Homepage
            </Link>
          </Button>
          <Button className="rounded-xl h-11 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white font-bold" asChild>
            <Link href="/admin/etablissements">
              <PlusCircle className="mr-2 h-4 w-4" />
              Ajouter une entreprise
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="relative overflow-hidden border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl group cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {stat.name}
                </CardTitle>
                <div className={`p-2 rounded-xl ${stat.bgColor} ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-black">{stat.value.toLocaleString('fr-MA')}</div>
                  <div className="flex items-center text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {stat.change}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Activity Feed */}
        <div className="xl:col-span-2">
          <ActivityFeed />
        </div>

        {/* Right Column: Alerts & Quick Tools */}
        <div className="space-y-8">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-primary to-accent text-white rounded-3xl overflow-hidden p-6 relative">
            <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4">
              <Zap className="h-32 w-32" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Alertes Système</h3>
                <p className="text-white/80 text-sm mt-1">
                  Il y a {pendingReports} signalement{pendingReports !== 1 ? 's' : ''} en attente de modération.
                </p>
              </div>
              <Button variant="secondary" className="w-full rounded-xl font-bold h-11" asChild>
                <Link href="/admin/avis-signalements">
                  Voir les alertes
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>

          <Card className="border-0 shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6">
            <h3 className="font-bold text-lg mb-4">Outils d'accès rapide</h3>
            <div className="space-y-3">
              {[
                { name: 'Modérer les médias', href: '/admin/contenu', icon: FileImage },
                { name: 'Gestion des paiements', href: '/admin/paiements', icon: CreditCard },
                { name: 'Diagnostics systeme', href: '/admin/diagnostics', icon: Stethoscope },
                { name: 'Configuration du site', href: '/admin/parametres', icon: Settings },
              ].map((tool) => (
                <Link
                  key={tool.name}
                  href={tool.href}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-colors group"
                >
                  <div className="p-2 rounded-xl bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <tool.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold">{tool.name}</span>
                  <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
