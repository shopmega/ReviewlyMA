'use client';

import { useEffect, useState } from 'react';
import { Check, Clock3, Loader2, RotateCcw, ShieldAlert, X } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type AppealRow = {
  id: string;
  review_id: number;
  appellant_user_id: string;
  appeal_type: 'author' | 'company_owner';
  message: string;
  status: 'open' | 'in_review' | 'accepted' | 'rejected';
  created_at: string;
  resolved_at: string | null;
};

export default function ReviewAppealsAdminPage() {
  const [appeals, setAppeals] = useState<AppealRow[]>([]);
  const [queueFilter, setQueueFilter] = useState<'all' | 'active' | 'at_risk' | 'breached'>('all');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const { toast } = useToast();
  const now = Date.now();

  const fetchAppeals = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('review_appeals')
      .select('id,review_id,appellant_user_id,appeal_type,message,status,created_at,resolved_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setAppeals((data || []) as AppealRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchAppeals();
  }, []);

  const resolveAppeal = async (appealId: string, status: 'accepted' | 'rejected') => {
    const note = window.prompt(
      status === 'accepted'
        ? 'Note de resolution (optionnel):'
        : 'Raison du rejet (obligatoire):'
    );
    if (note === null) return;
    if (status === 'rejected' && !note.trim()) {
      toast({ title: 'Erreur', description: 'Une raison est obligatoire.', variant: 'destructive' });
      return;
    }

    setActingId(appealId);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('resolve_review_appeal', {
      p_appeal_id: appealId,
      p_status: status,
      p_resolution_note: note.trim() || null,
    });

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      setActingId(null);
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (result?.success === false) {
      toast({ title: 'Erreur', description: result.message || 'Echec de resolution', variant: 'destructive' });
    } else {
      toast({ title: 'Succes', description: 'Appel resolu.' });
      await fetchAppeals();
    }
    setActingId(null);
  };

  const getStatusBadge = (status: AppealRow['status']) => {
    if (status === 'open') return <Badge variant="outline">Ouvert</Badge>;
    if (status === 'in_review') return <Badge variant="outline" className="border-orange-500 text-orange-600">En revue</Badge>;
    if (status === 'accepted') return <Badge className="bg-emerald-600 text-white">Accepte</Badge>;
    return <Badge variant="destructive">Rejete</Badge>;
  };

  const getAppealSlaState = (appeal: AppealRow): 'no_sla' | 'healthy' | 'at_risk' | 'breached' => {
    if (appeal.status === 'accepted' || appeal.status === 'rejected') return 'no_sla';
    const ageHours = Math.max(0, (now - new Date(appeal.created_at).getTime()) / (1000 * 60 * 60));
    const targetHours = appeal.status === 'open' ? 48 : 72;
    if (ageHours > targetHours) return 'breached';
    if (ageHours > targetHours - 12) return 'at_risk';
    return 'healthy';
  };

  const activeAppeals = appeals.filter((a) => a.status === 'open' || a.status === 'in_review');
  const breachedAppeals = activeAppeals.filter((a) => getAppealSlaState(a) === 'breached');
  const atRiskAppeals = activeAppeals.filter((a) => getAppealSlaState(a) === 'at_risk');
  const filteredAppeals = appeals.filter((appeal) => {
    if (queueFilter === 'all') return true;
    if (queueFilter === 'active') return appeal.status === 'open' || appeal.status === 'in_review';
    if (queueFilter === 'at_risk') return getAppealSlaState(appeal) === 'at_risk';
    return getAppealSlaState(appeal) === 'breached';
  });
  const resolvedLast7Days = appeals.filter((a) =>
    (a.status === 'accepted' || a.status === 'rejected') &&
    a.resolved_at &&
    (now - new Date(a.resolved_at).getTime()) <= 7 * 24 * 60 * 60 * 1000
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Appels avis</h1>
        <p className="text-muted-foreground mt-1">Traitement des appels de moderation d avis.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Appels actifs</CardDescription>
            <CardTitle className="text-2xl">{activeAppeals.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Open + in_review.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>SLA depasses</CardDescription>
            <CardTitle className="text-2xl text-rose-600">{breachedAppeals.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Open &gt; 48h, in_review &gt; 72h.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>SLA a risque</CardDescription>
            <CardTitle className="text-2xl text-amber-600">{atRiskAppeals.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Moins de 12h avant depassement.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resolus (7 jours)</CardDescription>
            <CardTitle className="text-2xl">{resolvedLast7Days}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Cadence recente de traitement.</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File des appels</CardTitle>
          <CardDescription>{appeals.filter((a) => a.status === 'open' || a.status === 'in_review').length} appels actifs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={queueFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setQueueFilter('all')}
            >
              Tous ({appeals.length})
            </Button>
            <Button
              size="sm"
              variant={queueFilter === 'active' ? 'default' : 'outline'}
              onClick={() => setQueueFilter('active')}
            >
              Actifs ({activeAppeals.length})
            </Button>
            <Button
              size="sm"
              variant={queueFilter === 'at_risk' ? 'default' : 'outline'}
              onClick={() => setQueueFilter('at_risk')}
            >
              A risque ({atRiskAppeals.length})
            </Button>
            <Button
              size="sm"
              variant={queueFilter === 'breached' ? 'destructive' : 'outline'}
              onClick={() => setQueueFilter('breached')}
            >
              SLA depasses ({breachedAppeals.length})
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredAppeals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Aucun appel pour ce filtre.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Avis</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppeals.map((appeal) => (
                    <TableRow key={appeal.id} className={getAppealSlaState(appeal) === 'breached' ? 'bg-rose-50/60 hover:bg-rose-50' : ''}>
                      <TableCell>
                        <Link href={`/admin/avis`} className="font-medium hover:text-primary">#{appeal.review_id}</Link>
                      </TableCell>
                      <TableCell>{appeal.appeal_type === 'author' ? 'Auteur' : 'Entreprise'}</TableCell>
                      <TableCell className="max-w-[420px] truncate">{appeal.message}</TableCell>
                      <TableCell>{getStatusBadge(appeal.status)}</TableCell>
                      <TableCell>
                        {(() => {
                          const slaState = getAppealSlaState(appeal);
                          if (slaState === 'no_sla') return <span className="text-xs text-muted-foreground">-</span>;
                          if (slaState === 'healthy') {
                            return (
                              <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                                <Clock3 className="h-3 w-3 mr-1" /> OK
                              </Badge>
                            );
                          }
                          if (slaState === 'at_risk') {
                            return (
                              <Badge variant="outline" className="border-amber-500 text-amber-600">
                                <Clock3 className="h-3 w-3 mr-1" /> A risque
                              </Badge>
                            );
                          }
                          return (
                            <Badge variant="outline" className="border-rose-500 text-rose-600">
                              <ShieldAlert className="h-3 w-3 mr-1" /> Depasse
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell>{new Date(appeal.created_at).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {(appeal.status === 'open' || appeal.status === 'in_review') && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-emerald-600"
                              disabled={actingId === appeal.id}
                              onClick={() => resolveAppeal(appeal.id, 'accepted')}
                              title="Accepter"
                            >
                              {actingId === appeal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-rose-600"
                              disabled={actingId === appeal.id}
                              onClick={() => resolveAppeal(appeal.id, 'rejected')}
                              title="Rejeter"
                            >
                              {actingId === appeal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            </Button>
                          </>
                        )}
                        {appeal.status === 'accepted' && <RotateCcw className="inline h-4 w-4 text-emerald-600" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
