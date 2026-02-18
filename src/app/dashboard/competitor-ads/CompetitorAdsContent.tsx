'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Building2, 
  Target, 
  Coins, 
  Edit, 
  Trash2, 
  Play, 
  Pause,
  Eye,
  EyeOff
} from 'lucide-react';
import { CompetitorAd } from '@/lib/types';
import { 
  createCompetitorAd, 
  updateCompetitorAd, 
  deleteCompetitorAd, 
  getUserCompetitorAds,
  getUserCompetitorAdMetrics,
  type CompetitorAdMetrics,
  toggleCompetitorAdStatus
} from '@/lib/competitor-ads/server-actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

import { ClientOnly } from '@/components/ClientOnly';

export function CompetitorAdsContent() {
  return (
    <ClientOnly>
      <CompetitorAdsContentInner />
    </ClientOnly>
  );
}

function CompetitorAdsContentInner() {
  const [ads, setAds] = useState<CompetitorAd[]>([]);
  const [adMetrics, setAdMetrics] = useState<Record<string, CompetitorAdMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAd, setEditingAd] = useState<CompetitorAd | null>(null);
  const [newAd, setNewAd] = useState({
    advertiser_business_id: '',
    target_competitor_ids: [] as string[],
    title: '',
    content: '',
    media_urls: [] as string[],
    budget_cents: 0,
    start_date: '',
    end_date: ''
  });

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadCompetitorAds();
    }
  }, [user]);

  const loadCompetitorAds = async () => {
    setLoading(true);
    const [adsResult, metricsResult] = await Promise.all([
      getUserCompetitorAds(),
      getUserCompetitorAdMetrics(),
    ]);

    if (adsResult.success) {
      setAds(adsResult.ads || []);
    } else {
      toast({
        title: 'Erreur',
        description: adsResult.error || 'Impossible de charger les annonces concurrentes',
        variant: 'destructive',
      });
    }

    if (metricsResult.success && metricsResult.metrics) {
      const metricsMap = Object.fromEntries(
        metricsResult.metrics.map((metric) => [metric.adId, metric])
      );
      setAdMetrics(metricsMap);
    } else {
      setAdMetrics({});
    }
    setLoading(false);
  };

  const handleCreateAd = async () => {
    if (!newAd.title.trim() || !newAd.content.trim() || newAd.budget_cents <= 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires et définir un budget valide',
        variant: 'destructive',
      });
      return;
    }

    const adData = {
      ...newAd,
      budget_cents: newAd.budget_cents * 100, // Convert to cents
      status: 'draft' as const,
    } as const;

    const result = await createCompetitorAd(adData);
    if (result.success) {
      toast({
        title: 'Succès',
        description: 'Annonce concurrente créée avec succès',
      });
      setNewAd({
        advertiser_business_id: '',
        target_competitor_ids: [],
        title: '',
        content: '',
        media_urls: [],
        budget_cents: 0,
        start_date: '',
        end_date: ''
      });
      setShowCreateForm(false);
      loadCompetitorAds();
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de créer l\'annonce concurrente',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateAd = async () => {
    if (!editingAd) return;

    const result = await updateCompetitorAd(editingAd.id, {
      title: editingAd.title,
      content: editingAd.content,
      media_urls: editingAd.media_urls,
      budget_cents: editingAd.budget_cents,
      target_competitor_ids: editingAd.target_competitor_ids,
      start_date: editingAd.start_date,
      end_date: editingAd.end_date,
      status: editingAd.status
    });

    if (result.success) {
      toast({
        title: 'Succès',
        description: 'Annonce concurrente mise à jour avec succès',
      });
      setEditingAd(null);
      loadCompetitorAds();
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de mettre à jour l\'annonce concurrente',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce concurrente ?')) {
      return;
    }

    const result = await deleteCompetitorAd(adId);
    if (result.success) {
      toast({
        title: 'Succès',
        description: 'Annonce concurrente supprimée avec succès',
      });
      loadCompetitorAds();
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de supprimer l\'annonce concurrente',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (adId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    const result = await toggleCompetitorAdStatus(adId, newStatus as 'active' | 'paused');
    if (result.success) {
      toast({
        title: 'Succès',
        description: `Annonce ${newStatus === 'active' ? 'activée' : 'mise en pause'}`,
      });
      loadCompetitorAds();
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de modifier le statut de l\'annonce',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non défini';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const calculateSpendPercentage = (ad: CompetitorAd) => {
    if (ad.budget_cents === 0) return 0;
    return Math.min(100, (ad.spent_cents / ad.budget_cents) * 100);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Annonces Concurrentes</h1>
        <p className="text-muted-foreground mt-2">
          Créez des annonces pour apparaître sur les pages de vos concurrents
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Disponible pour tous les comptes entreprise. Les impressions et clics sont suivis automatiquement.
        </p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Vos Campagnes Concurrentes</h2>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Créer Annonce Concurrente
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nouvelle Annonce Concurrente</CardTitle>
            <CardDescription>
              Créez une campagne pour apparaître sur les pages de vos concurrents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="advertiser-business-id">ID de l'Entreprise Annonceur</Label>
                  <Input
                    id="advertiser-business-id"
                    placeholder="Entrez l'ID de votre entreprise"
                    value={newAd.advertiser_business_id}
                    onChange={(e) => setNewAd({...newAd, advertiser_business_id: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="target-competitors">IDs des Concurrents Ciblés (facultatif)</Label>
                  <Textarea
                    id="target-competitors"
                    placeholder="Entrez les IDs des entreprises concurrentes, un par ligne"
                    rows={3}
                    value={newAd.target_competitor_ids.join('\n')}
                    onChange={(e) => setNewAd({...newAd, target_competitor_ids: e.target.value.split('\n').filter(id => id.trim())})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Si vide, l'annonce apparaîtra sur toutes les pages concurrentes
                  </p>
                </div>

                <div>
                  <Label htmlFor="budget">Budget (MAD)</Label>
                  <Input
                    id="budget"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={newAd.budget_cents}
                    onChange={(e) => setNewAd({...newAd, budget_cents: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Date de Début</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={newAd.start_date}
                      onChange={(e) => setNewAd({...newAd, start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">Date de Fin</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={newAd.end_date}
                      onChange={(e) => setNewAd({...newAd, end_date: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="ad-title">Titre de l'Annonce *</Label>
                  <Input
                    id="ad-title"
                    placeholder="Titre accrocheur pour votre annonce"
                    value={newAd.title}
                    onChange={(e) => setNewAd({...newAd, title: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="ad-content">Contenu de l'Annonce *</Label>
                  <Textarea
                    id="ad-content"
                    placeholder="Décrivez votre offre ou service en quelques mots..."
                    rows={4}
                    value={newAd.content}
                    onChange={(e) => setNewAd({...newAd, content: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="media-urls">URLs Média (facultatif)</Label>
                  <Textarea
                    id="media-urls"
                    placeholder="Ajoutez des URLs d'images séparées par des sauts de ligne"
                    rows={2}
                    value={newAd.media_urls.join('\n')}
                    onChange={(e) => setNewAd({...newAd, media_urls: e.target.value.split('\n').filter(url => url.trim())})}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleCreateAd}>
                <Target className="mr-2 h-4 w-4" />
                Créer Annonce Concurrente
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : ads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune annonce concurrente</h3>
            <p className="text-muted-foreground mb-4">
              Créez votre première annonce pour apparaître sur les pages de vos concurrents
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Créer Annonce Concurrente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => {
            const metrics = adMetrics[ad.id] || { adId: ad.id, impressions: 0, clicks: 0, ctr: 0 };
            return (
            <Card key={ad.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-red-600" />
                        {ad.title}
                      </CardTitle>
                      <Badge 
                        variant={ad.status === 'active' ? 'default' : ad.status === 'paused' ? 'secondary' : 'outline'}
                        className="mt-0.5 capitalize"
                      >
                        {ad.status === 'active' ? 'Active' : ad.status === 'paused' ? 'En pause' : ad.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleToggleStatus(ad.id, ad.status)}
                    >
                      {ad.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setEditingAd(ad);
                        setShowCreateForm(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDeleteAd(ad.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{ad.content}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Budget:</span>
                    <span>{(ad.budget_cents / 100).toFixed(2)} MAD</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Dépensé:</span>
                    <span>{(ad.spent_cents / 100).toFixed(2)} MAD</span>
                  </div>
                  
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progression: {calculateSpendPercentage(ad).toFixed(0)}%</span>
                      <span>{(ad.spent_cents / 100).toFixed(2)} / {(ad.budget_cents / 100).toFixed(2)} MAD</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 rounded-full" 
                        style={{ width: `${calculateSpendPercentage(ad)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Début: {formatDate(ad.start_date)}</span>
                    <span>Fin: {formatDate(ad.end_date)}</span>
                  </div>
                  
                  {ad.target_competitor_ids && ad.target_competitor_ids.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Ciblage: {ad.target_competitor_ids.length} concurrent(s)
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                    <div className="rounded-md border p-2 text-center">
                      <p className="text-muted-foreground">Impressions</p>
                      <p className="font-semibold">{metrics.impressions}</p>
                    </div>
                    <div className="rounded-md border p-2 text-center">
                      <p className="text-muted-foreground">Clics</p>
                      <p className="font-semibold">{metrics.clicks}</p>
                    </div>
                    <div className="rounded-md border p-2 text-center">
                      <p className="text-muted-foreground">CTR</p>
                      <p className="font-semibold">{metrics.ctr}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {editingAd && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Modifier l'Annonce Concurrente</CardTitle>
            <CardDescription>
              Mettez à jour les détails de votre annonce concurrente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-advertiser-business-id">ID de l'Entreprise Annonceur</Label>
                  <Input
                    id="edit-advertiser-business-id"
                    value={editingAd.advertiser_business_id}
                    onChange={(e) => setEditingAd({...editingAd, advertiser_business_id: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-target-competitors">IDs des Concurrents Ciblés</Label>
                  <Textarea
                    id="edit-target-competitors"
                    rows={3}
                    value={editingAd.target_competitor_ids?.join('\n') || ''}
                    onChange={(e) => setEditingAd({...editingAd, target_competitor_ids: e.target.value.split('\n').filter(id => id.trim())})}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-budget">Budget (MAD)</Label>
                  <Input
                    id="edit-budget"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingAd.budget_cents / 100}
                    onChange={(e) => setEditingAd({...editingAd, budget_cents: parseFloat(e.target.value) * 100 || 0})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-start-date">Date de Début</Label>
                    <Input
                      id="edit-start-date"
                      type="date"
                      value={editingAd.start_date?.split('T')[0] || ''}
                      onChange={(e) => setEditingAd({...editingAd, start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-end-date">Date de Fin</Label>
                    <Input
                      id="edit-end-date"
                      type="date"
                      value={editingAd.end_date?.split('T')[0] || ''}
                      onChange={(e) => setEditingAd({...editingAd, end_date: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-ad-title">Titre de l'Annonce</Label>
                  <Input
                    id="edit-ad-title"
                    value={editingAd.title}
                    onChange={(e) => setEditingAd({...editingAd, title: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-ad-content">Contenu de l'Annonce</Label>
                  <Textarea
                    id="edit-ad-content"
                    rows={4}
                    value={editingAd.content}
                    onChange={(e) => setEditingAd({...editingAd, content: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-media-urls">URLs Média</Label>
                  <Textarea
                    id="edit-media-urls"
                    rows={2}
                    value={editingAd.media_urls?.join('\n') || ''}
                    onChange={(e) => setEditingAd({...editingAd, media_urls: e.target.value.split('\n').filter(url => url.trim())})}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleUpdateAd}>
                <Edit className="mr-2 h-4 w-4" />
                Mettre à Jour
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditingAd(null);
                  setShowCreateForm(false);
                }}
              >
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
