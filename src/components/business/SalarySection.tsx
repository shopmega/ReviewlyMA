'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { submitSalary } from '@/app/actions/salary';
import { getSalaryAlertSubscriptionStatus } from '@/app/actions/salary-alerts';
import type { SalaryEntry, SalaryStats } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Lock, LogIn, Sparkles, ShieldCheck, CalendarClock, TrendingUp } from 'lucide-react';
import { useI18n } from '@/components/providers/i18n-provider';
import { hasSufficientSampleSize, MIN_PUBLIC_SAMPLE_SIZE } from '@/lib/salary-policy';
import { SalaryAlertToggleButton } from '@/components/salaries/SalaryAlertToggleButton';

type SalarySectionProps = {
  businessId: string;
  businessCity?: string;
  stats: SalaryStats;
  salaries: SalaryEntry[];
  roles?: string[];
  departments?: string[];
  intervals?: Array<{ id: string; label: string; min: number; max: number }>;
};

function formatMoneyMAD(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '-';
  return `${Math.round(value).toLocaleString('fr-MA')} MAD`;
}

export function SalarySection({
  businessId,
  businessCity,
  stats,
  salaries,
  roles = [],
  departments = [],
  intervals = [],
}: SalarySectionProps) {
  const { t, tf } = useI18n();
  const [state, formAction] = useActionState(submitSalary, { status: 'idle', message: '' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [isCompanyAlertSubscribed, setIsCompanyAlertSubscribed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: t('common.success', 'Succes'), description: state.message });
      formRef.current?.reset();
      setIsFormOpen(false);
      router.refresh();
      return;
    }
    if (state.status === 'error' && state.message) {
      toast({ title: t('common.error', 'Erreur'), description: state.message, variant: 'destructive' });
    }
  }, [state.status, state.message, toast, router, t]);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const syncAuthState = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error || !data.user) {
        setAuthStatus('unauthenticated');
        return;
      }
      setAuthStatus('authenticated');
    };

    syncAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthStatus(session?.user ? 'authenticated' : 'unauthenticated');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const wantsShareFromQuery = searchParams.get('shareSalary') === '1';
    const wantsShareFromHash = typeof window !== 'undefined' && window.location.hash === '#salaries';
    if (wantsShareFromQuery || wantsShareFromHash) {
      setIsFormOpen(true);
    }
  }, [authStatus, searchParams]);

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      setIsCompanyAlertSubscribed(false);
      return;
    }

    let mounted = true;
    const run = async () => {
      const isSubscribed = await getSalaryAlertSubscriptionStatus('company', { businessId });
      if (mounted) setIsCompanyAlertSubscribed(isSubscribed);
    };

    run();

    return () => {
      mounted = false;
    };
  }, [authStatus, businessId]);

  const loginHref = `/login?next=${encodeURIComponent(pathname || `/businesses/${businessId}`)}`;
  const salaryConfidence = useMemo(() => {
    if (stats.count >= 50) return { label: t('business.salary.confidenceHigh', 'Confiance elevee'), score: 100 };
    if (stats.count >= 20) return { label: t('business.salary.confidenceMedium', 'Confiance moyenne'), score: 72 };
    if (stats.count >= 5) return { label: t('business.salary.confidenceLow', 'Confiance en construction'), score: 45 };
    return { label: t('business.salary.confidenceVeryLow', 'Donnees encore limitees'), score: 25 };
  }, [stats.count, t]);
  const lastSalaryUpdate = useMemo(() => {
    if (salaries.length === 0) return t('business.salary.notAvailable', 'Indisponible');
    const latest = salaries.reduce((acc, row) => {
      const ts = Date.parse(row.created_at);
      if (Number.isNaN(ts)) return acc;
      return ts > acc ? ts : acc;
    }, 0);
    if (!latest) return t('business.salary.notAvailable', 'Indisponible');
    return new Date(latest).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' });
  }, [salaries, t]);
  const spread = useMemo(() => {
    if (stats.minMonthly === null || stats.maxMonthly === null) return null;
    return Math.max(0, stats.maxMonthly - stats.minMonthly);
  }, [stats.maxMonthly, stats.minMonthly]);
  const isAuthenticated = authStatus === 'authenticated';
  const hasEnoughData = hasSufficientSampleSize(stats.count);
  const canViewDetailedStats = isAuthenticated && hasEnoughData;
  const previewSalaries = isAuthenticated ? salaries : salaries.slice(0, 2);

  return (
    <section id="salaries" className="space-y-6">
      <Card className="border border-border/50">
        <CardHeader>
          <CardTitle>{t('business.salary.title', 'Salaires')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/70 bg-background/70 p-3 space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                {t('business.salary.qualitySignal', 'Signal qualite')}
              </p>
              <p className="text-sm font-bold">{salaryConfidence.label}</p>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${salaryConfidence.score}%` }} />
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                {t('business.salary.lastUpdate', 'Derniere publication')}
              </p>
              <p className="mt-1 text-sm font-bold">{lastSalaryUpdate}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{t('business.salary.moderationNote', 'Chaque entree est moderee avant publication.')}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                {t('business.salary.rangeSignal', 'Amplitude observee')}
              </p>
              <p className="mt-1 text-sm font-bold">
                {spread === null ? '-' : formatMoneyMAD(spread)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{t('business.salary.rangeNote', 'Entre minimum et maximum publies.')}</p>
            </div>
          </div>

          {stats.count > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{t('business.salary.medianMonthly', 'Mediane mensuelle')}</p>
                  <p className="font-bold">{hasEnoughData ? (isAuthenticated ? formatMoneyMAD(stats.medianMonthly) : t('business.salary.loginToUnlock', 'Connectez-vous')) : t('business.salary.insufficientData', 'Donnees insuffisantes')}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{t('business.salary.minMonthly', 'Minimum mensuel')}</p>
                  <p className="font-bold">{canViewDetailedStats ? formatMoneyMAD(stats.minMonthly) : t('business.salary.loginToUnlock', 'Connectez-vous')}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{t('business.salary.maxMonthly', 'Maximum mensuel')}</p>
                  <p className="font-bold">{canViewDetailedStats ? formatMoneyMAD(stats.maxMonthly) : t('business.salary.loginToUnlock', 'Connectez-vous')}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{t('business.salary.sample', 'Echantillon')}</p>
                  <p className="font-bold">{tf('business.salary.entriesCount', '{count} entrees', { count: stats.count })}</p>
                </div>
              </div>

              {stats.roleBreakdown.length > 0 && hasEnoughData && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">{t('business.salary.topRoles', 'Top postes')}</p>
                  <div className="space-y-2">
                    {stats.roleBreakdown.map((row) => (
                      <div key={row.jobTitle} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                        <span>{row.jobTitle}</span>
                        <span className="font-semibold">
                          {canViewDetailedStats ? `${formatMoneyMAD(row.medianMonthly)} (${row.count})` : t('business.salary.loginToUnlock', 'Connectez-vous')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {salaries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">{t('business.salary.latestEntries', 'Dernieres entrees publiees')}</p>
                  <div className="space-y-2">
                    {previewSalaries.map((row) => (
                      <div key={row.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{row.job_title}</p>
                          <Badge variant="outline">{row.pay_period === 'yearly' ? t('business.salary.yearly', 'Annuel') : t('business.salary.monthly', 'Mensuel')}</Badge>
                        </div>
                        <p className="mt-1 text-sm font-semibold">{canViewDetailedStats ? formatMoneyMAD(row.salary) : t('business.salary.loginToUnlock', 'Connectez-vous')}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.location || t('business.salary.locationUnknown', 'Localisation non precisee')} · {new Date(row.created_at).toLocaleDateString('fr-MA')}
                        </p>
                      </div>
                    ))}
                  </div>
                  {!canViewDetailedStats && salaries.length > previewSalaries.length && (
                    <p className="text-xs text-muted-foreground">
                      {t('business.salary.previewLimited', 'Apercu limite: connectez-vous pour voir toutes les entrees et valeurs detaillees.')}
                    </p>
                  )}
                  {!hasEnoughData && (
                    <p className="text-xs text-muted-foreground">
                      {t('business.salary.kAnonymityNotice', `Minimum ${MIN_PUBLIC_SAMPLE_SIZE} soumissions requis pour afficher les details statistiquement sensibles.`)}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('business.salary.empty', 'Aucune donnee salaire publiee pour le moment.')}</p>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/50 overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {t('business.salary.shareTitle', 'Partager un salaire (anonyme)')}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{t('business.salary.shareModeration', 'Moderation activee avant publication.')}</p>
            </div>
            {authStatus === 'authenticated' && (
              <div className="flex items-center gap-2">
                <SalaryAlertToggleButton
                  scope="company"
                  target={{ businessId }}
                  pathToRevalidate={pathname || `/businesses/${businessId}`}
                  initialIsSubscribed={isCompanyAlertSubscribed}
                  className="h-9"
                />
                <Button type="button" variant="outline" onClick={() => setIsFormOpen((prev) => !prev)}>
                  {isFormOpen ? t('common.hide', 'Masquer') : t('common.add', 'Ajouter')}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {authStatus === 'loading' && (
            <div className="space-y-3">
              <div className="h-10 w-full rounded-md bg-muted/40 animate-pulse" />
              <div className="h-10 w-2/3 rounded-md bg-muted/40 animate-pulse" />
            </div>
          )}

          {authStatus === 'unauthenticated' && (
            <div className="rounded-xl border bg-muted/20 p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-full border bg-background p-2">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">{t('business.salary.loginRequired', 'Connectez-vous pour publier un salaire')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('business.salary.loginRequiredDesc', 'La soumission reste reservee aux utilisateurs connectes pour limiter le spam et garder des donnees de qualite.')}
                  </p>
                  <div className="pt-1">
                    <Button asChild>
                      <Link href={loginHref} className="inline-flex items-center gap-2">
                        <LogIn className="h-4 w-4" />
                        {t('business.salary.loginAndShare', 'Se connecter et publier')}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {authStatus === 'authenticated' && !isFormOpen && <p className="text-sm text-muted-foreground">{t('business.salary.clickAdd', 'Cliquez sur Ajouter pour soumettre votre salaire.')}</p>}

          {authStatus === 'authenticated' && isFormOpen && (
            <form ref={formRef} action={formAction} className="space-y-4">
              <input type="hidden" name="businessId" value={businessId} />
              <input type="hidden" name="location" value={businessCity || ''} />
              <input type="hidden" name="isCurrent" value="true" />

              <div className="rounded-xl border bg-muted/20 p-4 md:p-5 space-y-4">
                <h4 className="text-sm font-semibold">{t('business.salary.mainInfo', 'Informations principales')}</h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="jobTitle">{t('business.salary.jobTitle', 'Poste')}</Label>
                    {roles.length > 0 ? (
                      <select id="jobTitle" name="jobTitle" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required>
                        <option value="">{t('business.salary.selectRole', 'Selectionner un poste')}</option>
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input id="jobTitle" name="jobTitle" placeholder={t('business.salary.jobTitlePlaceholder', 'Ex: Developpeur Full Stack')} required />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="salary">{t('business.salary.salary', 'Salaire')}</Label>
                    <Input id="salary" name="salary" type="number" min="500" step="1" required />
                    {intervals.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        {t('business.salary.allowedIntervals', 'Intervalles autorises')}: {intervals.map((item) => item.label).join(' | ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 md:p-5 space-y-4">
                <h4 className="text-sm font-semibold">{t('business.salary.context', 'Contexte du poste')}</h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="payPeriod">{t('business.salary.period', 'Periode')}</Label>
                    <select id="payPeriod" name="payPeriod" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="monthly">
                      <option value="monthly">{t('business.salary.monthly', 'Mensuel')}</option>
                      <option value="yearly">{t('business.salary.yearly', 'Annuel')}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="employmentType">{t('business.salary.contractType', 'Type de contrat')}</Label>
                    <select id="employmentType" name="employmentType" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="full_time">
                      <option value="full_time">{t('business.salary.fullTime', 'Temps plein')}</option>
                      <option value="part_time">{t('business.salary.partTime', 'Temps partiel')}</option>
                      <option value="contract">{t('business.salary.contract', 'Contrat')}</option>
                      <option value="intern">{t('business.salary.internship', 'Stage')}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="yearsExperience">{t('business.salary.yearsExperience', "Annees d'experience")}</Label>
                    <Input id="yearsExperience" name="yearsExperience" type="number" min="0" max="60" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="seniorityLevel">{t('business.salary.seniority', 'Seniority (optionnel)')}</Label>
                    <select id="seniorityLevel" name="seniorityLevel" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
                      <option value="">{t('business.salary.auto', 'Auto')}</option>
                      <option value="junior">{t('business.salary.junior', 'Junior')}</option>
                      <option value="confirme">{t('business.salary.confirmed', 'Confirme')}</option>
                      <option value="senior">{t('business.salary.senior', 'Senior')}</option>
                      <option value="expert">{t('business.salary.expert', 'Expert')}</option>
                      <option value="manager">{t('business.salary.manager', 'Manager')}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="workModel">{t('business.salary.workModel', 'Mode de travail (optionnel)')}</Label>
                    <select id="workModel" name="workModel" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
                      <option value="">{t('business.salary.notSpecified', 'Non precise')}</option>
                      <option value="presentiel">{t('business.salary.onSite', 'Presentiel')}</option>
                      <option value="hybride">{t('business.salary.hybrid', 'Hybride')}</option>
                      <option value="teletravail">{t('business.salary.remote', 'Teletravail')}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="department">{t('business.salary.department', 'Departement (optionnel)')}</Label>
                  {departments.length > 0 ? (
                    <select id="department" name="department" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
                      <option value="">{t('business.salary.selectDepartment', 'Selectionner un departement')}</option>
                      {departments.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input id="department" name="department" placeholder={t('business.salary.departmentPlaceholder', 'Ex: Engineering')} />
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 md:p-5 space-y-3">
                <h4 className="text-sm font-semibold">{t('business.salary.bonusOptional', 'Bonus (optionnel)')}</h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="bonusPrime" value="true" className="h-4 w-4" />
                    {t('business.salary.bonusPrime', 'Prime')}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="bonusTreiziemeMois" value="true" className="h-4 w-4" />
                    {t('business.salary.bonus13Month', '13e mois')}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="bonusCommission" value="true" className="h-4 w-4" />
                    {t('business.salary.bonusCommission', 'Commission')}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="bonusAnnuel" value="true" className="h-4 w-4" />
                    {t('business.salary.bonusAnnual', 'Bonus annuel')}
                  </label>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">{t('business.salary.anonymousNotice', 'Votre soumission est anonyme et passera par moderation avant publication.')}</p>
              <Button type="submit" className="w-full sm:w-auto">
                {t('business.salary.submit', 'Soumettre un salaire')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
