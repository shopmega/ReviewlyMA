'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Building2, Check, Clock, Loader2, ShieldCheck, X } from 'lucide-react';
import { getAdminBusinessReports, resolveAdminBusinessReport, type AdminBusinessReport } from '@/app/actions/admin-business-reports';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const reasonLabels: Record<string, string> = {
  closed: 'Lieu ferme',
  duplicate: 'Doublon',
  incorrect_info: 'Informations incorrectes',
  offensive: 'Contenu offensant',
  scam: 'Arnaque/fraude',
  other: 'Autre',
};

export default function BusinessReportsPageClient({
  initialReports,
  initialFilterStatus,
}: {
  initialReports: AdminBusinessReport[];
  initialFilterStatus: 'pending' | 'all';
}) {
  const [reports, setReports] = useState<AdminBusinessReport[]>(initialReports);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all'>(initialFilterStatus);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (filterStatus === initialFilterStatus) return;
    void fetchReports(filterStatus);
  }, [filterStatus, initialFilterStatus]);

  async function fetchReports(nextFilterStatus: 'pending' | 'all' = filterStatus) {
    setLoading(true);
    try {
      const data = await getAdminBusinessReports(nextFilterStatus);
      setReports(data);
    } catch (error: any) {
      toast({ title: 'Erreur', description: error?.message || 'Impossible de charger les signalements.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const pendingCount = useMemo(() => reports.filter((report) => report.status === 'pending').length, [reports]);

  async function updateStatus(id: string, status: 'resolved' | 'dismissed') {
    setActionLoading(id);

    let adminNotes: string | null = null;
    if (status === 'dismissed') {
      const note = window.prompt('Note admin (optionnel) pour ce signalement:');
      if (note === null) {
        setActionLoading(null);
        return;
      }
      adminNotes = note.trim() || null;
    }

    const result = await resolveAdminBusinessReport(id, status, adminNotes);
    if (result.status === 'error') {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succes', description: result.message });
      await fetchReports();
    }

    setActionLoading(null);
  }

  const getStatusBadge = (status: AdminBusinessReport['status']) => {
    if (status === 'pending') {
      return <Badge variant="outline" className="border-amber-500/50 bg-amber-500/5 text-amber-600">En attente</Badge>;
    }
    if (status === 'resolved') {
      return <Badge className="bg-emerald-500 text-white">Traite</Badge>;
    }
    if (status === 'dismissed') {
      return <Badge variant="secondary">Rejete</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Signalements entreprises</h1>
          <p className="mt-1 text-muted-foreground">Traitez les signalements de fiches etablissements.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={filterStatus === 'pending' ? 'default' : 'outline'} onClick={() => setFilterStatus('pending')}>
            En attente
          </Button>
          <Button variant={filterStatus === 'all' ? 'default' : 'outline'} onClick={() => setFilterStatus('all')}>
            Historique
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File de moderation</CardTitle>
          <CardDescription>{pendingCount} signalements en attente</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <ShieldCheck className="mx-auto mb-3 h-10 w-10" />
              Aucun signalement.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Etablissement</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Link href={`/businesses/${report.businesses?.slug || report.business_id}`} className="inline-flex items-center gap-1 font-medium hover:text-primary">
                            <Building2 className="h-3.5 w-3.5" />
                            {report.businesses?.name || report.business_id}
                          </Link>
                          <span className="text-xs text-muted-foreground">ID: {report.business_id}</span>
                        </div>
                      </TableCell>
                      <TableCell>{reasonLabels[report.reason] || report.reason}</TableCell>
                      <TableCell className="max-w-[320px] truncate">{report.details || '-'}</TableCell>
                      <TableCell>{format(new Date(report.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="space-x-2 text-right">
                        {report.status === 'pending' ? (
                          <>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => void updateStatus(report.id, 'resolved')}
                              disabled={actionLoading === report.id}
                              title="Traiter"
                            >
                              {actionLoading === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => void updateStatus(report.id, 'dismissed')}
                              disabled={actionLoading === report.id}
                              title="Rejeter"
                            >
                              {actionLoading === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            </Button>
                          </>
                        ) : (
                          <Clock className="inline h-4 w-4 text-muted-foreground" />
                        )}
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
