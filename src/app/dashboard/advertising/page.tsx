'use client';

export const dynamic = 'force-dynamic'; // Prevent static generation for authenticated pages

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  BarChart3,
  Coins,
  Target,
  Calendar,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  Pause,
  Play,
  TrendingUp
} from 'lucide-react';
import { Ad, SubscriptionTier } from '@/lib/types';
import {
  createAd,
  updateAd,
  deleteAd,
  getUserAds,
  toggleAdStatus,
  getActiveAds
} from '@/lib/ads/server-actions';
import { useToast } from '@/hooks/use-toast';

const AdvertisingDashboard = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('manage');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAd, setNewAd] = useState<Omit<Ad, 'id' | 'created_at' | 'updated_at' | 'spent_cents'>>({
    advertiser_id: '',
    title: '',
    content: '',
    budget_cents: 0,
    status: 'draft',
    start_date: undefined,
    end_date: undefined,
    target_business_ids: [],
    targeting_criteria: {}
  });

  const { toast } = useToast();

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    setLoading(true);
    const result = await getUserAds();
    if (result.success) {
      setAds(result.ads || []);
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de charger les annonces',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleCreateAd = async (adData: any) => {
    const result = await createAd(adData);
    if (result.success) {
      toast({
        title: 'Succès',
        description: 'Annonce créée avec succès',
      });
      setNewAd({
        advertiser_id: '',
        title: '',
        content: '',
        budget_cents: 0,
        status: 'draft',
        start_date: undefined,
        end_date: undefined,
        target_business_ids: [],
        targeting_criteria: {}
      });
      setShowCreateDialog(false);
      setActiveTab('manage');
      loadAds();
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de créer l\'annonce',
        variant: 'destructive',
      });
    }
  };

  const handleToggleAdStatus = async (adId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    const result = await toggleAdStatus(adId, newStatus as 'active' | 'paused');
    if (result.success) {
      toast({
        title: 'Succès',
        description: `Annonce ${newStatus === 'active' ? 'activée' : 'mise en pause'}`,
      });
      loadAds();
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de modifier le statut de l\'annonce',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
      return;
    }

    const result = await deleteAd(adId);
    if (result.success) {
      toast({
        title: 'Succès',
        description: 'Annonce supprimée avec succès',
      });
      loadAds();
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de supprimer l\'annonce',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non défini';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const calculateSpendPercentage = (ad: Ad) => {
    if (ad.budget_cents === 0) return 0;
    return Math.min(100, (ad.spent_cents / ad.budget_cents) * 100);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Publicité et Placement Sponsorisé</h1>
        <p className="text-muted-foreground mt-2">
          Gérez vos campagnes publicitaires et placements sponsorisés pour augmenter la visibilité de votre entreprise
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manage">Mes Annonces</TabsTrigger>
          <TabsTrigger value="create">Créer Annonce</TabsTrigger>
          <TabsTrigger value="analytics">Analytique</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Vos Campagnes Publicitaires</h2>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer Annonce
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Créer une nouvelle annonce</DialogTitle>
                  <DialogDescription>
                    Configurez votre campagne publicitaire pour promouvoir votre entreprise
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right">Titre</Label>
                    <Input
                      id="title"
                      className="col-span-3"
                      value={newAd.title}
                      onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="content" className="text-right">Contenu</Label>
                    <Textarea
                      id="content"
                      className="col-span-3"
                      value={newAd.content}
                      onChange={(e) => setNewAd({ ...newAd, content: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="budget" className="text-right">Budget (MAD)</Label>
                    <Input
                      id="budget"
                      type="number"
                      className="col-span-3"
                      value={newAd.budget_cents / 100}
                      onChange={(e) => setNewAd({ ...newAd, budget_cents: parseFloat(e.target.value) * 100 })}
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="start_date" className="text-right">Début</Label>
                    <Input
                      id="start_date"
                      type="date"
                      className="col-span-3"
                      value={newAd.start_date || ''}
                      onChange={(e) => setNewAd({ ...newAd, start_date: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="end_date" className="text-right">Fin</Label>
                    <Input
                      id="end_date"
                      type="date"
                      className="col-span-3"
                      value={newAd.end_date || ''}
                      onChange={(e) => setNewAd({ ...newAd, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <Button onClick={() => handleCreateAd(newAd)}>Créer Annonce</Button>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : ads.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Coins className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune campagne publicitaire</h3>
                <p className="text-muted-foreground mb-4">
                  Créez votre première campagne pour promouvoir votre entreprise
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer Annonce
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ads.map((ad) => (
                <Card key={ad.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{ad.title}</CardTitle>
                        <Badge
                          variant={ad.status === 'active' ? 'default' : ad.status === 'paused' ? 'secondary' : 'outline'}
                          className="mt-2 capitalize"
                        >
                          {ad.status === 'active' ? 'Active' : ad.status === 'paused' ? 'En pause' : ad.status}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleAdStatus(ad.id, ad.status)}
                        >
                          {ad.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="outline">
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
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${calculateSpendPercentage(ad)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>Début: {formatDate(ad.start_date)}</span>
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
              <CardTitle>Créer une Nouvelle Campagne</CardTitle>
              <CardDescription>
                Configurez une campagne publicitaire pour promouvoir votre entreprise
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="campaign-title">Titre de la Campagne</Label>
                      <Input
                        id="campaign-title"
                        placeholder="Nommez votre campagne"
                        value={newAd.title}
                        onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="campaign-type">Type de Campagne</Label>
                      <Select
                        value={newAd.targeting_criteria?.type || ''}
                        onValueChange={(val) => setNewAd({ ...newAd, targeting_criteria: { ...newAd.targeting_criteria, type: val } })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="search">Placement dans les résultats de recherche</SelectItem>
                          <SelectItem value="sidebar">Annonce dans la barre latérale</SelectItem>
                          <SelectItem value="homepage">Annonce sur la page d'accueil</SelectItem>
                          <SelectItem value="competitor">Annonce sur les pages concurrentes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="daily-budget">Budget Total (MAD)</Label>
                      <Input
                        id="daily-budget"
                        type="number"
                        placeholder="0.00"
                        value={newAd.budget_cents / 100}
                        onChange={(e) => setNewAd({ ...newAd, budget_cents: parseFloat(e.target.value) * 100 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="target-audience">Cible de la Campagne</Label>
                      <Select
                        value={newAd.targeting_criteria?.audience || ''}
                        onValueChange={(val) => setNewAd({ ...newAd, targeting_criteria: { ...newAd.targeting_criteria, audience: val } })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une cible" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les utilisateurs</SelectItem>
                          <SelectItem value="premium">Utilisateurs premium seulement</SelectItem>
                          <SelectItem value="location">Par localisation</SelectItem>
                          <SelectItem value="interest">Par centre d'intérêt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="start-date">Date de Début</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={newAd.start_date || ''}
                        onChange={(e) => setNewAd({ ...newAd, start_date: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="end-date">Date de Fin</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={newAd.end_date || ''}
                        onChange={(e) => setNewAd({ ...newAd, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ad-content">Contenu de l'Annonce</Label>
                    <Textarea
                      id="ad-content"
                      placeholder="Décrivez votre offre ou service en quelques mots"
                      value={newAd.content}
                      onChange={(e) => setNewAd({ ...newAd, content: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                <Button className="w-full" onClick={() => handleCreateAd(newAd)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer la Campagne
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center">
                  <div className="rounded-full bg-blue-100 p-3 mr-4">
                    <Eye className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Impressions</p>
                    <p className="text-2xl font-bold">12,345</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center">
                  <div className="rounded-full bg-green-100 p-3 mr-4">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clics</p>
                    <p className="text-2xl font-bold">1,234</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center">
                  <div className="rounded-full bg-sky-100 p-3 mr-4">
                    <BarChart3 className="h-6 w-6 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">CTR</p>
                    <p className="text-2xl font-bold">9.8%</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center">
                  <div className="rounded-full bg-orange-100 p-3 mr-4">
                    <DollarSign className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dépenses</p>
                    <p className="text-2xl font-bold">1,234 MAD</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Performances des Campagnes</CardTitle>
                <CardDescription>
                  Suivez les performances de vos campagnes publicitaires au fil du temps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p>Graphique de performance</p>
                    <p className="text-sm">Les données seront disponibles une fois que vos campagnes auront commencé</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvertisingDashboard;
