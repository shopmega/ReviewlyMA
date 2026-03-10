'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, BarChart3, Coins, Target, DollarSign, Eye, Edit, Trash2, Pause, Play } from 'lucide-react';
import { Ad } from '@/lib/types';
import { createAd, updateAd, deleteAd, getUserAds, toggleAdStatus } from '@/lib/ads/server-actions';
import { useToast } from '@/hooks/use-toast';
import { CompetitorAdsContent } from '../competitor-ads/CompetitorAdsContent';
import { useI18n } from '@/components/providers/i18n-provider';

type AdvertisingTab = 'manage' | 'create' | 'analytics' | 'competitor';

const AD_PLACEMENTS = [
  { value: 'home_top_banner', key: 'homeTopBanner', fallback: 'Home top banner' },
  { value: 'directory_top_banner', key: 'directoryTopBanner', fallback: 'Directory top banner' },
  { value: 'directory_inline', key: 'directoryInline', fallback: 'Directory inline' },
  { value: 'business_profile_inline', key: 'businessProfileInline', fallback: 'Business profile inline' },
  { value: 'business_profile_sidebar', key: 'businessProfileSidebar', fallback: 'Business profile sidebar' },
  { value: 'referrals_top_banner', key: 'referralsTopBanner', fallback: 'Referrals top banner' },
  { value: 'referrals_inline', key: 'referralsInline', fallback: 'Referrals inline' },
  { value: 'referrals_detail_sidebar', key: 'referralsDetailSidebar', fallback: 'Referrals detail sidebar' },
  { value: 'salary_page_top_banner', key: 'salaryPageTopBanner', fallback: 'Salary page top banner' },
  { value: 'salary_page_inline', key: 'salaryPageInline', fallback: 'Salary page inline' },
  { value: 'salary_compare_top_banner', key: 'salaryCompareTopBanner', fallback: 'Salary compare top banner' },
  { value: 'salary_role_city_inline', key: 'salaryRoleCityInline', fallback: 'Salary role/city inline' },
  { value: 'salary_sector_city_inline', key: 'salarySectorCityInline', fallback: 'Salary sector/city inline' },
  { value: 'salary_share_top_banner', key: 'salaryShareTopBanner', fallback: 'Salary share top banner' },
] as const;

type TargetingForm = {
  placements: string[];
  salaryCitySlugs: string;
  salaryRoleSlugs: string;
  salarySectorSlugs: string;
  ctaUrl: string;
  ctaLabel: string;
  targetBusinessIds: string;
};

const EMPTY_AD: Omit<Ad, 'id' | 'created_at' | 'updated_at' | 'spent_cents'> = {
  advertiser_id: '',
  title: '',
  content: '',
  budget_cents: 0,
  status: 'draft',
  start_date: undefined,
  end_date: undefined,
  target_business_ids: [],
  targeting_criteria: {},
};

const EMPTY_TARGETING: TargetingForm = {
  placements: [],
  salaryCitySlugs: '',
  salaryRoleSlugs: '',
  salarySectorSlugs: '',
  ctaUrl: '',
  ctaLabel: '',
  targetBusinessIds: '',
};

const parseCsv = (value: string): string[] =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const formatCsv = (value?: string[]): string => (Array.isArray(value) ? value.join(', ') : '');

const parseTargeting = (criteria: Record<string, any> | undefined, targetBusinessIds?: string[]): TargetingForm => {
  const c = criteria || {};
  const salary = c.salary || {};
  return {
    placements: Array.isArray(c.placements) ? c.placements : [],
    salaryCitySlugs: formatCsv(salary.citySlugs),
    salaryRoleSlugs: formatCsv(salary.roleSlugs),
    salarySectorSlugs: formatCsv(salary.sectorSlugs),
    ctaUrl: typeof c.cta_url === 'string' ? c.cta_url : '',
    ctaLabel: typeof c.cta_label === 'string' ? c.cta_label : '',
    targetBusinessIds: formatCsv(targetBusinessIds),
  };
};

