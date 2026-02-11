
import { getSiteSettings } from '@/lib/data';

export default async function TermsPage() {
  const siteSettings = await getSiteSettings();
  const siteName = siteSettings.site_name || 'Platform';

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 font-headline">Conditions d'utilisation de {siteName}</h1>
      <div className="prose prose-sm dark:prose-invert">
        <h2>1. Acceptation des conditions</h2>
        <p>En accédant à ce site, vous acceptez d'être lié par ces conditions d'utilisation.</p>
        
        <h2>2. Utilisation du site</h2>
        <p>Vous vous engagez à utiliser le site de manière licite et à ne pas porter atteinte aux droits de tiers.</p>
        
        <h2>3. Avis et contenus</h2>
        <p>Les avis publiés doivent être véridiques et basés sur des expériences réelles. Nous nous réservons le droit de modérer ou supprimer tout contenu inapproprié.</p>
        
        <h2>4. Propriété intellectuelle</h2>
        <p>Tous les contenus présents sur le site sont protégés par le droit d'auteur.</p>
      </div>
    </div>
  );
}
