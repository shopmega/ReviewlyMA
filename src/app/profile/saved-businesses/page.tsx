import { getSavedBusinesses } from '@/app/actions/user';
import { BusinessCard } from '@/components/shared/BusinessCard';
import { getSiteSettings } from '@/lib/data';
import { notFound } from 'next/navigation';

export default async function SavedBusinessesPage() {
  let savedBusinesses = [];
  let siteName = 'Platform';

  try {
    savedBusinesses = await getSavedBusinesses();
    const siteSettings = await getSiteSettings();
    siteName = siteSettings.site_name || 'Platform';
  } catch (error) {
    // If user is not authenticated, show empty state
    if (error instanceof Error && error.message === 'User not authenticated') {
      // User is not logged in, show appropriate message
    } else {
      // Re-throw other errors
      throw error;
    }
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="relative w-full h-40 bg-gradient-to-r from-primary/80 to-blue-900/80 overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-[url('/patterns/moroccan-pattern.svg')] opacity-10" />
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-16 relative z-10 pb-12">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8 text-white drop-shadow-md">
            <h1 className="text-3xl font-bold font-headline mb-1">Mes Favoris</h1>
            <p className="text-white/80">
              {savedBusinesses.length > 0
                ? `Vous avez ${savedBusinesses.length} entreprise${savedBusinesses.length > 1 ? 's' : ''} enregistrée${savedBusinesses.length > 1 ? 's' : ''}`
                : 'Retrouvez ici vos entreprises favorites'}
            </p>
          </header>

          <div className="bg-background/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl min-h-[400px]">
            {savedBusinesses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedBusinesses.map((business: any) => (
                  <BusinessCard key={business.id} business={business} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="mx-auto max-w-md flex flex-col items-center">
                  <div className="bg-secondary/10 rounded-full w-20 h-20 flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Aucun favori pour le moment</h3>
                  <p className="text-muted-foreground mb-6">
                    Sauvegardez les restaurants, riads ou services qui vous intéressent pour les retrouver facilement.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}