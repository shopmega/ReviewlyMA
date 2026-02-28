import Link from 'next/link';
import { Facebook, Instagram, Twitter, Linkedin, Mail, MapPin, ExternalLink } from 'lucide-react';
import { getSiteSettings, SiteSettings } from '@/lib/data';
import { getServerTranslator } from '@/lib/i18n/server';

export async function Footer({ settings }: { settings?: SiteSettings }) {
  const currentYear = new Date().getFullYear();
  const siteSettings = settings || (await getSiteSettings());
  const siteName = siteSettings.site_name || 'Platform';
  const { t, tf } = await getServerTranslator();
  const safeCopyrightText = (siteSettings.copyright_text || '')
    .replace(/<[^>]*>/g, '')
    .trim();

  return (
    <footer className="bg-secondary/20 pt-24 pb-12 border-t border-border">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-24 mb-20">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-2xl font-bold font-headline tracking-tight text-foreground group-hover:text-primary transition-colors">
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
            <p className="text-sm leading-relaxed text-muted-foreground max-w-xs font-medium">
              {siteSettings.site_description ||
                t(
                  'footer.defaultDescription',
                  'La plateforme de reference pour decouvrir et noter les meilleures entreprises au Maroc.'
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
                      className="h-10 w-10 flex items-center justify-center bg-card hover:bg-primary hover:text-white rounded-full transition-all text-muted-foreground shadow-sm border border-border hover:-translate-y-1"
                    >
                      <social.icon className="h-4 w-4" />
                    </a>
                  )
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-bold font-headline uppercase tracking-widest text-xs text-foreground/80">
              {t('footer.discover', 'Decouvrir')}
            </h4>
            <nav className="flex flex-col gap-3 text-sm font-medium text-muted-foreground">
              <Link href="/top-rated" className="hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block">
                {t('footer.links.topRated', 'Les mieux notes')}
              </Link>
              <Link href="/recently-added" className="hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block">
                {t('footer.links.newest', 'Nouveautes')}
              </Link>
              <Link href="/villes" className="hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block">
                {t('footer.links.byCity', 'Explorer par ville')}
              </Link>
              <Link href="/salaires" className="hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block">
                {t('footer.links.salaries', 'Salaires au Maroc')}
              </Link>
              <Link href="/salaires/comparaison" className="hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block">
                {t('footer.links.salaryCompare', 'Comparateur de salaires')}
              </Link>
              <Link href="/pour-les-pros" className="hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block font-bold text-primary">
                {t('footer.links.forPros', 'Pour les professionnels')}
              </Link>
              <Link href="/premium" className="hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block">
                {t('footer.links.premium', 'Abonnement premium')}
              </Link>
              <Link href="/rules" className="hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block">
                {t('footer.links.charter', 'Charte de confiance')}
              </Link>
              <Link href="/support" className="hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block">
                {t('footer.links.support', 'Support')}
              </Link>
              <Link href="/suggest" className="hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block">
                {t('footer.links.suggest', 'Suggérer un etablissement')}
              </Link>
            </nav>
          </div>

          <div className="space-y-6">
            <h4 className="font-bold font-headline uppercase tracking-widest text-xs text-foreground/80">
              {t('footer.sectors', 'Secteurs')}
            </h4>
            <nav className="flex flex-col gap-3 text-sm font-medium text-muted-foreground">
              <Link href="/ville/casablanca/technologie-it" className="hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block">
                {t('footer.links.techCasa', 'Tech & IT a Casablanca')}
              </Link>
              <Link href="/ville/rabat/banque-finance" className="hover:text-primary transition-colors hover:translate-x-1 duration-200 inline-block">
                {t('footer.links.financeRabat', 'Finance a Rabat')}
              </Link>
              <Link href="/pour-les-pros" className="hover:text-amber-600 transition-colors hover:translate-x-1 duration-200 inline-block font-bold">
                {t('footer.links.recruiters', 'Espace recruteurs')}
              </Link>
            </nav>

            <div className="pt-4">
              <h4 className="font-bold font-headline uppercase tracking-widest text-[10px] text-foreground/60 mb-3">
                {t('footer.hrPartner', 'Partenaire RH')}
              </h4>
              <a
                href={siteSettings.partner_app_url || 'https://monrh.vercel.app/'}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-1 p-3 rounded-xl bg-primary/5 border border-primary/10 hover:border-primary/30 transition-all hover:shadow-sm"
              >
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  {siteSettings.partner_app_name || 'MOR RH'}
                  <ExternalLink className="w-3 h-3" />
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {t('footer.partnerTagline', 'Simulateurs salaire, CNSS et droits du travail')}
                </span>
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-bold font-headline uppercase tracking-widest text-xs text-foreground/80">
              {t('footer.contact', 'Contact')}
            </h4>
            <div className="flex flex-col gap-4 text-sm">
              {siteSettings.contact_email && (
                <div className="flex items-center gap-4 group">
                  <div className="h-10 w-10 flex items-center justify-center bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span className="text-muted-foreground font-medium group-hover:text-primary transition-colors">
                    {siteSettings.contact_email}
                  </span>
                </div>
              )}
              {siteSettings.office_address && (
                <div className="flex items-center gap-4 group">
                  <div className="h-10 w-10 flex items-center justify-center bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span className="text-muted-foreground font-medium group-hover:text-primary transition-colors">
                    {siteSettings.office_address}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs font-semibold text-muted-foreground">
            {safeCopyrightText ? (
              <>{safeCopyrightText}</>
            ) : (
              <>{tf('footer.copyright', '© {year} {siteName}. Tous droits reserves.', { year: currentYear, siteName })}</>
            )}
          </p>
          <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
            <Link href="/terms" className="hover:text-primary transition-colors">
              {t('footer.terms', 'Termes')}
            </Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">
              {t('footer.privacy', 'Confidentialite')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
