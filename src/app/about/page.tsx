
import { getSiteSettings } from '@/lib/data';

export default async function AboutPage() {
  const siteSettings = await getSiteSettings();
  const siteName = siteSettings.site_name || 'Platform';

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 font-headline">À propos de {siteName}</h1>
      <div className="prose prose-lg dark:prose-invert">
        <p>
          {siteName} est la plateforme de référence pour les avis sur les entreprises au Maroc. 
          Notre mission est d'apporter de la transparence et d'aider les consommateurs et les professionnels 
          à mieux se comprendre.
        </p>
        <p>
          Nous croyons que le partage d'expériences authentiques est essentiel pour améliorer la qualité 
          des services et produits proposés sur le marché marocain.
        </p>
      </div>
    </div>
  );
}
