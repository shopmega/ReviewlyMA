import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Building,
  DollarSign,
  FileImage,
  MessageSquare,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

type QueueCard = {
  href: string;
  label: string;
  description: string;
  count: number;
  icon: typeof Star;
  tone: string;
};

async function getModerationCounts() {
  const supabase = await createClient();

  const [
    reviewsRes,
    salariesRes,
    claimsRes,
    suggestionsRes,
    reviewReportsRes,
    reviewAppealsRes,
    businessReportsRes,
    contentRes,
    referralsRes,
  ] = await Promise.all([
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .in('status', ['draft', 'submitted', 'pending', 'edited_requires_review', 'appealed', 'under_investigation']),
    supabase.from('salaries').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('business_claims').select('id', { count: 'exact', head: true }).or('claim_state.eq.verification_pending,status.eq.pending'),
    supabase.from('business_suggestions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('review_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('review_appeals').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_review']),
    supabase.from('business_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reported_content').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('job_referral_offers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  return {
    reviews: reviewsRes.count || 0,
    salaries: salariesRes.count || 0,
    claims: claimsRes.count || 0,
    suggestions: suggestionsRes.count || 0,
    reviewReports: reviewReportsRes.count || 0,
    reviewAppeals: reviewAppealsRes.count || 0,
    businessReports: businessReportsRes.count || 0,
    content: contentRes.count || 0,
    referrals: referralsRes.count || 0,
  };
}

export default async function AdminModerationPage() {
  const counts = await getModerationCounts();

  const primaryQueues: QueueCard[] = [
    {
      href: '/admin/avis',
      label: 'Avis',
      description: 'Moderation active des avis publics et contenus edites.',
      count: counts.reviews,
      icon: Star,
      tone: 'bg-amber-500/10 text-amber-600',
    },
    {
      href: '/admin/salaires',
      label: 'Salaires',
      description: 'Validation des soumissions salariales en attente.',
      count: counts.salaries,
      icon: DollarSign,
      tone: 'bg-emerald-500/10 text-emerald-600',
    },
    {
      href: '/admin/revendications',
      label: 'Revendications',
      description: 'Verification des demandes de propriete et preuves associees.',
      count: counts.claims,
      icon: ShieldCheck,
      tone: 'bg-blue-500/10 text-blue-600',
    },
    {
      href: '/admin/business-suggestions',
      label: 'Suggestions',
      description: 'Validation des nouvelles entreprises proposees par les utilisateurs.',
      count: counts.suggestions,
      icon: Building,
      tone: 'bg-violet-500/10 text-violet-600',
    },
  ];

  const secondaryQueues: QueueCard[] = [
    {
      href: '/admin/avis-signalements',
      label: 'Signalements avis',
      description: 'Traitement des signalements recus sur les avis publies.',
      count: counts.reviewReports,
      icon: AlertTriangle,
      tone: 'bg-rose-500/10 text-rose-600',
    },
    {
      href: '/admin/avis-appels',
      label: 'Appels avis',
      description: 'Relecture des appels soumis apres moderation.',
      count: counts.reviewAppeals,
      icon: MessageSquare,
      tone: 'bg-orange-500/10 text-orange-600',
    },
    {
      href: '/admin/entreprises-signalements',
      label: 'Signalements entreprises',
      description: 'Revue des flags et signalements portes sur les entreprises.',
      count: counts.businessReports,
      icon: Building,
      tone: 'bg-slate-500/10 text-slate-600',
    },
    {
      href: '/admin/contenu',
      label: 'Contenu signale',
      description: 'Verification des medias et autres contenus remontes.',
      count: counts.content,
      icon: FileImage,
      tone: 'bg-cyan-500/10 text-cyan-600',
    },
    {
      href: '/admin/parrainages',
      label: 'Parrainages',
      description: 'Surveillance des offres de referral en attente.',
      count: counts.referrals,
      icon: BriefcaseBusiness,
      tone: 'bg-fuchsia-500/10 text-fuchsia-600',
    },
  ];

  const totalPrimary = primaryQueues.reduce((sum, item) => sum + item.count, 0);
  const totalSecondary = secondaryQueues.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge className="border-none bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            Moderation Hub
          </Badge>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            File de moderation unifiee
          </h1>
          <p className="max-w-3xl text-sm font-medium text-muted-foreground">
            Point d&apos;entree unique vers les files critiques de moderation. Les queues specialisees restent
            disponibles, mais cette page centralise les volumes en attente et les raccourcis prioritaires.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="border-border/50 bg-card/70">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Queues coeur</p>
              <p className="mt-2 text-3xl font-black">{totalPrimary}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/70">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Queues annexes</p>
              <p className="mt-2 text-3xl font-black">{totalSecondary}</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 border-border/50 bg-card/70 sm:col-span-1">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total ouvert</p>
              <p className="mt-2 text-3xl font-black">{totalPrimary + totalSecondary}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-black tracking-tight">Priorite operationnelle</h2>
          <p className="text-sm text-muted-foreground">
            Les quatre files principales definies par le blueprint pour l&apos;entree moderation.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {primaryQueues.map((queue) => (
            <Link key={queue.href} href={queue.href}>
              <Card className="h-full border-border/50 bg-card/70 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`rounded-2xl p-3 ${queue.tone}`}>
                      <queue.icon className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="font-bold">
                      {queue.count}
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{queue.label}</CardTitle>
                    <CardDescription className="mt-2 text-sm">{queue.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center text-sm font-semibold text-primary">
                    Ouvrir la file
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight">Queues connexes</h2>
            <p className="text-sm text-muted-foreground">
              Files complementaires pour les signalements, appels et moderation specialisee.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/admin/audit">Voir le journal d&apos;audit</Link>
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {secondaryQueues.map((queue) => (
            <Link key={queue.href} href={queue.href}>
              <Card className="h-full border-border/50 bg-card/60 transition-all hover:border-primary/20 hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`rounded-2xl p-3 ${queue.tone}`}>
                    <queue.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold">{queue.label}</p>
                      <Badge variant="secondary">{queue.count}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{queue.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
