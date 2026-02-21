'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Calendar,
  ShieldCheck,
  Star,
  Zap,
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react';
import PremiumFeatures, { dashboardFeatures } from '@/components/shared/PremiumFeatures';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getSiteSettings } from '@/lib/data';
import Link from 'next/link';
import { isPaidTier } from '@/lib/tier-utils';

export default function DashboardPremiumPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedTier, setSelectedTier] = useState<'growth' | 'gold'>('gold');
  const { toast } = useToast();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setProfile(profileData);

        // Get pending payments
        const { data: payments } = await supabase
          .from('premium_payments')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        setPendingPayments(payments || []);

        const settings = await getSiteSettings();
        setSiteSettings(settings);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleSubmitPayment = async () => {
    if (!paymentReference.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer une référence de paiement valide.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
      const response = await fetch('/api/premium-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_reference: paymentReference.trim(),
          amount_usd: billingCycle === 'yearly'
            ? (selectedTier === 'gold' ? (siteSettings?.tier_gold_annual_price || 2900) : (siteSettings?.tier_growth_annual_price || 990))
            : (selectedTier === 'gold' ? (siteSettings?.tier_gold_monthly_price || 299) : (siteSettings?.tier_growth_monthly_price || 99)),
          currency: 'MAD',
          payment_method: 'offline_transfer',
          target_tier: selectedTier,
          notes: `Abonnement ${selectedTier.toUpperCase()} ${billingCycle === 'yearly' ? 'Annuel' : 'Mensuel'}`,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        const detail =
          payload?.error?.message ||
          payload?.error?.details ||
          payload?.message ||
          'Soumission Ã©chouÃ©e.';
        throw new Error(detail);
      }

      toast({
        title: 'Succès',
        description: 'Votre référence de paiement a été soumise pour vérification.',
      });
      setPaymentReference('');

      // Refresh pending payments
      const { data: payments } = await supabase
        .from('premium_payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setPendingPayments(payments || []);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Soumission échouée.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPremium = profile?.tier && isPaidTier(profile.tier);
  const currentTier = (profile?.tier as 'standard' | 'growth' | 'gold') || 'standard';
  const premiumExpiresAt = profile?.premium_expires_at ? new Date(profile.premium_expires_at) : null;
  const isExpired = premiumExpiresAt && premiumExpiresAt < new Date();

  const daysRemaining = premiumExpiresAt
    ? Math.ceil((premiumExpiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const growthPlanFeatures = dashboardFeatures.filter((feature) => feature.requiredTier === 'growth');
  const goldPlanFeatures = dashboardFeatures;

  const getTierPrice = (tier: 'growth' | 'gold', cycle: 'monthly' | 'yearly') => {
    if (cycle === 'yearly') {
      return tier === 'gold' ? (siteSettings?.tier_gold_annual_price || 2900) : (siteSettings?.tier_growth_annual_price || 990);
    }
    return tier === 'gold' ? (siteSettings?.tier_gold_monthly_price || 299) : (siteSettings?.tier_growth_monthly_price || 99);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold font-headline">Abonnement Business</h1>
            {isPremium && !isExpired && (
              <Badge className={`${currentTier === 'gold' ? 'bg-amber-600' : 'bg-amber-400'} text-white border-none px-3 py-1 rounded-full flex gap-1 items-center shadow-lg`}>
                {currentTier === 'gold' ? <Zap className="w-3 h-3 fill-current" /> : <Star className="w-3 h-3 fill-current" />}
                {currentTier.toUpperCase()} ACTIF
              </Badge>
            )}
            {isExpired && (
              <Badge variant="destructive" className="rounded-full px-3 py-1">
                EXPIRÉ
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {isPremium && !isExpired
              ? `Vous profitez actuellement du plan ${currentTier.toUpperCase()}.`
              : "Boostez la visibilité et la conversion de votre entreprise avec nos offres Business."}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-500 uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Statut
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isPremium && !isExpired ? (currentTier === 'gold' ? 'Business GOLD' : 'Business Growth') : 'Gratuit'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isPremium && !isExpired
                ? (currentTier === 'gold' ? 'Lead Gen & Priorité' : 'Confiance & Visibilité')
                : 'Visibilité limitée'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary uppercase flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Validité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {premiumExpiresAt ? premiumExpiresAt.toLocaleDateString('fr-FR') : '--/--/----'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isExpired
                ? 'Abonnement terminé'
                : premiumExpiresAt
                  ? `${daysRemaining} jours restants`
                  : 'Aucun abonnement actif'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-sky-200 bg-sky-50/40 dark:bg-sky-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-sky-700 dark:text-sky-400 uppercase flex items-center gap-2">
              <Zap className="w-4 h-4" /> Prix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getTierPrice(selectedTier, billingCycle)} MAD
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-amber-600 font-bold">
              Plan {selectedTier.toUpperCase()} ({billingCycle === 'yearly' ? 'Annuel' : 'Mensuel'})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Show tier selection for both non-premium and existing premium users */}
      <div className="flex flex-col items-center gap-6 mb-8">
        <div className="bg-muted p-1 rounded-xl flex gap-1">
          <Button
            variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingCycle('monthly')}
            className="rounded-lg px-6"
          >
            Mensuel
          </Button>
          <Button
            variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingCycle('yearly')}
            className="rounded-lg px-6"
          >
            Annuel
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
          <Card
            className={`cursor-pointer transition-all border-2 ${selectedTier === 'growth' ? 'border-amber-400 bg-amber-50/10' : 'border-transparent'}`}
            onClick={() => setSelectedTier('growth')}
          >
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <Star className={`w-6 h-6 ${selectedTier === 'growth' ? 'text-amber-500 fill-current' : 'text-slate-400'}`} />
              <span className="font-bold">GROWTH</span>
              <span className="text-sm font-bold text-primary">{getTierPrice('growth', billingCycle)} MAD</span>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all border-2 ${selectedTier === 'gold' ? 'border-amber-600 bg-amber-50/10' : 'border-transparent'}`}
            onClick={() => setSelectedTier('gold')}
          >
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <Zap className={`w-6 h-6 ${selectedTier === 'gold' ? 'text-amber-600 fill-current' : 'text-slate-400'}`} />
              <span className="font-bold">GOLD</span>
              <span className="text-sm font-bold text-primary">{getTierPrice('gold', billingCycle)} MAD</span>
            </CardContent>
          </Card>
        </div>

        {/* Show current tier info for existing premium users */}
        {isPremium && (
          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground">
              Vous êtes actuellement sur le plan <span className="font-bold text-amber-600">{currentTier.toUpperCase()}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Sélectionnez un plan ci-dessus pour changer ou renouveler
            </p>
          </div>
        )}
      </div>

      <Card className="border-primary/15 bg-background">
        <CardHeader>
          <CardTitle>Fonctionnalités par plan</CardTitle>
          <CardDescription>
            Comparez Growth et Gold avant de soumettre votre paiement.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`rounded-xl border p-4 ${selectedTier === 'growth' ? 'border-amber-400 bg-amber-50/20' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-current" />
                <p className="font-bold">Plan GROWTH</p>
              </div>
              <Badge variant="outline">{getTierPrice('growth', billingCycle)} MAD</Badge>
            </div>
            <ul className="space-y-2">
              {growthPlanFeatures.map((feature, idx) => (
                <li key={`growth-feature-${idx}`} className="text-sm flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{feature.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`rounded-xl border p-4 ${selectedTier === 'gold' ? 'border-amber-600 bg-amber-50/20' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-600 fill-current" />
                <p className="font-bold">Plan GOLD</p>
              </div>
              <Badge variant="outline">{getTierPrice('gold', billingCycle)} MAD</Badge>
            </div>
            <ul className="space-y-2">
              {goldPlanFeatures.map((feature, idx) => (
                <li key={`gold-feature-${idx}`} className="text-sm flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{feature.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pendingPayments.length > 0 && (
          <Card className="lg:col-span-2 border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                <Clock className="w-5 h-5" /> Vérification en cours
              </CardTitle>
              <CardDescription className="text-blue-600">
                Nous avons bien reçu vos références de paiement. Nos administrateurs les vérifient actuellement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-white/50 border border-blue-100">
                    <div>
                      <p className="font-mono text-sm font-bold">{payment.payment_reference}</p>
                      <p className="text-xs text-muted-foreground">
                        Plan {payment.target_tier?.toUpperCase()} - Soumis le {new Date(payment.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                      En attente
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Soumettre un Paiement
            </CardTitle>
            <CardDescription>
              Entrez la référence de votre virement ou versement pour activer/renouveler votre abonnement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {/* Bank Transfer Option */}
              {(siteSettings?.payment_methods_enabled?.includes('bank_transfer') || !siteSettings?.payment_methods_enabled) && (
                <div className="p-4 rounded-xl bg-muted/50 border space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Banque:</span>
                    <span className="font-medium">{siteSettings?.payment_bank_name || 'BMCE Bank'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">RIB:</span>
                    <span className="font-medium">{siteSettings?.payment_rib_number || '011 780 0000 1234567890 12 34'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bénéficiaire:</span>
                    <span className="font-medium">{siteSettings?.payment_beneficiary || `${siteSettings?.site_name || 'Platform'} SARL`}</span>
                  </div>
                </div>
              )}

              {/* Chari.ma Option */}
              {siteSettings?.payment_methods_enabled?.includes('chari_ma') && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-green-800">Paiement via Chari.ma</span>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">NOUVEAU</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lien:</span>
                    <a
                      href={siteSettings?.payment_chari_url || 'https://chari.ma/avis'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-green-600 hover:underline"
                    >
                      Ouvrir Chari.ma
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Effectuez le paiement via Chari.ma et soumettez la référence de transaction ci-dessous.
                  </p>
                </div>
              )}

              {/* Other Payment Methods */}
              {siteSettings?.payment_methods_enabled?.includes('paypal') && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-blue-800">Paiement PayPal</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Bientôt disponible. Contactez le support pour plus d'informations.
                  </p>
                </div>
              )}

              {siteSettings?.payment_methods_enabled?.includes('stripe') && (
                <div className="p-4 rounded-xl bg-sky-50 border border-sky-200">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sky-800">Paiement Stripe</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Bientôt disponible. Contactez le support pour plus d'informations.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Référence de transaction</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Ex: T123456789"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button onClick={handleSubmitPayment} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Vos Avantages Premium
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PremiumFeatures variant="dashboard" userTier={currentTier || 'standard'} />
            <Button variant="outline" className="w-full mt-6 rounded-xl" asChild>
              <Link href="/premium">Voir tous les détails</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
