import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-3xl font-bold">404 - Page non trouvee</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          La page demandee est introuvable ou a ete deplacee.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="rounded-lg bg-primary px-4 py-2 text-primary-foreground font-semibold">
            Retour a l'accueil
          </Link>
          <Link href="/businesses" className="rounded-lg border border-border px-4 py-2 font-semibold">
            Explorer les entreprises
          </Link>
        </div>
      </section>
    </main>
  );
}
