import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, ArrowRight, ShieldCheck, Star, Zap, MessageSquare, TrendingUp, Users, Target, CreditCard, Clock, Store, Crown } from 'lucide-react';
import Link from 'next/link';
import { getSiteSettings } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import PremiumFeatures from '@/components/shared/PremiumFeatures';
import { getUserProfile } from '@/lib/session';

export default async function ForProsPage() {
  const siteSettings = await getSiteSettings();
  const siteName = siteSettings.site_name || 'Platform';
  const user = await getUserProfile();
  const userTier = (user?.tier as 'none' | 'growth' | 'gold') || 'none';

  // Use configurable tiered pricing
  const growthMonthly = siteSettings.tier_growth_monthly_price || 99;
  const growthAnnual = siteSettings.tier_growth_annual_price || 990;
  const goldMonthly = siteSettings.tier_gold_monthly_price || 299;
  const goldAnnual = siteSettings.tier_gold_annual_price || 2900;
  const isEnabled = siteSettings.premium_enabled !== false;

  const basicFeatures = [
    "Revendiquer votre entreprise",
    "Mettre à jour vos informations",
    "Répondre aux avis employés",
    "Statistiques de base (vues)",
    "Recevoir des messages (limité)"
  ];

  const growthFeatures = [
    "Badge de confiance GOLD",
    "Visibilité prioritaire",
    "Réponses aux avis en illimité",
    "Statistiques détaillées",
    "Suppression des pubs concurrentes"
  ];

  const goldFeatures = [
    "Tout ce qu'inclut Growth",
    "Communication directe avec les candidats",
    "Contenu épinglé pour vos offres",
    "Support prioritaire",
    "Analytics avancés",
    "Lead generation premium"
  ];

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full py-20 lg:py-32 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(hsl(var(--pattern-primary))_1px,transparent_1px)] [background-size:20px_20px]" />
        </div>

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge variant="outline" className="px-4 py-1 border-blue-200 text-blue-700 bg-blue-50 font-bold uppercase tracking-widest text-[10px]">
              Espace Professionnel
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-headline font-bold tracking-tight text-slate-900 dark:text-white">
              Propulsez votre <span className="text-blue-600">Entreprise</span> avec {siteName}
            </h1>
            <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Prenez le contrôle de votre réputation en ligne, engagez vos employés et améliorez votre attractivité auprès des talents.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" asChild className="rounded-full bg-slate-900 text-white hover:bg-slate-800 px-8 py-6 text-lg font-bold shadow-xl">
                <Link href="/pour-les-pros/signup">Commencer Gratuitement</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-full px-8 py-6 text-lg font-bold border-2 border-slate-200 hover:bg-slate-50">
                <Link href="#premium">Découvrir Premium <ArrowRight className="ml-2 w-5 h-5" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Stats Section */}
      <section className="py-12 bg-blue-600">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <div className="text-3xl font-bold text-white tracking-tight">10k+</div>
              <div className="text-blue-100/70 text-sm font-medium">Entreprises inscrites</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-white tracking-tight">500k+</div>
              <div className="text-blue-100/70 text-sm font-medium">Avis authentiques</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-white tracking-tight">2.5M</div>
              <div className="text-blue-100/70 text-sm font-medium">Vues mensuelles</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-white tracking-tight">150+</div>
              <div className="text-blue-100/70 text-sm font-medium">Villes couvertes</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tier Comparison */}
      <section className="py-24 lg:py-32 bg-slate-900 dark:bg-slate-800 text-white rounded-[3rem] lg:rounded-[5rem] mx-4 overflow-hidden relative" id="pricing">
        <div className="absolute top-0 right-0 p-12 opacity-5">
          <Zap className="w-64 h-64" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-headline font-bold text-white tracking-tight">
              Choisissez votre <span className="text-blue-400">Plan</span>
            </h2>
            <p className="text-slate-400 font-medium italic">
              De la croissance à l'excellence - trouvez le plan parfait pour votre entreprise.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {/* Basic Plan */}
            <div className="bg-white/5 dark:bg-slate-800/50 backdrop-blur-sm p-10 rounded-3xl border border-white/10 dark:border-slate-700/50 space-y-8">
              <div className="space-y-4">
                <Badge className="bg-slate-700 text-white border-none py-1 px-3">GRATUIT</Badge>
                <h3 className="text-3xl font-bold font-headline">Basic</h3>
                <p className="text-slate-400 dark:text-slate-300 text-sm">Indispensable pour démarrer votre transition numérique.</p>
              </div>
              <ul className="space-y-4">
                {basicFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <CheckCircle className="w-5 h-5 text-emerald-400" /> {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full h-14 rounded-xl border-white/20 dark:border-slate-600 text-white hover:bg-white/10 dark:hover:bg-slate-700/50 text-lg font-bold" asChild>
                <Link href="/pour-les-pros/signup">Démarrer Basic</Link>
              </Button>
            </div>

            {/* Growth Plan */}
            <div className="bg-amber-500 dark:bg-amber-600 p-8 rounded-3xl border border-amber-400 dark:border-amber-500 space-y-6 shadow-xl shadow-amber-500/20 relative overflow-hidden group h-full flex flex-col">
              <div className="absolute -top-8 -right-8 p-6 opacity-10 transition-transform group-hover:rotate-12">
                <Star className="w-24 h-24 fill-white" />
              </div>

              <div className="space-y-3 flex-grow">
                <Badge className="bg-amber-700 text-white border-none py-1 px-3">POPULAIRE</Badge>
                <h3 className="text-2xl font-bold font-headline">Business Growth</h3>
                <p className="text-amber-100 dark:text-amber-200 text-sm">Parfait pour booster votre visibilité.</p>
              </div>
              <div className="text-center py-3 bg-white/10 dark:bg-slate-800/30 rounded-xl border border-white/10 dark:border-slate-600/30 my-4">
                <div className="text-3xl font-black text-white">{growthAnnual} MAD <span className="text-base font-medium opacity-70">/ an</span></div>
                <div className="text-xs font-bold text-amber-200 dark:text-amber-300 mt-1">ou {growthMonthly} MAD/mois</div>
              </div>
              <ul className="space-y-3 flex-grow">
                {growthFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm font-medium text-white">
                    <Star className="w-4 h-4 text-yellow-300 fill-current" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full h-12 rounded-xl bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-700 text-base font-bold shadow-lg mt-4" asChild>
                <Link href="/dashboard/premium">Choisir Growth <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
            </div>

            {/* Gold Plan */}
            <div className="bg-blue-600 dark:bg-blue-700 p-8 rounded-3xl border border-blue-500 dark:border-blue-500 space-y-6 shadow-2xl shadow-blue-600/30 relative overflow-hidden group h-full flex flex-col">
              <div className="absolute -top-8 -right-8 p-6 opacity-20 transition-transform group-hover:rotate-12">
                <Zap className="w-24 h-24 fill-white" />
              </div>

              <div className="space-y-3 flex-grow">
                <Badge className="bg-orange-500 text-white border-none py-1 px-3">RECOMMANDÉ</Badge>
                <h3 className="text-2xl font-bold font-headline">Business Gold</h3>
                <p className="text-blue-100 dark:text-blue-200 text-sm">Le pack complet pour dominer votre marché.</p>
              </div>
              <div className="text-center py-3 bg-white/10 dark:bg-slate-800/30 rounded-xl border border-white/10 dark:border-slate-600/30 my-4">
                <div className="text-3xl font-black text-white">{goldAnnual} MAD <span className="text-base font-medium opacity-70">/ an</span></div>
                <div className="text-xs font-bold text-blue-200 dark:text-blue-300 mt-1">ou {goldMonthly} MAD/mois</div>
              </div>
              <ul className="space-y-3 flex-grow">
                {goldFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm font-bold text-white">
                    <Zap className="w-4 h-4 text-amber-300" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full h-12 rounded-xl bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700 text-base font-extrabold shadow-lg mt-4" asChild>
                <Link href="/dashboard/premium">Choisir Gold <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Premium Features */}
      <section id="premium" className="py-24 lg:py-32 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 px-4 py-1">AVANTAGES PREMIUM</Badge>
            <h2 className="text-3xl md:text-5xl font-headline font-bold text-slate-900 tracking-tight">
              Fonctionnalités Premium Exclusives
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Des outils puissants pour transformer votre présence en ligne et attirer les meilleurs talents.
            </p>
          </div>

          <PremiumFeatures variant="marketing" userTier={userTier} />
        </div>
      </section>

      {/* Multi-Business Section */}
      <section className="w-full py-24 lg:py-32 bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-bold mb-4">
              <Store className="w-4 h-4" />
              MULTI-ENTREPRISES
            </div>
            <h2 className="text-3xl md:text-5xl font-headline font-bold text-slate-900 tracking-tight">
              Gérez Plusieurs Entreprises
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Parfait pour les groupes et les propriétaires de plusieurs entreprises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                  <Store className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  Plan Basic
                </CardTitle>
                <div className="text-2xl font-black text-slate-900 dark:text-white">1 Entreprise</div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span>Gestion complète d'une entreprise</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium text-slate-600">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span>Tableau de bord personnalisé</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium text-slate-600">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span>Analytics de base</span>
                  </li>
                </ul>
                <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">Gratuit</div>
                    <p className="text-sm text-slate-400 dark:text-slate-500">Inclus avec votre compte</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-500 bg-white dark:bg-slate-800 shadow-xl shadow-blue-500/5 dark:shadow-blue-400/10 rounded-3xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <Crown className="w-24 h-24 text-blue-600" />
              </div>
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-blue-600 dark:text-blue-400">
                  <Crown className="w-5 h-5" />
                  Plan Premium
                </CardTitle>
                <div className="text-2xl font-black text-slate-900 dark:text-white">Jusqu'à 5 Entreprises</div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span>Multi-gestion d'entreprises</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span>Tableau de bord unifié</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span>Analytics comparatifs</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span>Changement rapide d'entreprise</span>
                  </li>
                </ul>
                <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{goldAnnual} MAD / an</div>
                    <p className="text-sm text-slate-400 dark:text-slate-500">Pour toutes vos entreprises</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-16 text-center">
            <Card className="max-w-3xl mx-auto border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/20 rounded-3xl overflow-hidden">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-4 flex items-center justify-center gap-2 text-slate-900 dark:text-white">
                  <Store className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  Idéal pour les Groupes
                </h3>
                <p className="text-slate-600 dark:text-slate-300 font-medium mb-6">
                  Gérez facilement plusieurs entreprises depuis un seul tableau de bord unifié.
                  Basculez instantanément entre vos entreprises et suivez les performances globales en un coup d'œil.
                </p>
                <div className="grid grid-cols-3 gap-4 text-sm font-bold">
                  <div className="text-center p-4 bg-white dark:bg-slate-700 rounded-2xl shadow-sm">
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400">5+</div>
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider">Entreprises</div>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-slate-700 rounded-2xl shadow-sm">
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">100%</div>
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider">Unifié</div>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-slate-700 rounded-2xl shadow-sm">
                    <div className="text-2xl font-black text-amber-500 dark:text-amber-400">24/7</div>
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider">Prioritaire</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="w-full py-24 lg:py-32 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-headline font-bold text-slate-900 dark:text-white tracking-tight">
              Comment rejoindre le cercle Pro ?
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Simple et rapide pour activer vos fonctionnalités Premium.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-3xl p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <CardHeader>
                <div className="mx-auto bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-2xl shadow-sm w-16 h-16 flex items-center justify-center mb-4 text-2xl font-black italic">
                  1
                </div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Effectuez le paiement</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Transférez le montant convenu à notre compte bancaire ou via nos partenaires de paiement sécurisé.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-3xl p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <CardHeader>
                <div className="mx-auto bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-2xl shadow-sm w-16 h-16 flex items-center justify-center mb-4 text-2xl font-black italic">
                  2
                </div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Envoyez la preuve</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Soumettez votre référence de transaction via votre tableau de bord ou contactez notre support dédié.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-3xl p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <CardHeader>
                <div className="mx-auto bg-blue-600 dark:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900 w-16 h-16 flex items-center justify-center mb-4 text-2xl font-black italic">
                  3
                </div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Activez Premium</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Une fois vérifié, votre badge Pro et toutes les fonctionnalités Premium sont activés immédiatement.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-32 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-500 rounded-full blur-[150px]" />
        </div>

        <div className="container mx-auto px-4 text-center space-y-10 relative z-10">
          <div className="w-20 h-20 bg-blue-500 rounded-3xl flex items-center justify-center text-white mx-auto transform rotate-12 shadow-2xl">
            <Target className="w-10 h-10" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-headline font-bold text-white max-w-4xl mx-auto leading-tight tracking-tight">
            Prêt à dominer votre marché local ?
          </h2>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button size="lg" asChild className="rounded-full bg-blue-600 text-white hover:bg-blue-700 px-10 py-8 text-xl font-bold shadow-2xl shadow-blue-600/30">
              <Link href="/pour-les-pros/signup">Démarrer mon compte Pro</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-full border-white/20 text-white hover:bg-white/10 px-10 py-8 text-xl font-bold backdrop-blur-md">
              <Link href="/dashboard">S'abonner à Premium</Link>
            </Button>
          </div>
          <p className="text-slate-400 dark:text-slate-500 font-medium">Rejoignez les entreprises qui transforment leur attractivité en succès.</p>
        </div>
      </section>
    </div>
  );
}
