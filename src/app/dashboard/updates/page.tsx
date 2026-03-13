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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18n } from '@/components/providers/i18n-provider';

type Update = {
  id: string | number;
  title: string;
  content: string;
  date: string;
  is_pinned?: boolean;
};

function SubmitButton({ label }: { label: string }) {
  return (
    <Button type="submit" className="w-full md:w-auto">
      <Megaphone className="mr-2" />
      {label}
    </Button>
  );
}

export default function UpdatesPage() {
  const { businessId, hasPaidAccess, loading: profileLoading } = useBusinessProfile();
  const initialState: BusinessActionState = { status: 'idle', message: '' };
  const [state, formAction] = useActionState(submitUpdate, initialState);
  const { toast } = useToast();
  const { t, tf } = useI18n();
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

  useEffect(() => {
    void fetchUpdates();
  }, [businessId, profileLoading]);

  useEffect(() => {
    if (state.status === 'success') {
      toast({
        title: t('dashboardUpdatesPage.toasts.successTitle', 'Success'),
        description: state.message || t('dashboardUpdatesPage.toasts.publishedFallback', 'Update published.'),
      });
      void fetchUpdates();
    } else if (state.status === 'error') {
      toast({
        variant: 'destructive',
        title: t('dashboardUpdatesPage.toasts.errorTitle', 'Error'),
        description: state.message || t('dashboardUpdatesPage.toasts.publishFailedFallback', 'Publishing failed.'),
      });
    }
  }, [state.status, state.message, toast, t]);

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
      toast({ title: t('dashboardUpdatesPage.toasts.successTitle', 'Success'), description: result.message });
      setUpdates((prev) => prev.filter((u) => String(u.id) !== String(deleteDialog.updateId)));
    } else {
      toast({
        title: t('dashboardUpdatesPage.toasts.errorTitle', 'Error'),
        description: result.message,
        variant: 'destructive',
      });
    }

    setActionLoading(null);
    setDeleteDialog({ open: false, updateId: '', title: '' });
  };

  const handleEdit = async () => {
    if (!editingUpdate) return;
    setActionLoading(editingUpdate.id);
    const result = await editUpdate(String(editingUpdate.id), editTitle, editContent);
    if (result.status === 'success') {
      toast({ title: t('dashboardUpdatesPage.toasts.successTitle', 'Success'), description: result.message });
      setUpdates((prev) => prev.map((u) => (String(u.id) === String(editingUpdate.id) ? { ...u, title: editTitle, content: editContent } : u)));
      setEditingUpdate(null);
    } else {
      toast({
        title: t('dashboardUpdatesPage.toasts.errorTitle', 'Error'),
        description: result.message,
        variant: 'destructive',
      });
    }
    setActionLoading(null);
  };

  const handleTogglePin = async (update: Update) => {
    setActionLoading(update.id);
    const result = await setUpdatePinned(String(update.id), !update.is_pinned);
    if (result.status === 'success') {
      toast({ title: t('dashboardUpdatesPage.toasts.successTitle', 'Success'), description: result.message });
      await fetchUpdates();
    } else {
      toast({
        title: t('dashboardUpdatesPage.toasts.errorTitle', 'Error'),
        description: result.message,
        variant: 'destructive',
      });
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
        <h1 className="text-3xl font-bold tracking-tight">
          {t('dashboardUpdatesPage.header.title', 'Manage updates')}
        </h1>
        <p className="text-muted-foreground">
          {t(
            'dashboardUpdatesPage.header.description',
            'Share announcements, special offers, or news with your customers.'
          )}
        </p>
      </div>

      {!hasPaidAccess && !loading && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/10">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center space-y-4">
            <div className="p-4 bg-amber-100 dark:bg-amber-900/20 rounded-full">
              <Lock className="h-8 w-8 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-xl font-bold text-amber-800 dark:text-amber-400">
                {t('dashboardUpdatesPage.pro.title', 'Growth / Gold feature')}
              </h3>
              <p className="text-sm text-amber-700/80 dark:text-amber-500/80">
                {t(
                  'dashboardUpdatesPage.pro.description',
                  'Posting updates is reserved for Growth and Gold subscribers.'
                )}
              </p>
            </div>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl" asChild>
              <Link href="/dashboard/premium">{t('dashboardUpdatesPage.pro.cta', 'Upgrade your plan')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {hasPaidAccess && (
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
                  <CardTitle>{t('dashboardUpdatesPage.form.title', 'Post a new update')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form action={formAction} className="space-y-4">
                    {businessId && <input type="hidden" name="businessId" value={businessId} />}
                    <div className="space-y-2">
                      <Label htmlFor="updateTitle">
                        {t('dashboardUpdatesPage.form.updateTitleLabel', 'Update title')}
                      </Label>
                      <Input
                        id="updateTitle"
                        name="updateTitle"
                        placeholder={t('dashboardUpdatesPage.form.updateTitlePlaceholder', 'Ex: Seasonal special offer')}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="updateText">{t('dashboardUpdatesPage.form.updateTextLabel', 'Content')}</Label>
                      <Textarea
                        id="updateText"
                        name="updateText"
                        placeholder={t('dashboardUpdatesPage.form.updateTextPlaceholder', 'Describe your announcement...')}
                        className="min-h-32"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input id="isPinned" name="isPinned" type="checkbox" className="h-4 w-4" />
                      <Label htmlFor="isPinned">
                        {t('dashboardUpdatesPage.form.isPinnedLabel', 'Pin this update at the top of the list')}
                      </Label>
                    </div>
                    <CardFooter className="px-0">
                      <SubmitButton label={t('dashboardUpdatesPage.form.publish', 'Publish')} />
                    </CardFooter>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>{t('dashboardUpdatesPage.list.title', 'Published updates')}</CardTitle>
                  <CardDescription>{t('dashboardUpdatesPage.list.description', 'Your latest posts.')}</CardDescription>
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
                                {t('dashboardUpdatesPage.list.pinnedBadge', 'Pinned')}
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
                                <span className="sr-only">
                                  {update.is_pinned
                                    ? t('dashboardUpdatesPage.list.unpinAriaLabel', 'Unpin update')
                                    : t('dashboardUpdatesPage.list.pinAriaLabel', 'Pin update')}
                                </span>
                                {update.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(update)}>
                                <span className="sr-only">{t('dashboardUpdatesPage.list.editAriaLabel', 'Edit update')}</span>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteDialog({ open: true, updateId: update.id, title: update.title })}
                              >
                                <span className="sr-only">{t('dashboardUpdatesPage.list.deleteAriaLabel', 'Delete update')}</span>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t('dashboardUpdatesPage.list.empty', 'No updates published yet.')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Dialog open={!!editingUpdate} onOpenChange={(open) => !open && setEditingUpdate(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('dashboardUpdatesPage.dialogs.edit.title', 'Edit update')}</DialogTitle>
                <DialogDescription>
                  {t('dashboardUpdatesPage.dialogs.edit.description', 'Edit the title and content of your post.')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editTitle">{t('dashboardUpdatesPage.dialogs.edit.titleLabel', 'Title')}</Label>
                  <Input id="editTitle" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editContent">{t('dashboardUpdatesPage.dialogs.edit.contentLabel', 'Content')}</Label>
                  <Textarea id="editContent" value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-24" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingUpdate(null)}>
                  <X className="mr-2 h-4 w-4" />
                  {t('dashboardUpdatesPage.common.cancel', 'Cancel')}
                </Button>
                <Button onClick={handleEdit} disabled={actionLoading === editingUpdate?.id}>
                  {actionLoading === editingUpdate?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  {t('dashboardUpdatesPage.common.save', 'Save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, updateId: '', title: '' })}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('dashboardUpdatesPage.dialogs.delete.title', 'Delete update')}</DialogTitle>
                <DialogDescription>
                  {tf(
                    'dashboardUpdatesPage.dialogs.delete.description',
                    'Are you sure you want to delete "{title}"?',
                    { title: deleteDialog.title }
                  )}
                  <br />
                  {t('dashboardUpdatesPage.dialogs.delete.irreversible', 'This action cannot be undone.')}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialog({ open: false, updateId: '', title: '' })}>
                  {t('dashboardUpdatesPage.common.cancel', 'Cancel')}
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={actionLoading === deleteDialog.updateId}>
                  {actionLoading === deleteDialog.updateId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('dashboardUpdatesPage.common.delete', 'Delete')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
