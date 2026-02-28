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

type AdvertisingTab = 'manage' | 'create' | 'analytics' | 'competitor';

const AD_PLACEMENTS = [
  { value: 'home_top_banner', label: 'Home top banner' },
  { value: 'directory_top_banner', label: 'Directory top banner' },
  { value: 'directory_inline', label: 'Directory inline' },
  { value: 'business_profile_inline', label: 'Business profile inline' },
  { value: 'business_profile_sidebar', label: 'Business profile sidebar' },
  { value: 'referrals_top_banner', label: 'Referrals top banner' },
  { value: 'referrals_inline', label: 'Referrals inline' },
  { value: 'referrals_detail_sidebar', label: 'Referrals detail sidebar' },
  { value: 'salary_page_top_banner', label: 'Salary page top banner' },
  { value: 'salary_page_inline', label: 'Salary page inline' },
  { value: 'salary_compare_top_banner', label: 'Salary compare top banner' },
  { value: 'salary_role_city_inline', label: 'Salary role/city inline' },
  { value: 'salary_sector_city_inline', label: 'Salary sector/city inline' },
  { value: 'salary_share_top_banner', label: 'Salary share top banner' },
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
}: {
  value: TargetingForm;
  onChange: (next: TargetingForm) => void;
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
        <Label>Placements</Label>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {AD_PLACEMENTS.map((placement) => (
            <label key={placement.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={value.placements.includes(placement.value)}
                onChange={() => togglePlacement(placement.value)}
              />
              <span>{placement.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Salary city slugs</Label>
          <Input
            placeholder="casablanca, rabat"
            value={value.salaryCitySlugs}
            onChange={(e) => onChange({ ...value, salaryCitySlugs: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Salary role slugs</Label>
          <Input
            placeholder="software-engineer, accountant"
            value={value.salaryRoleSlugs}
            onChange={(e) => onChange({ ...value, salaryRoleSlugs: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Salary sector slugs</Label>
        <Input
          placeholder="it, finance"
          value={value.salarySectorSlugs}
          onChange={(e) => onChange({ ...value, salarySectorSlugs: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <Label>Target business IDs</Label>
        <Input
          placeholder="acme-corp, globex"
          value={value.targetBusinessIds}
          onChange={(e) => onChange({ ...value, targetBusinessIds: e.target.value })}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>CTA URL</Label>
          <Input
            placeholder="https://..."
            value={value.ctaUrl}
            onChange={(e) => onChange({ ...value, ctaUrl: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>CTA Label</Label>
          <Input
            placeholder="En savoir plus"
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
      toast({ title: 'Erreur', description: result.error || 'Impossible de charger les annonces', variant: 'destructive' });
    }
    setLoading(false);
  };

  const formatDate = (dateString?: string) => (dateString ? new Date(dateString).toLocaleDateString('fr-FR') : 'Non defini');

  const calculateSpendPercentage = (ad: Ad) => {
    if (!ad.budget_cents) return 0;
    return Math.min(100, (Number(ad.spent_cents || 0) / Number(ad.budget_cents)) * 100);
  };

  const handleCreateAd = async () => {
    if (!newAd.title.trim() || !newAd.content.trim() || Number(newAd.budget_cents || 0) <= 0) {
      toast({ title: 'Erreur', description: 'Titre, contenu et budget sont obligatoires.', variant: 'destructive' });
      return;
    }

    const result = await createAd({
      ...newAd,
      target_business_ids: buildTargetBusinessIds(newTargeting),
      targeting_criteria: buildTargetingCriteria(newTargeting),
    });
    if (!result.success) {
      toast({ title: 'Erreur', description: result.error || 'Impossible de creer l annonce', variant: 'destructive' });
      return;
    }

    toast({ title: 'Succes', description: 'Annonce creee avec succes' });
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
      toast({ title: 'Erreur', description: result.error || 'Impossible de mettre a jour l annonce', variant: 'destructive' });
      return;
    }
    toast({ title: 'Succes', description: 'Annonce mise a jour' });
    setEditingAd(null);
    setEditForm({});
    setEditTargeting(EMPTY_TARGETING);
    await loadAds();
  };

  const handleToggleAdStatus = async (adId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    const result = await toggleAdStatus(adId, nextStatus as 'active' | 'paused');
    if (!result.success) {
      toast({ title: 'Erreur', description: result.error || 'Impossible de modifier le statut', variant: 'destructive' });
      return;
    }
    toast({ title: 'Succes', description: `Annonce ${nextStatus === 'active' ? 'activee' : 'mise en pause'}` });
    await loadAds();
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    const result = await deleteAd(adId);
    if (!result.success) {
      toast({ title: 'Erreur', description: result.error || 'Impossible de supprimer l annonce', variant: 'destructive' });
      return;
    }
    toast({ title: 'Succes', description: 'Annonce supprimee' });
    await loadAds();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Ads</h1>
        <p className="text-muted-foreground mt-2">Gestion des campagnes et placements publicitaires internes.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AdvertisingTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="manage">Mes Annonces</TabsTrigger>
          <TabsTrigger value="create">Creer</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="competitor">Competitor Ads</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Vos Campagnes</h2>
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
                <Button><Plus className="mr-2 h-4 w-4" />Creer Annonce</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Nouvelle annonce</DialogTitle>
                  <DialogDescription>Creer une campagne publicitaire classique.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right">Titre</Label>
                    <Input id="title" className="col-span-3" value={newAd.title} onChange={(e) => setNewAd({ ...newAd, title: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="content" className="text-right">Contenu</Label>
                    <Textarea id="content" className="col-span-3" value={newAd.content} onChange={(e) => setNewAd({ ...newAd, content: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="budget" className="text-right">Budget (MAD)</Label>
                    <Input id="budget" type="number" className="col-span-3" value={newAd.budget_cents ? newAd.budget_cents / 100 : 0} onChange={(e) => setNewAd({ ...newAd, budget_cents: Math.max(0, Number(e.target.value || 0) * 100) })} />
                  </div>
                  <TargetingFields value={newTargeting} onChange={setNewTargeting} />
                </div>
                <Button onClick={handleCreateAd}>Creer Annonce</Button>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : ads.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Coins className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune campagne</h3>
                <p className="text-muted-foreground mb-4">Creer votre premiere campagne publicitaire.</p>
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
                          {ad.status === 'active' ? 'Active' : ad.status === 'paused' ? 'Pause' : ad.status}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleToggleAdStatus(ad.id, ad.status)}>{ad.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
                        <Button size="sm" variant="outline" onClick={() => handleStartEdit(ad)}><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteAd(ad.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{ad.content}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span>Budget</span><span>{(ad.budget_cents / 100).toFixed(2)} MAD</span></div>
                      <div className="flex justify-between text-sm"><span>Depense</span><span>{(ad.spent_cents / 100).toFixed(2)} MAD</span></div>
                      <div className="pt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progression: {calculateSpendPercentage(ad).toFixed(0)}%</span>
                          <span>{(ad.spent_cents / 100).toFixed(2)} / {(ad.budget_cents / 100).toFixed(2)} MAD</span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${calculateSpendPercentage(ad)}%` }} /></div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>Debut: {formatDate(ad.start_date)}</span>
                        <span>Fin: {formatDate(ad.end_date)}</span>
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
              <CardTitle>Creer une campagne</CardTitle>
              <CardDescription>Creation rapide d une campagne publicitaire.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="campaign-title">Titre</Label><Input id="campaign-title" value={newAd.title} onChange={(e) => setNewAd({ ...newAd, title: e.target.value })} /></div>
              <div><Label htmlFor="campaign-content">Contenu</Label><Textarea id="campaign-content" value={newAd.content} onChange={(e) => setNewAd({ ...newAd, content: e.target.value })} rows={3} /></div>
              <div><Label htmlFor="campaign-budget">Budget (MAD)</Label><Input id="campaign-budget" type="number" value={newAd.budget_cents ? newAd.budget_cents / 100 : 0} onChange={(e) => setNewAd({ ...newAd, budget_cents: Math.max(0, Number(e.target.value || 0) * 100) })} /></div>
              <TargetingFields value={newTargeting} onChange={setNewTargeting} />
              <Button className="w-full" onClick={handleCreateAd}><Plus className="mr-2 h-4 w-4" />Creer la campagne</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4 flex items-center"><div className="rounded-full bg-blue-100 p-3 mr-4"><Eye className="h-6 w-6 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Campagnes actives</p><p className="text-2xl font-bold">{metrics.activeCampaigns}</p></div></CardContent></Card>
              <Card><CardContent className="p-4 flex items-center"><div className="rounded-full bg-green-100 p-3 mr-4"><Target className="h-6 w-6 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Campagnes total</p><p className="text-2xl font-bold">{metrics.totalCampaigns}</p></div></CardContent></Card>
              <Card><CardContent className="p-4 flex items-center"><div className="rounded-full bg-sky-100 p-3 mr-4"><BarChart3 className="h-6 w-6 text-sky-600" /></div><div><p className="text-sm text-muted-foreground">Taux de depense</p><p className="text-2xl font-bold">{metrics.avgSpendRate.toFixed(1)}%</p></div></CardContent></Card>
              <Card><CardContent className="p-4 flex items-center"><div className="rounded-full bg-orange-100 p-3 mr-4"><DollarSign className="h-6 w-6 text-orange-600" /></div><div><p className="text-sm text-muted-foreground">Depenses</p><p className="text-2xl font-bold">{(metrics.totalSpentCents / 100).toFixed(0)} MAD</p></div></CardContent></Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Budget global</CardTitle>
                <CardDescription>Budget alloue vs depense sur toutes les campagnes.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span>Budget total</span><span>{(metrics.totalBudgetCents / 100).toFixed(2)} MAD</span></div>
                  <div className="flex justify-between text-sm"><span>Depense totale</span><span>{(metrics.totalSpentCents / 100).toFixed(2)} MAD</span></div>
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
            <DialogTitle>Modifier l annonce</DialogTitle>
            <DialogDescription>Mettez a jour les informations de la campagne.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label htmlFor="edit-title">Titre</Label><Input id="edit-title" value={String(editForm.title || '')} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="edit-content">Contenu</Label><Textarea id="edit-content" rows={4} value={String(editForm.content || '')} onChange={(e) => setEditForm((p) => ({ ...p, content: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="edit-budget">Budget (MAD)</Label><Input id="edit-budget" type="number" value={Number(editForm.budget_cents || 0) / 100} onChange={(e) => setEditForm((p) => ({ ...p, budget_cents: Math.max(0, Number(e.target.value || 0) * 100) }))} /></div>
            <TargetingFields value={editTargeting} onChange={setEditTargeting} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setEditingAd(null); setEditTargeting(EMPTY_TARGETING); }}>Annuler</Button>
            <Button onClick={handleSaveEdit}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
