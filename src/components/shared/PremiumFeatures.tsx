'use client';

import { ShieldCheck, Star, MessageSquare, TrendingUp, Zap, CreditCard, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { SubscriptionTier } from '@/lib/types';
import { hasTierAccess } from '@/lib/tier-utils';

interface PremiumFeature {
  title: string;
  description: string;
  icon: React.ElementType;
  requiredTier: SubscriptionTier;
}

interface PremiumFeaturesProps {
  variant?: 'marketing' | 'dashboard';
  userTier?: SubscriptionTier;
}

export const marketingFeatures: PremiumFeature[] = [
  {
    title: 'Badge de Confiance GOLD',
    description: 'Affichez votre badge premium pour gagner la confiance des employés et candidats.',
    icon: ShieldCheck,
    requiredTier: 'growth'
  },
  {
    title: 'Visibilité Prioritaire',
    description: 'Votre entreprise apparaît en haut des recherches.',
    icon: TrendingUp,
    requiredTier: 'growth'
  },
  {
    title: 'Statistiques Avancées',
    description: 'Accédez à des analyses détaillées sur votre réputation employeur.',
    icon: Star,
    requiredTier: 'growth'
  },
  {
    title: 'Suppression des Publicités Concurrentes',
    description: 'Éliminez la concurrence publicitaire sur votre page.',
    icon: ShieldCheck,
    requiredTier: 'growth'
  },
  {
    title: 'Communication avec les Candidats',
    description: 'Engagez directement les talents potentiels.',
    icon: MessageSquare,
    requiredTier: 'gold'
  },
  {
    title: 'Contenu Épinglé',
    description: 'Mettez en avant vos offres d\'emploi et annonces importantes.',
    icon: Zap,
    requiredTier: 'gold'
  },
  {
    title: 'Support Prioritaire',
    description: 'Bénéficiez d\'un service client exclusif pour les entreprises.',
    icon: CreditCard,
    requiredTier: 'gold'
  },
];

export const dashboardFeatures: Array<{
  icon: React.ElementType;
  text: string;
  requiredTier: SubscriptionTier;
}> = [
    { icon: ShieldCheck, text: "Badge de confiance GOLD sur votre profil", requiredTier: 'growth' },
    { icon: TrendingUp, text: "Placement prioritaire dans les résultats", requiredTier: 'growth' },
    { icon: Star, text: "Accès complet aux statistiques détaillées sur votre réputation employeur", requiredTier: 'growth' },
    { icon: ShieldCheck, text: "Suppression des publicités concurrentes", requiredTier: 'growth' },
    { icon: MessageSquare, text: "Communication directe avec les candidats", requiredTier: 'gold' },
    { icon: Zap, text: "Possibilité d'épingler du contenu important", requiredTier: 'gold' }
  ];

export default function PremiumFeatures({ variant = 'marketing', userTier = 'standard' }: PremiumFeaturesProps) {
  if (variant === 'marketing') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {marketingFeatures.map((feature, index) => {
          const hasAccess = hasTierAccess(feature.requiredTier, userTier);
          return (
            <Card key={index} className={`text-center border-2 ${hasAccess ? 'border-primary/10' : 'border-red-200'} hover:border-primary/30 transition-all group hover:-translate-y-1`}>
              <CardHeader className="pb-4">
                <div className={`mx-auto bg-gradient-to-br ${hasAccess ? 'from-primary to-amber-500' : 'from-gray-400 to-gray-600'} text-white rounded-full w-16 h-16 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {hasAccess ? <feature.icon className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
                </div>
                <CardTitle className={`text-xl ${hasAccess ? '' : 'opacity-60'}`}>
                  {feature.title}
                  {!hasAccess && ` (${feature.requiredTier === 'growth' ? 'Growth' : 'Gold'} requis)`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`${hasAccess ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Dashboard variant
  return (
    <ul className="space-y-4">
      {dashboardFeatures.map((item, i) => {
        const hasAccess = hasTierAccess(item.requiredTier, userTier);
        return (
          <li key={i} className="flex items-center gap-3 text-sm">
            <div className={`p-1.5 rounded-full ${hasAccess ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-400/10 text-gray-500'}`}>
              {hasAccess ? <item.icon className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <span className={hasAccess ? '' : 'opacity-60 line-through'}>
              {item.text}
              {!hasAccess && ` (${item.requiredTier === 'growth' ? 'Growth' : 'Gold'} requis)`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
