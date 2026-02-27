'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Megaphone, Trash2, Edit, AlertCircle, Loader2, X, Check, Lock, Pin, PinOff } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { submitUpdate, type BusinessActionState } from '@/app/actions/business';
import { deleteUpdate, editUpdate, setUpdatePinned } from '@/app/actions/admin';
import { useToast } from '@/hooks/use-toast';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { createClient } from '@/lib/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isPaidTier } from '@/lib/tier-utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Update = {
  id: string | number;
  title: string;
  content: string;
  date: string;
  is_pinned?: boolean;
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
  const { businessId, profile, loading: profileLoading } = useBusinessProfile();
  const initialState: BusinessActionState = { status: 'idle', message: '' };
  const [state, formAction] = useActionState(submitUpdate, initialState);
  const { toast } = useToast();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | number | null>(null);

  const [editingUpdate, setEditingUpdate] = useState<Update | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; updateId: string | number; title: string }>({
    open: false,
    updateId: '',
    title: '',
  });

  const isPro = profile?.tier && isPaidTier(profile.tier);

  useEffect(() => {
    void fetchUpdates();
  }, [businessId, profileLoading]);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Succes', description: state.message || 'Nouveaute publiee.' });
      void fetchUpdates();
    } else if (state.status === 'error') {
      toast({ variant: 'destructive', title: 'Erreur', description: state.message || 'Echec de publication.' });
    }
  }, [state.status, state.message, toast]);

  const fetchUpdates = async () => {
    if (profileLoading || !businessId) {
      if (!profileLoading) setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data } = await supabase
      .from('updates')
      .select('*')
      .eq('business_id', businessId)
      .order('is_pinned', { ascending: false })
      .order('date', { ascending: false })
      .limit(20);

    setUpdates((data || []) as Update[]);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteDialog.updateId) return;

    setActionLoading(deleteDialog.updateId);
    const result = await deleteUpdate(String(deleteDialog.updateId));
    if (result.status === 'success') {
      toast({ title: 'Succes', description: result.message });
      setUpdates((prev) => prev.filter((u) => String(u.id) !== String(deleteDialog.updateId)));
    } else {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
    }

    setActionLoading(null);
    setDeleteDialog({ open: false, updateId: '', title: '' });
  };

  const handleEdit = async () => {
    if (!editingUpdate) return;
    setActionLoading(editingUpdate.id);
    const result = await editUpdate(String(editingUpdate.id), editTitle, editContent);
    if (result.status === 'success') {
      toast({ title: 'Succes', description: result.message });
      setUpdates((prev) => prev.map((u) => (String(u.id) === String(editingUpdate.id) ? { ...u, title: editTitle, content: editContent } : u)));
      setEditingUpdate(null);
    } else {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const handleTogglePin = async (update: Update) => {
    setActionLoading(update.id);
    const result = await setUpdatePinned(String(update.id), !update.is_pinned);
    if (result.status === 'success') {
      toast({ title: 'Succes', description: result.message });
      await fetchUpdates();
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
        <h1 className="text-3xl font-bold tracking-tight">Gerer les Nouveautes</h1>
        <p className="text-muted-foreground">Partagez des annonces, offres speciales ou actualites avec vos clients.</p>
      </div>

      {!isPro && !loading && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/10">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center space-y-4">
            <div className="p-4 bg-amber-100 dark:bg-amber-900/20 rounded-full">
              <Lock className="h-8 w-8 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-xl font-bold text-amber-800 dark:text-amber-400">Fonctionnalite PRO / GOLD</h3>
              <p className="text-sm text-amber-700/80 dark:text-amber-500/80">La diffusion de nouveautes est reservee aux abonnes PRO ou GOLD.</p>
            </div>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl" asChild>
              <Link href="/dashboard/premium">Passer en Version PRO</Link>
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
                  <CardTitle>Poster une nouvelle Nouveaute</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form action={formAction} className="space-y-4">
                    {businessId && <input type="hidden" name="businessId" value={businessId} />}
                    <div className="space-y-2">
                      <Label htmlFor="updateTitle">Titre de la nouveaute</Label>
                      <Input id="updateTitle" name="updateTitle" placeholder="Ex: Offre speciale de saison" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="updateText">Contenu</Label>
                      <Textarea id="updateText" name="updateText" placeholder="Decrivez votre annonce..." className="min-h-32" required />
                    </div>
                    <div className="flex items-center gap-2">
                      <input id="isPinned" name="isPinned" type="checkbox" className="h-4 w-4" />
                      <Label htmlFor="isPinned">Epingler cette nouveaute en haut de la liste</Label>
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
                  <CardTitle>Nouveautes publiees</CardTitle>
                  <CardDescription>Vos dernieres publications.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : updates.length > 0 ? (
                    updates.map((update) => (
                      <div key={String(update.id)} className="flex items-start justify-between gap-2 p-3 rounded-md border bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate flex items-center gap-2">
                            {update.title}
                            {update.is_pinned && (
                              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                                <Pin className="mr-1 h-3 w-3" />
                                Epinglee
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{update.date}</p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{update.content}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {actionLoading === update.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleTogglePin(update)}>
                                {update.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(update)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteDialog({ open: true, updateId: update.id, title: update.title })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucune nouveaute publiee pour le moment.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Dialog open={!!editingUpdate} onOpenChange={(open) => !open && setEditingUpdate(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier la nouveaute</DialogTitle>
                <DialogDescription>Modifiez le titre et le contenu de votre publication.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editTitle">Titre</Label>
                  <Input id="editTitle" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editContent">Contenu</Label>
                  <Textarea id="editContent" value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-24" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingUpdate(null)}>
                  <X className="mr-2 h-4 w-4" />
                  Annuler
                </Button>
                <Button onClick={handleEdit} disabled={actionLoading === editingUpdate?.id}>
                  {actionLoading === editingUpdate?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Enregistrer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, updateId: '', title: '' })}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Supprimer la nouveaute</DialogTitle>
                <DialogDescription>
                  Etes-vous sur de vouloir supprimer <strong>"{deleteDialog.title}"</strong> ?
                  <br />
                  Cette action est irreversible.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialog({ open: false, updateId: '', title: '' })}>Annuler</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={actionLoading === deleteDialog.updateId}>
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
