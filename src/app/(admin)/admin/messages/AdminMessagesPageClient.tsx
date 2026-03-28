'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getAdminMessages, markAdminMessagesRead, moderateAdminMessage, type AdminMessageRow } from '@/app/actions/admin-messages';
import { Building, Eye, EyeOff, Loader2, MailOpen, MessageSquare, RefreshCcw, ShieldAlert } from 'lucide-react';

export default function AdminMessagesPageClient({ initialMessages }: { initialMessages: AdminMessageRow[] }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState(initialMessages);
  const [source, setSource] = useState<'all' | 'inbound' | 'business'>('all');
  const [read, setRead] = useState<'all' | 'unread' | 'read'>('all');
  const [moderation, setModeration] = useState<'all' | 'visible' | 'hidden'>('all');
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<AdminMessageRow | null>(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const [moderating, setModerating] = useState(false);

  async function refresh(nextSource = source, nextRead = read, nextModeration = moderation) {
    setLoading(true);
    try {
      const data = await getAdminMessages({ source: nextSource, read: nextRead, moderation: nextModeration });
      setMessages(data);
    } catch (error: any) {
      toast({ title: 'Erreur', description: error?.message || 'Impossible de charger les messages.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function markUnreadVisibleAsRead() {
    const unreadIds = messages.filter((message) => !message.read_at).map((message) => message.id);
    const result = await markAdminMessagesRead(unreadIds);
    if (result.status !== 'success') {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Succes', description: result.message });
    await refresh();
  }

  async function applyModeration(moderationStatus: 'visible' | 'hidden') {
    if (!selectedMessage) return;
    setModerating(true);
    try {
      const result = await moderateAdminMessage({
        messageId: selectedMessage.id,
        moderationStatus,
        moderationNotes,
      });
      if (result.status !== 'success') {
        toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Succes', description: result.message });
      setSelectedMessage(null);
      setModerationNotes('');
      await refresh();
    } finally {
      setModerating(false);
    }
  }

  const unreadCount = messages.filter((message) => !message.read_at).length;
  const inboundCount = messages.filter((message) => !message.is_from_business).length;
  const hiddenCount = messages.filter((message) => message.moderation_status === 'hidden').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages entreprises</h1>
        <p className="mt-1 text-muted-foreground">Journal admin et moderation des conversations directes entre visiteurs et entreprises.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Messages charges</CardTitle></CardHeader><CardContent className="text-3xl font-black">{messages.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Non lus</CardTitle></CardHeader><CardContent className="text-3xl font-black text-amber-600">{unreadCount}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Entrants</CardTitle></CardHeader><CardContent className="text-3xl font-black">{inboundCount}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Masques</CardTitle></CardHeader><CardContent className="text-3xl font-black text-rose-600">{hiddenCount}</CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>Journal des messages</CardTitle>
          <div className="flex flex-wrap gap-3">
            <Select value={source} onValueChange={(value: 'all' | 'inbound' | 'business') => { setSource(value); void refresh(value, read); }}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les sources</SelectItem>
                <SelectItem value="inbound">Messages entrants</SelectItem>
                <SelectItem value="business">Reponses entreprises</SelectItem>
              </SelectContent>
            </Select>
            <Select value={read} onValueChange={(value: 'all' | 'unread' | 'read') => { setRead(value); void refresh(source, value); }}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="unread">Non lus</SelectItem>
                <SelectItem value="read">Lus</SelectItem>
              </SelectContent>
            </Select>
            <Select value={moderation} onValueChange={(value: 'all' | 'visible' | 'hidden') => { setModeration(value); void refresh(source, read, value); }}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="visible">Visibles</SelectItem>
                <SelectItem value="hidden">Masques</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Rafraichir
            </Button>
            <Button onClick={() => void markUnreadVisibleAsRead()} disabled={loading || unreadCount === 0}>
              <MailOpen className="mr-2 h-4 w-4" />
              Tout marquer lu
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : messages.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground"><MessageSquare className="mx-auto mb-3 h-10 w-10" />Aucun message pour ce filtre.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Expediteur</TableHead>
                    <TableHead>Contenu</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Moderation</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell>
                        <Link href={`/businesses/${message.businesses?.slug || message.business_id}`} className="inline-flex items-center gap-2 font-medium hover:text-primary">
                          <Building className="h-4 w-4" />
                          {message.businesses?.name || message.business_id}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={message.is_from_business ? 'secondary' : 'default'}>
                          {message.is_from_business ? 'Entreprise' : 'Visiteur'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{message.sender_name || '-'}</p>
                          <p className="text-muted-foreground">{message.sender_email || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[420px] whitespace-normal text-sm">{message.content}</TableCell>
                      <TableCell>
                        {message.read_at ? <Badge variant="outline">Lu</Badge> : <Badge className="bg-amber-500 text-white">Non lu</Badge>}
                      </TableCell>
                      <TableCell>
                        {message.moderation_status === 'hidden' ? (
                          <div className="space-y-1">
                            <Badge className="bg-rose-600 text-white">Masque</Badge>
                            {message.moderation_notes && <p className="max-w-[220px] text-xs text-muted-foreground">{message.moderation_notes}</p>}
                          </div>
                        ) : (
                          <Badge variant="secondary">Visible</Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(message.created_at).toLocaleString('fr-FR')}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMessage(message);
                            setModerationNotes(message.moderation_notes || '');
                          }}
                        >
                          <ShieldAlert className="mr-2 h-4 w-4" />
                          Moderer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedMessage)} onOpenChange={(open) => {
        if (!open) {
          setSelectedMessage(null);
          setModerationNotes('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Moderation du message</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <p className="font-medium">{selectedMessage.sender_name || selectedMessage.sender_email || 'Expediteur inconnu'}</p>
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{selectedMessage.content}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message-moderation-notes">Note interne</Label>
                <Textarea
                  id="message-moderation-notes"
                  value={moderationNotes}
                  onChange={(event) => setModerationNotes(event.target.value)}
                  placeholder="Pourquoi ce message doit etre masque ou restaure"
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => void applyModeration('visible')}
              disabled={moderating || selectedMessage?.moderation_status === 'visible'}
            >
              <Eye className="mr-2 h-4 w-4" />
              Restaurer
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void applyModeration('hidden')}
              disabled={moderating || selectedMessage?.moderation_status === 'hidden'}
            >
              {moderating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <EyeOff className="mr-2 h-4 w-4" />}
              Masquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
