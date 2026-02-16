'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Trash2, Edit, AlertCircle, Loader2, X, Check, Lock, Link as LinkIcon } from "lucide-react";
import Link from 'next/link';
import { useActionState, useEffect, useState } from "react";
import { submitUpdate, type BusinessActionState } from "@/app/actions/business";
import { deleteUpdate, editUpdate } from "@/app/actions/admin";
import { useToast } from "@/hooks/use-toast";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isPaidTier } from "@/lib/tier-utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Update = {
  id: string;
  title: string;
  content: string;
  date: string;
};

function SubmitButton() {
  return (
    <Button type="submit" className="w-full md:w-auto">
      <Megaphone className="mr-2" />
      Publier
    </Button>
  );
}

export default function UpdatesPage() {
  const { businessId, profile, loading: profileLoading, error: profileError } = useBusinessProfile();
  const initialState: BusinessActionState = { status: 'idle', message: '' };
  const [state, formAction] = useActionState(submitUpdate, initialState);
  const { toast } = useToast();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Edit state
  const [editingUpdate, setEditingUpdate] = useState<Update | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; updateId: string; title: string }>({
    open: false,
    updateId: '',
    title: ''
  });

  const isPro = profile?.tier && isPaidTier(profile.tier);

  useEffect(() => {
    fetchUpdates();
  }, [businessId, profileLoading]); // Added dependencies

  useEffect(() => {
    if (state.status === 'success') {
      toast({
        title: 'Succès',
        description: state.message || 'Nouveauté publiée avec succès!'
      });
      fetchUpdates();
    } else if (state.status === 'error') {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: state.message || 'Échec de la publication. Veuillez vérifier vos informations.'
      });
    }
  }, [state.status, state.message, toast]);

  const fetchUpdates = async () => {
    if (profileLoading || !businessId) {
      // Do not stop loading here if it's just profileLoading. We wait.
      if (!profileLoading) setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data } = await supabase
      .from('updates')
      .select('*')
      .eq('business_id', businessId)
      .order('date', { ascending: false })
      .limit(10);

    setUpdates((data || []) as Update[]);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteDialog.updateId) return;

    setActionLoading(deleteDialog.updateId);
    const result = await deleteUpdate(deleteDialog.updateId);

    if (result.status === 'success') {
      toast({ title: 'Succès', description: result.message });
      setUpdates(prev => prev.filter(u => u.id !== deleteDialog.updateId));
    } else {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
    }

    setActionLoading(null);
    setDeleteDialog({ open: false, updateId: '', title: '' });
  };

  const handleEdit = async () => {
    if (!editingUpdate) return;

    setActionLoading(editingUpdate.id);
    const result = await editUpdate(editingUpdate.id, editTitle, editContent);

    if (result.status === 'success') {
      toast({ title: 'Succès', description: result.message });
      setUpdates(prev => prev.map(u =>
        u.id === editingUpdate.id
          ? { ...u, title: editTitle, content: editContent }
          : u
      ));
      setEditingUpdate(null);
    } else {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
    }

    setActionLoading(null);
  };

  const openEditDialog = (update: Update) => {
    setEditingUpdate(update);
    setEditTitle(update.title);
    setEditContent(update.content);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gérer les Nouveautés</h1>
        <p className="text-muted-foreground">
          Partagez des annonces, offres spéciales ou actualités avec vos clients.
        </p>
      </div>

      {!isPro && !loading && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/10">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center space-y-4">
            <div className="p-4 bg-amber-100 dark:bg-amber-900/20 rounded-full">
              <Lock className="h-8 w-8 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-xl font-bold text-amber-800 dark:text-amber-400">Fonctionnalité PRO / GOLD</h3>
              <p className="text-sm text-amber-700/80 dark:text-amber-500/80">
                La diffusion de nouveautés et promotions est réservée aux abonnés PRO ou GOLD. Boostez votre visibilité en partageant vos actualités directement avec vos abonnés.
              </p>
            </div>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl" asChild>
              <Link href="/dashboard/premium">
                Passer en Version PRO
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isPro && (
        <>

          {state.status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Poster une nouvelle Nouveauté</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form action={formAction} className="space-y-4">
                    {businessId && <input type="hidden" name="businessId" value={businessId} />}
                    <div className="space-y-2">
                      <Label htmlFor="updateTitle">Titre de la nouveauté</Label>
                      <Input id="updateTitle" name="updateTitle" placeholder="Ex: Offre spéciale St-Valentin" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="updateText">Contenu de la nouveauté</Label>
                      <Textarea id="updateText" name="updateText" placeholder="Décrivez votre annonce en détail..." className="min-h-32" required />
                    </div>
                    <CardFooter className="px-0">
                      <SubmitButton />
                    </CardFooter>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Nouveautés publiées</CardTitle>
                  <CardDescription>
                    Vos dernières publications.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : updates.length > 0 ? (
                    updates.map(update => (
                      <div key={update.id} className="flex items-start justify-between gap-2 p-3 rounded-md border bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{update.title}</p>
                          <p className="text-xs text-muted-foreground">{update.date}</p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{update.content}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {actionLoading === update.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(update)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteDialog({
                                  open: true,
                                  updateId: update.id,
                                  title: update.title
                                })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucune nouveauté publiée pour le moment.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Edit Dialog */}
          <Dialog open={!!editingUpdate} onOpenChange={(open) => !open && setEditingUpdate(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier la nouveauté</DialogTitle>
                <DialogDescription>
                  Modifiez le titre et le contenu de votre publication.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editTitle">Titre</Label>
                  <Input
                    id="editTitle"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Titre de la nouveauté"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editContent">Contenu</Label>
                  <Textarea
                    id="editContent"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Contenu de la nouveauté"
                    className="min-h-24"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingUpdate(null)}>
                  <X className="mr-2 h-4 w-4" />
                  Annuler
                </Button>
                <Button
                  onClick={handleEdit}
                  disabled={actionLoading === editingUpdate?.id}
                >
                  {actionLoading === editingUpdate?.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Enregistrer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, updateId: '', title: '' })}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Supprimer la nouveauté</DialogTitle>
                <DialogDescription>
                  Êtes-vous sûr de vouloir supprimer <strong>"{deleteDialog.title}"</strong> ?
                  <br />
                  Cette action est irréversible.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialog({ open: false, updateId: '', title: '' })}>
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={actionLoading === deleteDialog.updateId}
                >
                  {actionLoading === deleteDialog.updateId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Supprimer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
