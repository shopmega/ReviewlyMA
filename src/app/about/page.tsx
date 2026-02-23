import { getSiteSettings } from '@/lib/data';
import { getServerTranslator } from '@/lib/i18n/server';

export default async function AboutPage() {
  const siteSettings = await getSiteSettings();
  const siteName = siteSettings.site_name || 'Platform';
  const { t, tf } = await getServerTranslator();

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 font-headline">
        {tf('about.title', 'A propos de {siteName}', { siteName })}
      </h1>
      <div className="prose prose-lg dark:prose-invert">
        <p>
          {tf(
            'about.p1',
            "{siteName} est la plateforme de reference pour les avis sur les entreprises au Maroc. Notre mission est d'apporter de la transparence et d'aider les consommateurs et les professionnels a mieux se comprendre.",
            { siteName }
          )}
        </p>
        <p>
          {t(
            'about.p2',
            "Nous croyons que le partage d'experiences authentiques est essentiel pour ameliorer la qualite des services et produits proposes sur le marche marocain."
          )}
        </p>
      </div>
    </div>
  );
}
