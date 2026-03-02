import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Star, Zap, Target, Store, Crown } from 'lucide-react';
import Link from 'next/link';
import { getSiteSettings } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import PremiumFeatures from '@/components/shared/PremiumFeatures';
import { getUserProfile } from '@/lib/session';
import { getServerTranslator } from '@/lib/i18n/server';

export default async function ForProsPage() {
  const siteSettings = await getSiteSettings();
  const siteName = siteSettings.site_name || 'Platform';
  const user = await getUserProfile();
  const userTier = user?.tier || 'standard';
  const { t, tf } = await getServerTranslator();

  const growthMonthly = siteSettings.tier_growth_monthly_price || 99;
  const growthAnnual = siteSettings.tier_growth_annual_price || 990;
  const goldMonthly = siteSettings.tier_gold_monthly_price || 299;
  const goldAnnual = siteSettings.tier_gold_annual_price || 2900;

  const basicFeatures = [
    t('forProsPage.features.basic.1', 'Claim your business'),
    t('forProsPage.features.basic.2', 'Update your information'),
    t('forProsPage.features.basic.3', 'Reply to employee reviews'),
    t('forProsPage.features.basic.4', 'Basic analytics (views)'),
    t('forProsPage.features.basic.5', 'Receive messages (limited)'),
  ];

  const growthFeatures = [
    t('forProsPage.features.growth.1', 'GOLD trust badge'),
    t('forProsPage.features.growth.2', 'Priority visibility'),
    t('forProsPage.features.growth.3', 'Unlimited review replies'),
    t('forProsPage.features.growth.4', 'Detailed analytics'),
    t('forProsPage.features.growth.5', 'Remove competitor ads'),
  ];

  const goldFeatures = [
    t('forProsPage.features.gold.1', 'Everything in Growth'),
    t('forProsPage.features.gold.2', 'Direct communication with candidates'),
    t('forProsPage.features.gold.3', 'Pinned content for your offers'),
    t('forProsPage.features.gold.4', 'Priority support'),
    t('forProsPage.features.gold.5', 'Salary benchmark (Gold only)'),
    t('forProsPage.features.gold.6', 'Monthly salary barometer'),
    t('forProsPage.features.gold.7', 'Advanced analytics'),
    t('forProsPage.features.gold.8', 'Premium lead generation'),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative w-full overflow-hidden border-b border-border bg-card py-20 lg:py-32">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(hsl(var(--pattern-primary))_1px,transparent_1px)] [background-size:20px_20px]" />
        </div>

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge variant="outline" className="px-4 py-1 border-info/20 bg-info/10 text-info font-bold uppercase tracking-widest text-[10px]">
              {t('forProsPage.hero.badge', 'Professional area')}
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-headline font-bold tracking-tight text-foreground">
              {tf('forProsPage.hero.titlePrefix', 'Boost your {siteName}', { siteName })}{' '}
              <span className="text-info">{t('forProsPage.hero.titleHighlight', 'business')}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t('forProsPage.hero.subtitle', 'Take control of your online reputation, engage your employees, and improve your talent attractiveness.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" asChild className="rounded-md px-8 py-6 text-lg font-bold shadow-none">
                <Link href="/pour-les-pros/signup">{t('forProsPage.hero.ctaStart', 'Start for free')}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-md px-8 py-6 text-lg font-bold border-2 border-border hover:bg-secondary/20">
                <Link href="#premium">
                  {t('forProsPage.hero.ctaPremium', 'Discover Premium')} <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <div className="text-3xl font-bold text-white tracking-tight">10k+</div>
              <div className="text-muted-foreground text-sm font-medium">{t('forProsPage.stats.1', 'Registered businesses')}</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-white tracking-tight">500k+</div>
              <div className="text-muted-foreground text-sm font-medium">{t('forProsPage.stats.2', 'Authentic reviews')}</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-white tracking-tight">2.5M</div>
              <div className="text-muted-foreground text-sm font-medium">{t('forProsPage.stats.3', 'Monthly views')}</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-white tracking-tight">150+</div>
              <div className="text-muted-foreground text-sm font-medium">{t('forProsPage.stats.4', 'Covered cities')}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32 bg-secondary/20 rounded-[2rem] lg:rounded-[3rem] mx-4 overflow-hidden relative" id="pricing">
        <div className="absolute top-0 right-0 p-12 opacity-5">
          <Zap className="w-64 h-64" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-headline font-bold text-foreground tracking-tight">
              {t('forProsPage.pricing.titlePrefix', 'Choose your')} <span className="text-info">{t('forProsPage.pricing.titleHighlight', 'plan')}</span>
            </h2>
            <p className="text-muted-foreground font-medium italic">
              {t('forProsPage.pricing.subtitle', 'From growth to excellence, find the perfect plan for your business.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            <div className="bg-card p-10 rounded-3xl border border-border space-y-8">
              <div className="space-y-4">
                <Badge className="bg-secondary text-secondary-foreground border-none py-1 px-3">{t('forProsPage.pricing.basic.badge', 'FREE')}</Badge>
                <h3 className="text-3xl font-bold font-headline">{t('forProsPage.pricing.basic.name', 'Basic')}</h3>
                <p className="text-muted-foreground text-sm">{t('forProsPage.pricing.basic.desc', 'Essential to start your digital transition.')}</p>
              </div>
              <ul className="space-y-4">
                {basicFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <CheckCircle className="w-5 h-5 text-emerald-400" /> {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full h-14 rounded-md border-border text-foreground hover:bg-secondary/20 text-lg font-bold" asChild>
                <Link href="/pour-les-pros/signup">{t('forProsPage.pricing.basic.cta', 'Start Basic')}</Link>
              </Button>
            </div>

            <div className="bg-card p-8 rounded-2xl border border-warning/30 space-y-6 shadow-none relative overflow-hidden group h-full flex flex-col">
              <div className="absolute -top-8 -right-8 p-6 opacity-10 transition-transform group-hover:rotate-12">
                <Star className="w-24 h-24 fill-white" />
              </div>

              <div className="space-y-3 flex-grow">
                <Badge className="bg-warning text-warning-foreground border-none py-1 px-3">{t('forProsPage.pricing.growth.badge', 'POPULAR')}</Badge>
                <h3 className="text-2xl font-bold font-headline">{t('forProsPage.pricing.growth.name', 'Business Growth')}</h3>
                <p className="text-muted-foreground text-sm">{t('forProsPage.pricing.growth.desc', 'Perfect to boost your visibility.')}</p>
              </div>
              <div className="text-center py-3 bg-secondary/20 rounded-md border border-border my-4">
                <div className="text-3xl font-black text-white">
                  {growthAnnual} MAD <span className="text-base font-medium opacity-70">{t('forProsPage.pricing.perYear', '/ year')}</span>
                </div>
                <div className="text-xs font-bold text-muted-foreground mt-1">{tf('forProsPage.pricing.perMonth', 'or {amount} MAD/month', { amount: growthMonthly })}</div>
              </div>
              <ul className="space-y-3 flex-grow">
                {growthFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm font-medium text-white">
                    <Star className="w-4 h-4 text-yellow-300 fill-current" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full h-12 rounded-md text-base font-bold shadow-none mt-4" asChild>
                <Link href="/dashboard/premium">
                  {t('forProsPage.pricing.growth.cta', 'Choose Growth')} <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>

            <div className="bg-card p-8 rounded-2xl border border-info/20 space-y-6 shadow-none relative overflow-hidden group h-full flex flex-col">
              <div className="absolute -top-8 -right-8 p-6 opacity-20 transition-transform group-hover:rotate-12">
                <Zap className="w-24 h-24 fill-white" />
              </div>

              <div className="space-y-3 flex-grow">
                <Badge className="bg-orange-500 text-white border-none py-1 px-3">{t('forProsPage.pricing.gold.badge', 'RECOMMENDED')}</Badge>
                <h3 className="text-2xl font-bold font-headline">{t('forProsPage.pricing.gold.name', 'Business Gold')}</h3>
                <p className="text-muted-foreground text-sm">{t('forProsPage.pricing.gold.desc', 'Complete pack: salary benchmark, reporting and acquisition.')}</p>
              </div>
              <div className="text-center py-3 bg-secondary/20 rounded-md border border-border my-4">
                <div className="text-3xl font-black text-white">
                  {goldAnnual} MAD <span className="text-base font-medium opacity-70">{t('forProsPage.pricing.perYear', '/ year')}</span>
                </div>
                <div className="text-xs font-bold text-muted-foreground mt-1">{tf('forProsPage.pricing.perMonth', 'or {amount} MAD/month', { amount: goldMonthly })}</div>
              </div>
              <ul className="space-y-3 flex-grow">
                {goldFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm font-bold text-white">
                    <Zap className="w-4 h-4 text-warning" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full h-12 rounded-md text-base font-extrabold shadow-none mt-4" asChild>
                <Link href="/dashboard/premium">
                  {t('forProsPage.pricing.gold.cta', 'Choose Gold')} <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="premium" className="py-24 lg:py-32 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <Badge variant="outline" className="border-info/20 bg-info/10 text-info px-4 py-1">
              {t('forProsPage.premium.badge', 'PREMIUM BENEFITS')}
            </Badge>
            <h2 className="text-3xl md:text-5xl font-headline font-bold text-foreground tracking-tight">
              {t('forProsPage.premium.title', 'Exclusive premium features')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('forProsPage.premium.subtitle', 'Powerful tools to transform your online presence and attract top talent.')}
            </p>
          </div>

          <PremiumFeatures variant="marketing" userTier={userTier} />
        </div>
      </section>

      <section className="w-full py-24 lg:py-32 bg-background overflow-hidden relative">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 bg-info/10 text-info px-4 py-2 rounded-md text-sm font-bold mb-4">
              <Store className="w-4 h-4" />
              {t('forProsPage.multi.badge', 'MULTI-BUSINESS')}
            </div>
            <h2 className="text-3xl md:text-5xl font-headline font-bold text-foreground tracking-tight">
              {t('forProsPage.multi.title', 'Manage multiple businesses')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('forProsPage.multi.subtitle', 'Perfect for groups and owners of several businesses.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="border-border bg-card shadow-none rounded-2xl overflow-hidden hover:bg-secondary/20 transition-colors">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
                  <Store className="w-5 h-5 text-muted-foreground" />
                  {t('forProsPage.multi.basic.title', 'Basic plan')}
                </CardTitle>
                <div className="text-2xl font-black text-foreground">{t('forProsPage.multi.basic.count', '1 business')}</div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span>{t('forProsPage.multi.basic.f1', 'Complete management of one business')}</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span>{t('forProsPage.multi.basic.f2', 'Personalized dashboard')}</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span>{t('forProsPage.multi.basic.f3', 'Basic analytics')}</span>
                  </li>
                </ul>
                <div className="pt-6 border-t border-border">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{t('forProsPage.multi.basic.price', 'Free')}</div>
                    <p className="text-sm text-muted-foreground">{t('forProsPage.multi.basic.priceDesc', 'Included with your account')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-info/20 bg-card shadow-none rounded-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <Crown className="w-24 h-24 text-info" />
              </div>
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-info">
                  <Crown className="w-5 h-5" />
                  {t('forProsPage.multi.premium.title', 'Premium plan')}
                </CardTitle>
                <div className="text-2xl font-black text-foreground">{t('forProsPage.multi.premium.count', 'Up to 5 businesses')}</div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-sm font-bold text-foreground">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span>{t('forProsPage.multi.premium.f1', 'Multi-business management')}</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm font-bold text-foreground">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span>{t('forProsPage.multi.premium.f2', 'Unified dashboard')}</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm font-bold text-foreground">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span>{t('forProsPage.multi.premium.f3', 'Comparative analytics')}</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm font-bold text-foreground">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span>{t('forProsPage.multi.premium.f4', 'Quick business switching')}</span>
                  </li>
                </ul>
                <div className="pt-6 border-t border-border">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-info">
                      {goldAnnual} MAD {t('forProsPage.pricing.perYear', '/ year')}
                    </div>
                    <p className="text-sm text-muted-foreground">{t('forProsPage.multi.premium.priceDesc', 'For all your businesses')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-16 text-center">
            <Card className="max-w-3xl mx-auto border-info/20 bg-info/10 rounded-2xl overflow-hidden">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-4 flex items-center justify-center gap-2 text-foreground">
                  <Store className="w-6 h-6 text-info" />
                  {t('forProsPage.multi.card.title', 'Ideal for groups')}
                </h3>
                <p className="text-muted-foreground font-medium mb-6">
                  {t('forProsPage.multi.card.desc', 'Manage multiple businesses from one unified dashboard. Switch instantly and track global performance at a glance.')}
                </p>
                <div className="grid grid-cols-3 gap-4 text-sm font-bold">
                  <div className="text-center p-4 bg-card rounded-md border border-border shadow-none">
                    <div className="text-2xl font-black text-info">5+</div>
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{t('forProsPage.multi.card.kpi1', 'Businesses')}</div>
                  </div>
                  <div className="text-center p-4 bg-card rounded-md border border-border shadow-none">
                    <div className="text-2xl font-black text-success">100%</div>
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{t('forProsPage.multi.card.kpi2', 'Unified')}</div>
                  </div>
                  <div className="text-center p-4 bg-card rounded-md border border-border shadow-none">
                    <div className="text-2xl font-black text-warning">24/7</div>
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{t('forProsPage.multi.card.kpi3', 'Priority')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="w-full py-24 lg:py-32 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-headline font-bold text-foreground tracking-tight">
              {t('forProsPage.how.title', 'How to join Pro?')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('forProsPage.how.subtitle', 'Simple and fast to activate your premium features.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-border bg-secondary/20 rounded-2xl p-6 hover:bg-secondary/30 transition-colors">
              <CardHeader>
                <div className="mx-auto bg-card text-info rounded-md border border-border shadow-none w-16 h-16 flex items-center justify-center mb-4 text-2xl font-black italic">1</div>
                <CardTitle className="text-xl font-bold text-foreground">{t('forProsPage.how.step1.title', 'Make the payment')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground font-medium leading-relaxed">
                  {t('forProsPage.how.step1.desc', 'Transfer the agreed amount via bank account or secure payment partners.')}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-border bg-secondary/20 rounded-2xl p-6 hover:bg-secondary/30 transition-colors">
              <CardHeader>
                <div className="mx-auto bg-card text-info rounded-md border border-border shadow-none w-16 h-16 flex items-center justify-center mb-4 text-2xl font-black italic">2</div>
                <CardTitle className="text-xl font-bold text-foreground">{t('forProsPage.how.step2.title', 'Send proof')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground font-medium leading-relaxed">
                  {t('forProsPage.how.step2.desc', 'Submit your transaction reference from dashboard or contact dedicated support.')}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-border bg-secondary/20 rounded-2xl p-6 hover:bg-secondary/30 transition-colors">
              <CardHeader>
                <div className="mx-auto bg-info text-white rounded-md shadow-none w-16 h-16 flex items-center justify-center mb-4 text-2xl font-black italic">3</div>
                <CardTitle className="text-xl font-bold text-foreground">{t('forProsPage.how.step3.title', 'Activate premium')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground font-medium leading-relaxed">
                  {t('forProsPage.how.step3.desc', 'Once verified, your pro badge and premium features are activated immediately.')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-32 bg-card text-foreground overflow-hidden relative border-t border-border">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-info/10 rounded-md blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 text-center space-y-10 relative z-10">
          <div className="w-20 h-20 bg-info rounded-2xl flex items-center justify-center text-white mx-auto transform rotate-12 shadow-none">
            <Target className="w-10 h-10" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-headline font-bold text-white max-w-4xl mx-auto leading-tight tracking-tight">
            {t('forProsPage.cta.title', 'Ready to dominate your local market?')}
          </h2>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button size="lg" asChild className="rounded-md bg-info text-white hover:opacity-90 px-10 py-8 text-xl font-bold shadow-none">
              <Link href="/pour-les-pros/signup">{t('forProsPage.cta.start', 'Start my pro account')}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-md border-border px-10 py-8 text-xl font-bold">
              <Link href="/dashboard">{t('forProsPage.cta.subscribe', 'Subscribe to premium')}</Link>
            </Button>
          </div>
          <p className="text-muted-foreground font-medium">{t('forProsPage.cta.subtitle', 'Join companies turning attractiveness into success.')}</p>
        </div>
      </section>
    </div>
  );
}
