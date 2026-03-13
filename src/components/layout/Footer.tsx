import Link from 'next/link';
import { Facebook, Instagram, Twitter, Linkedin, Mail, MapPin, ExternalLink } from 'lucide-react';
import { getSiteSettings, SiteSettings } from '@/lib/data';
import { getServerTranslator } from '@/lib/i18n/server';
import { getSiteName } from '@/lib/site-config';

export async function Footer({ settings }: { settings?: SiteSettings }) {
  const currentYear = new Date().getFullYear();
  const siteSettings = settings || (await getSiteSettings());
  const siteName = getSiteName(siteSettings);
  const { t, tf } = await getServerTranslator();
  const safeCopyrightText = (siteSettings.copyright_text || '')
    .replace(/<[^>]*>/g, '')
    .trim();

  const discoveryLinks = [
    { href: '/businesses', label: t('footer.links.directory', 'Annuaire entreprises') },
    { href: '/categories', label: t('footer.links.categories', 'Categories') },
    { href: '/villes', label: t('footer.links.cities', 'Villes') },
    { href: '/top-rated', label: t('footer.links.topRated', 'Les mieux notes') },
    { href: '/recently-added', label: t('footer.links.newest', 'Nouveautes') },
  ];

  const resourceLinks = [
    { href: '/salaires', label: t('footer.links.salaries', 'Salaires au Maroc') },
    { href: '/salaires/comparaison', label: t('footer.links.salaryCompare', 'Comparateur de salaires') },
    { href: '/blog', label: t('footer.links.blog', 'Blog') },
    { href: '/reports', label: t('footer.links.reports', 'Reports') },
    { href: '/rules', label: t('footer.links.charter', 'Charte de confiance') },
  ];

  const corporateLinks = [
    { href: '/about', label: t('footer.links.about', 'A propos') },
    { href: '/pro', label: t('footer.links.forPros', 'Pour les professionnels'), highlight: true },
    { href: '/support', label: t('footer.links.support', 'Support') },
    { href: '/suggest', label: t('footer.links.suggest', 'Suggerer un etablissement') },
    { href: '/terms', label: t('footer.terms', 'Termes') },
    { href: '/privacy', label: t('footer.privacy', 'Confidentialite') },
  ];

  return (
    <footer className="border-t border-border bg-secondary/20 pb-12 pt-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-20 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-24">
          <div className="space-y-6">
            <Link href="/" className="group flex items-center gap-2">
              <span className="font-headline text-2xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                {siteName.includes(' ') ? (
                  <>
                    {siteName.substring(0, siteName.lastIndexOf(' '))}{' '}
                    <span className="text-primary">{siteName.substring(siteName.lastIndexOf(' ') + 1)}</span>
                  </>
                ) : (
                  siteName
                )}
              </span>
            </Link>
            <p className="max-w-xs text-sm font-medium leading-relaxed text-muted-foreground">
              {siteSettings.site_description ||
                t(
                  'footer.defaultDescription',
                  'La plateforme de reference pour decouvrir et evaluer les employeurs au Maroc.'
                )}
            </p>
            <div className="flex items-center gap-3 pt-2">
              {[
                { icon: Facebook, url: siteSettings.facebook_url },
                { icon: Instagram, url: siteSettings.instagram_url },
                { icon: Twitter, url: siteSettings.twitter_url },
                { icon: Linkedin, url: siteSettings.linkedin_url },
              ].map(
                (social, idx) =>
                  social.url && (
                    <a
                      key={idx}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all hover:-translate-y-1 hover:bg-primary hover:text-white"
                    >
                      <social.icon className="h-4 w-4" />
                    </a>
                  )
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-headline text-xs font-bold uppercase tracking-widest text-foreground/80">
              {t('footer.discovery', 'Discovery')}
            </h4>
            <nav className="flex flex-col gap-3 text-sm font-medium text-muted-foreground">
              {discoveryLinks.map((link) => (
                <Link key={link.href} href={link.href} className="inline-block transition-colors duration-200 hover:translate-x-1 hover:text-primary">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-6">
            <h4 className="font-headline text-xs font-bold uppercase tracking-widest text-foreground/80">
              {t('footer.resources', 'Resources')}
            </h4>
            <nav className="flex flex-col gap-3 text-sm font-medium text-muted-foreground">
              {resourceLinks.map((link) => (
                <Link key={link.href} href={link.href} className="inline-block transition-colors duration-200 hover:translate-x-1 hover:text-primary">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-6">
            <h4 className="font-headline text-xs font-bold uppercase tracking-widest text-foreground/80">
              {t('footer.corporate', 'Corporate')}
            </h4>
            <nav className="flex flex-col gap-3 text-sm font-medium text-muted-foreground">
              {corporateLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-block transition-colors duration-200 hover:translate-x-1 hover:text-primary ${
                    link.highlight ? 'font-bold text-primary' : ''
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="space-y-4 pt-2">
              <h4 className="font-headline text-[10px] font-bold uppercase tracking-widest text-foreground/60">
                {t('footer.contact', 'Contact')}
              </h4>
              <div className="flex flex-col gap-4 text-sm">
                {siteSettings.contact_email && (
                  <div className="group flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                      <Mail className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-muted-foreground transition-colors group-hover:text-primary">
                      {siteSettings.contact_email}
                    </span>
                  </div>
                )}
                {siteSettings.office_address && (
                  <div className="group flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-muted-foreground transition-colors group-hover:text-primary">
                      {siteSettings.office_address}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2">
              <h4 className="mb-3 font-headline text-[10px] font-bold uppercase tracking-widest text-foreground/60">
                {t('footer.hrPartner', 'Partenaire RH')}
              </h4>
              <a
                href={siteSettings.partner_app_url || 'https://monrh.vercel.app/'}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-1 rounded-xl border border-primary/10 bg-primary/5 p-3 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  {siteSettings.partner_app_name || 'MOR RH'}
                  <ExternalLink className="h-3 w-3" />
                </span>
                <span className="text-[10px] leading-tight text-muted-foreground">
                  {t('footer.partnerTagline', 'Simulateurs salaire, CNSS et droits du travail')}
                </span>
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-6 border-t border-border pt-8 md:flex-row">
          <p className="text-xs font-semibold text-muted-foreground">
            {safeCopyrightText ? (
              <>{safeCopyrightText}</>
            ) : (
              <>{tf('footer.copyright', '© {year} {siteName}. Tous droits reserves.', { year: currentYear, siteName })}</>
            )}
          </p>
          <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
            <Link href="/terms" className="transition-colors hover:text-primary">
              {t('footer.terms', 'Termes')}
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-primary">
              {t('footer.privacy', 'Confidentialite')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
