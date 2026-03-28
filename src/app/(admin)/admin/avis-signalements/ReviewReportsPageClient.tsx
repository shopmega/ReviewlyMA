'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Clock, Loader2, ShieldCheck, X } from "lucide-react";
import { bulkUpdateReviewReports } from "@/app/actions/admin-bulk";
import { getAdminReviewReports, type AdminReviewReport } from "@/app/actions/admin-review-reports";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const reasonLabels: Record<string, string> = {
  spam_or_promotional: 'Spam / promotion',
  fake_or_coordinated: 'Faux avis ou coordonne',
  personal_data_or_doxxing: 'Donnees personnelles / doxxing',
  harassment_or_hate: 'Harcelement / haine',
  defamation_unverified_accusation: 'Accusation non verifiable',
  conflict_of_interest: "Conflit d'interet",
  off_topic: 'Hors sujet',
  copyright_or_copied_content: "Copie / droit d'auteur",
  spam: 'Spam',
  fake: 'Faux avis',
  offensive: 'Contenu offensant',
  irrelevant: 'Hors sujet',
  other: 'Autre',
};

export default function ReviewReportsPageClient({
  initialReports,
  initialFilterStatus,
}: {
  initialReports: AdminReviewReport[];
  initialFilterStatus: 'pending' | 'all';
}) {
  const [reports, setReports] = useState<AdminReviewReport[]>(initialReports);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all'>(initialFilterStatus);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (filterStatus === initialFilterStatus) return;
    void fetchReports(filterStatus);
  }, [filterStatus, initialFilterStatus]);

  async function fetchReports(nextFilterStatus: 'pending' | 'all' = filterStatus) {
    setLoading(true);
    try {
      const data = await getAdminReviewReports(nextFilterStatus);
      setReports(data);
    } catch (error: any) {
      toast({ title: "Erreur", description: error?.message || 'Impossible de charger les signalements.', variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const handleStatusUpdate = async (id: string, status: 'resolved' | 'dismissed') => {
    setActionLoading(id);
    try {
      let adminNotes: string | undefined;
      if (status === 'dismissed') {
        const note = window.prompt('Note admin obligatoire pour rejeter ce signalement:');
        if (note === null) {
          setActionLoading(null);
          return;
        }
        adminNotes = note.trim();
        if (!adminNotes) {
          toast({ title: "Erreur", description: "Une note admin est obligatoire pour rejeter un signalement.", variant: "destructive" });
          setActionLoading(null);
          return;
        }
      }

      const result = await bulkUpdateReviewReports([id], status, adminNotes);
      if (!result.success) {
        toast({ title: "Erreur", description: result.message, variant: "destructive" });
      } else {
        toast({ title: "Succes", description: `Signalement ${status === 'resolved' ? 'marque comme traite' : 'rejete'}.` });
        await fetchReports();
      }
    } catch {
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleBulkAction = async (status: 'resolved' | 'dismissed') => {
    if (!selectedIds.length) return;
    setIsProcessing(true);

    try {
      let adminNotes: string | undefined;
      if (status === 'dismissed') {
        const note = window.prompt('Note admin obligatoire pour rejeter ces signalements:');
        if (note === null) {
          setIsProcessing(false);
          return;
        }
        adminNotes = note.trim();
        if (!adminNotes) {
          toast({
            title: "Erreur",
            description: "Une note admin est obligatoire pour rejeter un signalement.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
      }

      const result = await bulkUpdateReviewReports(selectedIds, status, adminNotes);
      if (!result.success) {
        toast({ title: "Erreur", description: result.message, variant: "destructive" });
      } else {
        toast({ title: "Action reussie", description: result.message });
        setSelectedIds([]);
        await fetchReports();
      }
    } catch {
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-amber-500/50 bg-amber-500/5 text-amber-600">En attente</Badge>;
      case 'resolved':
        return <Badge className="bg-emerald-500 text-white">Traite</Badge>;
      case 'dismissed':
        return <Badge variant="secondary">Rejete</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === reports.length && reports.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reports.map((report) => report.id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Signalements avis</h1>
          <p className="mt-1 text-muted-foreground">Traitez les signalements rapidement et de facon tracee.</p>
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
          <CardDescription>
            {reports.filter((report) => report.status === 'pending').length} signalements en attente
          </CardDescription>
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
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.length === reports.length && reports.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Etablissement</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} className={cn(selectedIds.includes(report.id) ? "bg-primary/10" : "")}>
                      <TableCell>
                        <Checkbox checked={selectedIds.includes(report.id)} onCheckedChange={() => toggleSelect(report.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <Link href={`/businesses/${report.businesses?.slug || report.business_id}`} className="font-medium hover:text-primary">
                            {report.businesses?.name || report.business_id}
                          </Link>
                          <span className="text-xs text-muted-foreground">Avis #{report.review_id}</span>
                        </div>
                      </TableCell>
                      <TableCell>{reasonLabels[report.reason] || report.reason}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {format(new Date(report.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-emerald-600"
                          onClick={() => void handleStatusUpdate(report.id, 'resolved')}
                          disabled={actionLoading === report.id}
                          title="Marquer comme traite"
                        >
                          {actionLoading === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-rose-500"
                          onClick={() => void handleStatusUpdate(report.id, 'dismissed')}
                          disabled={actionLoading === report.id}
                          title="Rejeter signalement"
                        >
                          {actionLoading === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
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

      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 px-4">
          <div className="flex items-center justify-between rounded-2xl border bg-background/95 p-4 shadow-lg backdrop-blur">
            <div className="text-sm font-medium">{selectedIds.length} selectionnes</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedIds([])} disabled={isProcessing}>
                Annuler
              </Button>
              <Button variant="outline" onClick={() => void handleBulkAction('dismissed')} disabled={isProcessing}>
                <X className="mr-2 h-4 w-4" />
                Rejeter
              </Button>
              <Button onClick={() => void handleBulkAction('resolved')} disabled={isProcessing}>
                {isProcessing ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Marquer resolu
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
