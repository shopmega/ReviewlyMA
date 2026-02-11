
import { getSiteSettings } from '@/lib/data';

export default async function PrivacyPage() {
  const siteSettings = await getSiteSettings();
  const siteName = siteSettings.site_name || 'Platform';

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 font-headline">Politique de confidentialité de {siteName}</h1>
      <div className="prose prose-sm dark:prose-invert">
        <h2>1. Collecte des données</h2>
        <p>Nous collectons les informations que vous nous fournissez lors de votre inscription ou de la publication d'un avis sur {siteName}.</p>
        
        <h2>2. Utilisation des données</h2>
        <p>Vos données sont utilisées pour gérer votre compte, afficher vos avis et améliorer nos services.</p>
        
        <h2>3. Protection des données</h2>
        <p>Nous mettons en œuvre des mesures de sécurité pour protéger vos informations personnelles.</p>
        
        <h2>4. Vos droits</h2>
        <p>Vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles.</p>
      </div>
    </div>
  );
}
