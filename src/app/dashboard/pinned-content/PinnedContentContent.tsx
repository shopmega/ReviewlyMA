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
  Pin, 
  PinOff, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Upload,
  FileImage
} from 'lucide-react';
import { PinnedContent } from '@/lib/types';
import { 
  createPinnedContent, 
  updatePinnedContent, 
  deletePinnedContent, 
  getUserPinnedContent,
  togglePinnedContentStatus
} from '@/lib/pinned-content/server-actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

import { ClientOnly } from '@/components/ClientOnly';

export function PinnedContentContent() {
  return (
    <ClientOnly>
      <PinnedContentContentInner />
    </ClientOnly>
  );
}

function PinnedContentContentInner() {
  const [contents, setContents] = useState<PinnedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('manage');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingContent, setEditingContent] = useState<PinnedContent | null>(null);
  const [newContent, setNewContent] = useState({
    business_id: '',
    title: '',
    content: '',
    media_urls: [] as string[],
    is_active: true
  });

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadPinnedContent();
    }
  }, [user]);

  const loadPinnedContent = async () => {
    setLoading(true);
    const result = await getUserPinnedContent();
    if (result.success) {
      setContents(result.contents || []);
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de charger le contenu épinglé',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleCreateContent = async () => {
    if (!newContent.title.trim() || !newContent.content.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    const result = await createPinnedContent(newContent);
    if (result.success) {
      toast({
        title: 'Succès',
        description: 'Contenu épinglé créé avec succès',
      });
      setNewContent({
        business_id: '',
        title: '',
        content: '',
        media_urls: [],
        is_active: true
      });
      setShowCreateForm(false);
      loadPinnedContent();
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de créer le contenu épinglé',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateContent = async () => {
    if (!editingContent) return;

    const result = await updatePinnedContent(editingContent.id, {
      title: editingContent.title,
      content: editingContent.content,
      media_urls: editingContent.media_urls,
      is_active: editingContent.is_active
    });

    if (result.success) {
      toast({
        title: 'Succès',
        description: 'Contenu épinglé mis à jour avec succès',
      });
      setEditingContent(null);
      loadPinnedContent();
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de mettre à jour le contenu épinglé',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contenu épinglé ?')) {
      return;
    }

    const result = await deletePinnedContent(contentId);
    if (result.success) {
      toast({
        title: 'Succès',
        description: 'Contenu épinglé supprimé avec succès',
      });
      loadPinnedContent();
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de supprimer le contenu épinglé',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (contentId: string) => {
    const result = await togglePinnedContentStatus(contentId);
    if (result.success) {
      toast({
        title: 'Succès',
        description: `Contenu ${contents.find(c => c.id === contentId)?.is_active ? 'désactivé' : 'activé'} avec succès`,
      });
      loadPinnedContent();
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de modifier le statut du contenu',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Contenu Épinglé</h1>
        <p className="text-muted-foreground mt-2">
          Mettez en avant vos annonces importantes, offres spéciales et annonces d'entreprise
        </p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Vos Contenus Épinglés</h2>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter Contenu Épinglé
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nouveau Contenu Épinglé</CardTitle>
            <CardDescription>
              Créez un nouveau contenu épinglé pour votre entreprise
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="business-id">ID de l'Entreprise</Label>
                <Input
                  id="business-id"
                  placeholder="Entrez l'ID de votre entreprise"
                  value={newContent.business_id}
                  onChange={(e) => setNewContent({...newContent, business_id: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  placeholder="Titre de votre contenu"
                  value={newContent.title}
                  onChange={(e) => setNewContent({...newContent, title: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="content">Contenu *</Label>
                <Textarea
                  id="content"
                  placeholder="Décrivez votre contenu épinglé..."
                  rows={4}
                  value={newContent.content}
                  onChange={(e) => setNewContent({...newContent, content: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="media-urls">URLs Média (facultatif)</Label>
                <Textarea
                  id="media-urls"
                  placeholder="Ajoutez des URLs d'images séparées par des sauts de ligne"
                  rows={2}
                  value={newContent.media_urls.join('\n')}
                  onChange={(e) => setNewContent({...newContent, media_urls: e.target.value.split('\n').filter(url => url.trim())})}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-active"
                  checked={newContent.is_active}
                  onChange={(e) => setNewContent({...newContent, is_active: e.target.checked})}
                />
                <Label htmlFor="is-active">Activer le contenu</Label>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateContent}>
                  <Pin className="mr-2 h-4 w-4" />
                  Créer Contenu Épinglé
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : contents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Pin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun contenu épinglé</h3>
            <p className="text-muted-foreground mb-4">
              Créez votre premier contenu épinglé pour mettre en avant des informations importantes
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter Contenu Épinglé
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {contents.map((content) => (
            <Card key={content.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Pin className="h-4 w-4 text-blue-600" />
                        {content.title}
                      </CardTitle>
                      <Badge variant={content.is_active ? 'default' : 'secondary'}>
                        {content.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleToggleStatus(content.id)}
                    >
                      {content.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setEditingContent(content);
                        setShowCreateForm(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDeleteContent(content.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{content.content}</p>
                
                {content.media_urls && content.media_urls.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {content.media_urls.slice(0, 3).map((url, index) => (
                      <div key={index} className="relative w-10 h-10 rounded-md overflow-hidden">
                        <img 
                          src={url} 
                          alt={`Média ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {content.media_urls.length > 3 && (
                      <div className="flex items-center justify-center w-10 h-10 rounded-md bg-gray-100 border border-dashed">
                        <span className="text-xs text-gray-500">+{content.media_urls.length - 3}</span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground mt-3">
                  Créé le {formatDate(content.created_at)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingContent && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Modifier le Contenu Épinglé</CardTitle>
            <CardDescription>
              Mettez à jour les détails de votre contenu épinglé
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="edit-title">Titre</Label>
                <Input
                  id="edit-title"
                  value={editingContent.title}
                  onChange={(e) => setEditingContent({...editingContent, title: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="edit-content">Contenu</Label>
                <Textarea
                  id="edit-content"
                  rows={4}
                  value={editingContent.content}
                  onChange={(e) => setEditingContent({...editingContent, content: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="edit-media-urls">URLs Média</Label>
                <Textarea
                  id="edit-media-urls"
                  rows={2}
                  value={editingContent.media_urls?.join('\n') || ''}
                  onChange={(e) => setEditingContent({...editingContent, media_urls: e.target.value.split('\n').filter(url => url.trim())})}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-is-active"
                  checked={editingContent.is_active}
                  onChange={(e) => setEditingContent({...editingContent, is_active: e.target.checked})}
                />
                <Label htmlFor="edit-is-active">Contenu Actif</Label>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleUpdateContent}>
                  <Edit className="mr-2 h-4 w-4" />
                  Mettre à Jour
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingContent(null);
                    setShowCreateForm(false);
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}