const buildTargetingCriteria = (form: TargetingForm): Record<string, any> => {
  const citySlugs = parseCsv(form.salaryCitySlugs);
  const roleSlugs = parseCsv(form.salaryRoleSlugs);
  const sectorSlugs = parseCsv(form.salarySectorSlugs);

  const criteria: Record<string, any> = {};

  if (form.placements.length > 0) {
    criteria.placements = form.placements;
  }

  if (citySlugs.length > 0 || roleSlugs.length > 0 || sectorSlugs.length > 0) {
    criteria.salary = {};
    if (citySlugs.length > 0) criteria.salary.citySlugs = citySlugs;
    if (roleSlugs.length > 0) criteria.salary.roleSlugs = roleSlugs;
    if (sectorSlugs.length > 0) criteria.salary.sectorSlugs = sectorSlugs;
  }

  if (form.ctaUrl.trim()) criteria.cta_url = form.ctaUrl.trim();
  if (form.ctaLabel.trim()) criteria.cta_label = form.ctaLabel.trim();

  return criteria;
};

const buildTargetBusinessIds = (form: TargetingForm): string[] => parseCsv(form.targetBusinessIds);

function TargetingFields({
  value,
  onChange,
  t,
}: {
  value: TargetingForm;
  onChange: (next: TargetingForm) => void;
  t: (key: string, fallback?: string) => string;
}) {
  const togglePlacement = (placement: string) => {
    const next = value.placements.includes(placement)
      ? value.placements.filter((p) => p !== placement)
      : [...value.placements, placement];
    onChange({ ...value, placements: next });
  };

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="space-y-2">
        <Label>{t('dashboardAdvertisingPage.targeting.placementsLabel', 'Placements')}</Label>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {AD_PLACEMENTS.map((placement) => (
            <label key={placement.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={value.placements.includes(placement.value)}
                onChange={() => togglePlacement(placement.value)}
              />
              <span>{t(`dashboardAdvertisingPage.placements.${placement.key}`, placement.fallback)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>{t('dashboardAdvertisingPage.targeting.salaryCitySlugsLabel', 'Salary city slugs')}</Label>
          <Input
            placeholder={t('dashboardAdvertisingPage.targeting.salaryCitySlugsPlaceholder', 'casablanca, rabat')}
            value={value.salaryCitySlugs}
            onChange={(e) => onChange({ ...value, salaryCitySlugs: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>{t('dashboardAdvertisingPage.targeting.salaryRoleSlugsLabel', 'Salary role slugs')}</Label>
          <Input
            placeholder={t('dashboardAdvertisingPage.targeting.salaryRoleSlugsPlaceholder', 'software-engineer, accountant')}
            value={value.salaryRoleSlugs}
            onChange={(e) => onChange({ ...value, salaryRoleSlugs: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>{t('dashboardAdvertisingPage.targeting.salarySectorSlugsLabel', 'Salary sector slugs')}</Label>
        <Input
          placeholder={t('dashboardAdvertisingPage.targeting.salarySectorSlugsPlaceholder', 'it, finance')}
          value={value.salarySectorSlugs}
          onChange={(e) => onChange({ ...value, salarySectorSlugs: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <Label>{t('dashboardAdvertisingPage.targeting.targetBusinessIdsLabel', 'Target business IDs')}</Label>
        <Input
          placeholder={t('dashboardAdvertisingPage.targeting.targetBusinessIdsPlaceholder', 'acme-corp, globex')}
          value={value.targetBusinessIds}
          onChange={(e) => onChange({ ...value, targetBusinessIds: e.target.value })}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>{t('dashboardAdvertisingPage.targeting.ctaUrlLabel', 'CTA URL')}</Label>
          <Input
            placeholder={t('dashboardAdvertisingPage.targeting.ctaUrlPlaceholder', 'https://...')}
            value={value.ctaUrl}
            onChange={(e) => onChange({ ...value, ctaUrl: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>{t('dashboardAdvertisingPage.targeting.ctaLabelLabel', 'CTA Label')}</Label>
          <Input
            placeholder={t('dashboardAdvertisingPage.targeting.ctaLabelPlaceholder', 'Learn more')}
            value={value.ctaLabel}
            onChange={(e) => onChange({ ...value, ctaLabel: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

export default function AdvertisingDashboard() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as AdvertisingTab) || 'manage';

  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdvertisingTab>(initialTab);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAd, setNewAd] = useState<Omit<Ad, 'id' | 'created_at' | 'updated_at' | 'spent_cents'>>(EMPTY_AD);
  const [newTargeting, setNewTargeting] = useState<TargetingForm>(EMPTY_TARGETING);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [editForm, setEditForm] = useState<Partial<Ad>>({});
  const [editTargeting, setEditTargeting] = useState<TargetingForm>(EMPTY_TARGETING);
  const { toast } = useToast();
  const { t, tf, locale } = useI18n();
  const dateLocale = locale === 'fr' ? 'fr-FR' : locale === 'ar' ? 'ar-MA' : 'en-US';

  useEffect(() => {
    loadAds();
  }, []);

  useEffect(() => {
    if (['manage', 'create', 'analytics', 'competitor'].includes(initialTab)) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const metrics = useMemo(() => {
    const now = Date.now();
    const activeAds = ads.filter((ad) => {
      if (ad.status !== 'active') return false;
      const start = ad.start_date ? new Date(ad.start_date).getTime() : null;
      const end = ad.end_date ? new Date(ad.end_date).getTime() : null;
      return (start === null || start <= now) && (end === null || end >= now);
    });

    const totalBudgetCents = ads.reduce((sum, ad) => sum + Number(ad.budget_cents || 0), 0);
    const totalSpentCents = ads.reduce((sum, ad) => sum + Number(ad.spent_cents || 0), 0);
    const avgSpendRate = totalBudgetCents > 0 ? (totalSpentCents / totalBudgetCents) * 100 : 0;

    return {
      activeCampaigns: activeAds.length,
      totalCampaigns: ads.length,
      totalBudgetCents,
      totalSpentCents,
      avgSpendRate,
    };
  }, [ads]);

  const loadAds = async () => {
    setLoading(true);
    const result = await getUserAds();
    if (result.success) {
      setAds(result.ads || []);
    } else {
      toast({
        title: t('dashboardAdvertisingPage.toasts.errorTitle', 'Error'),
        description: result.error || t('dashboardAdvertisingPage.errors.loadAds', 'Unable to load ads'),
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const formatDate = (dateString?: string) =>
    dateString
      ? new Date(dateString).toLocaleDateString(dateLocale)
      : t('dashboardAdvertisingPage.common.notSet', 'Not set');

  const calculateSpendPercentage = (ad: Ad) => {
    if (!ad.budget_cents) return 0;
    return Math.min(100, (Number(ad.spent_cents || 0) / Number(ad.budget_cents)) * 100);
  };

  const handleCreateAd = async () => {
    if (!newAd.title.trim() || !newAd.content.trim() || Number(newAd.budget_cents || 0) <= 0) {
      toast({
        title: t('dashboardAdvertisingPage.toasts.errorTitle', 'Error'),
        description: t(
          'dashboardAdvertisingPage.errors.requiredFields',
          'Title, content, and budget are required.'
        ),
        variant: 'destructive',
      });
      return;
    }

    const result = await createAd({
      ...newAd,
      target_business_ids: buildTargetBusinessIds(newTargeting),
      targeting_criteria: buildTargetingCriteria(newTargeting),
    });
    if (!result.success) {
      toast({
        title: t('dashboardAdvertisingPage.toasts.errorTitle', 'Error'),
        description: result.error || t('dashboardAdvertisingPage.errors.createAd', 'Unable to create ad'),
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: t('dashboardAdvertisingPage.toasts.successTitle', 'Success'),
      description: t('dashboardAdvertisingPage.success.created', 'Ad created successfully'),
    });
    setNewAd(EMPTY_AD);
    setNewTargeting(EMPTY_TARGETING);
    setShowCreateDialog(false);
    setActiveTab('manage');
    await loadAds();
  };

  const handleStartEdit = (ad: Ad) => {
    setEditingAd(ad);
    setEditForm({
      title: ad.title,
      content: ad.content,
      budget_cents: ad.budget_cents,
      start_date: ad.start_date,
      end_date: ad.end_date,
      targeting_criteria: ad.targeting_criteria || {},
    });
    setEditTargeting(parseTargeting(ad.targeting_criteria || {}, ad.target_business_ids || []));
  };

  const handleSaveEdit = async () => {
    if (!editingAd) return;
    const result = await updateAd(editingAd.id, {
      title: String(editForm.title || '').trim(),
      content: String(editForm.content || '').trim(),
      budget_cents: Number(editForm.budget_cents || 0),
      start_date: editForm.start_date || undefined,
      end_date: editForm.end_date || undefined,
      target_business_ids: buildTargetBusinessIds(editTargeting),
      targeting_criteria: buildTargetingCriteria(editTargeting),
    });
    if (!result.success) {
      toast({
        title: t('dashboardAdvertisingPage.toasts.errorTitle', 'Error'),
        description: result.error || t('dashboardAdvertisingPage.errors.updateAd', 'Unable to update ad'),
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: t('dashboardAdvertisingPage.toasts.successTitle', 'Success'),
      description: t('dashboardAdvertisingPage.success.updated', 'Ad updated'),
    });
    setEditingAd(null);
    setEditForm({});
    setEditTargeting(EMPTY_TARGETING);
    await loadAds();
  };

  const handleToggleAdStatus = async (adId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    const result = await toggleAdStatus(adId, nextStatus as 'active' | 'paused');
    if (!result.success) {
      toast({
        title: t('dashboardAdvertisingPage.toasts.errorTitle', 'Error'),
        description: result.error || t('dashboardAdvertisingPage.errors.toggleStatus', 'Unable to change status'),
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: t('dashboardAdvertisingPage.toasts.successTitle', 'Success'),
      description: tf(
        'dashboardAdvertisingPage.success.statusChanged',
        'Ad {status}',
        {
          status:
            nextStatus === 'active'
              ? t('dashboardAdvertisingPage.status.activated', 'activated')
              : t('dashboardAdvertisingPage.status.paused', 'paused'),
        }
      ),
    });
    await loadAds();
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm(t('dashboardAdvertisingPage.confirm.delete', 'Delete this ad?'))) return;
    const result = await deleteAd(adId);
    if (!result.success) {
      toast({
        title: t('dashboardAdvertisingPage.toasts.errorTitle', 'Error'),
        description: result.error || t('dashboardAdvertisingPage.errors.deleteAd', 'Unable to delete ad'),
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: t('dashboardAdvertisingPage.toasts.successTitle', 'Success'),
      description: t('dashboardAdvertisingPage.success.deleted', 'Ad deleted'),
    });
    await loadAds();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {t('dashboardAdvertisingPage.header.title', 'Ads')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t(
            'dashboardAdvertisingPage.header.subtitle',
            'Manage campaigns and internal ad placements.'
          )}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AdvertisingTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="manage">{t('dashboardAdvertisingPage.tabs.manage', 'My ads')}</TabsTrigger>
          <TabsTrigger value="create">{t('dashboardAdvertisingPage.tabs.create', 'Create')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('dashboardAdvertisingPage.tabs.analytics', 'Analytics')}</TabsTrigger>
          <TabsTrigger value="competitor">{t('dashboardAdvertisingPage.tabs.competitor', 'Competitor ads')}</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{t('dashboardAdvertisingPage.manage.title', 'Your campaigns')}</h2>
            <Dialog
              open={showCreateDialog}
              onOpenChange={(open) => {
                setShowCreateDialog(open);
                if (!open) {
                  setNewAd(EMPTY_AD);
                  setNewTargeting(EMPTY_TARGETING);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('dashboardAdvertisingPage.manage.createAd', 'Create ad')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>{t('dashboardAdvertisingPage.createDialog.title', 'New ad')}</DialogTitle>
                  <DialogDescription>
                    {t('dashboardAdvertisingPage.createDialog.description', 'Create a standard ad campaign.')}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right">{t('dashboardAdvertisingPage.form.title', 'Title')}</Label>
                    <Input id="title" className="col-span-3" value={newAd.title} onChange={(e) => setNewAd({ ...newAd, title: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="content" className="text-right">{t('dashboardAdvertisingPage.form.content', 'Content')}</Label>
                    <Textarea id="content" className="col-span-3" value={newAd.content} onChange={(e) => setNewAd({ ...newAd, content: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="budget" className="text-right">{t('dashboardAdvertisingPage.form.budgetMad', 'Budget (MAD)')}</Label>
                    <Input id="budget" type="number" className="col-span-3" value={newAd.budget_cents ? newAd.budget_cents / 100 : 0} onChange={(e) => setNewAd({ ...newAd, budget_cents: Math.max(0, Number(e.target.value || 0) * 100) })} />
                  </div>
                  <TargetingFields value={newTargeting} onChange={setNewTargeting} t={t} />
                </div>
                <Button onClick={handleCreateAd}>{t('dashboardAdvertisingPage.createDialog.create', 'Create ad')}</Button>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : ads.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Coins className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('dashboardAdvertisingPage.empty.title', 'No campaigns')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('dashboardAdvertisingPage.empty.description', 'Create your first ad campaign.')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ads.map((ad) => (
                <Card key={ad.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-lg">{ad.title}</CardTitle>
                        <Badge variant={ad.status === 'active' ? 'default' : ad.status === 'paused' ? 'secondary' : 'outline'} className="mt-2 capitalize">
                          {ad.status === 'active'
                            ? t('dashboardAdvertisingPage.status.active', 'Active')
                            : ad.status === 'paused'
                              ? t('dashboardAdvertisingPage.status.pausedBadge', 'Paused')
                              : ad.status}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleToggleAdStatus(ad.id, ad.status)}>
                          <span className="sr-only">
                            {ad.status === 'active'
                              ? t('dashboardAdvertisingPage.actions.pause', 'Pause ad')
                              : t('dashboardAdvertisingPage.actions.activate', 'Activate ad')}
                          </span>
                          {ad.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleStartEdit(ad)}>
                          <span className="sr-only">{t('dashboardAdvertisingPage.actions.edit', 'Edit ad')}</span>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteAd(ad.id)}>
                          <span className="sr-only">{t('dashboardAdvertisingPage.actions.delete', 'Delete ad')}</span>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{ad.content}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t('dashboardAdvertisingPage.card.budget', 'Budget')}</span>
                        <span>{(ad.budget_cents / 100).toFixed(2)} MAD</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t('dashboardAdvertisingPage.card.spent', 'Spent')}</span>
                        <span>{(ad.spent_cents / 100).toFixed(2)} MAD</span>
                      </div>
                      <div className="pt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>
                            {tf('dashboardAdvertisingPage.card.progress', 'Progress: {pct}%', {
                              pct: calculateSpendPercentage(ad).toFixed(0),
                            })}
                          </span>
                          <span>{(ad.spent_cents / 100).toFixed(2)} / {(ad.budget_cents / 100).toFixed(2)} MAD</span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${calculateSpendPercentage(ad)}%` }} /></div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>
                          {tf('dashboardAdvertisingPage.card.start', 'Start: {date}', { date: formatDate(ad.start_date) })}
                        </span>
                        <span>
                          {tf('dashboardAdvertisingPage.card.end', 'End: {date}', { date: formatDate(ad.end_date) })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboardAdvertisingPage.quickCreate.title', 'Create a campaign')}</CardTitle>
              <CardDescription>
                {t('dashboardAdvertisingPage.quickCreate.description', 'Quick creation of an ad campaign.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="campaign-title">{t('dashboardAdvertisingPage.form.title', 'Title')}</Label>
                <Input id="campaign-title" value={newAd.title} onChange={(e) => setNewAd({ ...newAd, title: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="campaign-content">{t('dashboardAdvertisingPage.form.content', 'Content')}</Label>
                <Textarea id="campaign-content" value={newAd.content} onChange={(e) => setNewAd({ ...newAd, content: e.target.value })} rows={3} />
              </div>
              <div>
                <Label htmlFor="campaign-budget">{t('dashboardAdvertisingPage.form.budgetMad', 'Budget (MAD)')}</Label>
                <Input id="campaign-budget" type="number" value={newAd.budget_cents ? newAd.budget_cents / 100 : 0} onChange={(e) => setNewAd({ ...newAd, budget_cents: Math.max(0, Number(e.target.value || 0) * 100) })} />
              </div>
              <TargetingFields value={newTargeting} onChange={setNewTargeting} t={t} />
              <Button className="w-full" onClick={handleCreateAd}>
                <Plus className="mr-2 h-4 w-4" />
                {t('dashboardAdvertisingPage.quickCreate.createCampaign', 'Create campaign')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4 flex items-center"><div className="rounded-full bg-blue-100 p-3 mr-4"><Eye className="h-6 w-6 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">{t('dashboardAdvertisingPage.analytics.activeCampaigns', 'Active campaigns')}</p><p className="text-2xl font-bold">{metrics.activeCampaigns}</p></div></CardContent></Card>
              <Card><CardContent className="p-4 flex items-center"><div className="rounded-full bg-green-100 p-3 mr-4"><Target className="h-6 w-6 text-green-600" /></div><div><p className="text-sm text-muted-foreground">{t('dashboardAdvertisingPage.analytics.totalCampaigns', 'Total campaigns')}</p><p className="text-2xl font-bold">{metrics.totalCampaigns}</p></div></CardContent></Card>
              <Card><CardContent className="p-4 flex items-center"><div className="rounded-full bg-sky-100 p-3 mr-4"><BarChart3 className="h-6 w-6 text-sky-600" /></div><div><p className="text-sm text-muted-foreground">{t('dashboardAdvertisingPage.analytics.spendRate', 'Spend rate')}</p><p className="text-2xl font-bold">{metrics.avgSpendRate.toFixed(1)}%</p></div></CardContent></Card>
              <Card><CardContent className="p-4 flex items-center"><div className="rounded-full bg-orange-100 p-3 mr-4"><DollarSign className="h-6 w-6 text-orange-600" /></div><div><p className="text-sm text-muted-foreground">{t('dashboardAdvertisingPage.analytics.expenses', 'Expenses')}</p><p className="text-2xl font-bold">{(metrics.totalSpentCents / 100).toFixed(0)} MAD</p></div></CardContent></Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboardAdvertisingPage.analytics.globalBudgetTitle', 'Global budget')}</CardTitle>
                <CardDescription>
                  {t('dashboardAdvertisingPage.analytics.globalBudgetDescription', 'Allocated budget vs spent budget across all campaigns.')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span>{t('dashboardAdvertisingPage.analytics.totalBudget', 'Total budget')}</span><span>{(metrics.totalBudgetCents / 100).toFixed(2)} MAD</span></div>
                  <div className="flex justify-between text-sm"><span>{t('dashboardAdvertisingPage.analytics.totalSpent', 'Total spent')}</span><span>{(metrics.totalSpentCents / 100).toFixed(2)} MAD</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="competitor" className="mt-6">
          <CompetitorAdsContent />
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!editingAd}
        onOpenChange={(open) => {
          if (!open) {
            setEditingAd(null);
            setEditTargeting(EMPTY_TARGETING);
          }
        }}
      >
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t('dashboardAdvertisingPage.editDialog.title', 'Edit ad')}</DialogTitle>
            <DialogDescription>
              {t('dashboardAdvertisingPage.editDialog.description', 'Update campaign details.')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label htmlFor="edit-title">{t('dashboardAdvertisingPage.form.title', 'Title')}</Label><Input id="edit-title" value={String(editForm.title || '')} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="edit-content">{t('dashboardAdvertisingPage.form.content', 'Content')}</Label><Textarea id="edit-content" rows={4} value={String(editForm.content || '')} onChange={(e) => setEditForm((p) => ({ ...p, content: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="edit-budget">{t('dashboardAdvertisingPage.form.budgetMad', 'Budget (MAD)')}</Label><Input id="edit-budget" type="number" value={Number(editForm.budget_cents || 0) / 100} onChange={(e) => setEditForm((p) => ({ ...p, budget_cents: Math.max(0, Number(e.target.value || 0) * 100) }))} /></div>
            <TargetingFields value={editTargeting} onChange={setEditTargeting} t={t} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setEditingAd(null); setEditTargeting(EMPTY_TARGETING); }}>
              {t('dashboardAdvertisingPage.common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSaveEdit}>{t('dashboardAdvertisingPage.common.save', 'Save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
