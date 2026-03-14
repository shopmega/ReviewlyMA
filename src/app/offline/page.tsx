import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Vous etes hors ligne',
  description: 'Revenez en ligne pour acceder a toutes les fonctionnalites.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Connexion indisponible</h1>
      <p className="text-sm leading-6 text-muted-foreground">
        Vous semblez hors ligne. Verifiez votre connexion et reessayez.
      </p>
      <Link
        href="/"
        className="inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
      >
        Retour a l&apos;accueil
      </Link>
    </section>
  );
}
