'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Clock, Loader2, ShieldCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { bulkUpdateReviewReports } from "@/app/actions/admin-bulk";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ReviewReport = {
  id: string;
  review_id: number;
  business_id: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  is_read: boolean;
  created_at: string;
  businesses?: { name: string };
};

const reasonLabels: Record<string, string> = {
  spam_or_promotional: 'Spam / promotion',
  fake_or_coordinated: 'Faux avis ou coordonne',
  personal_data_or_doxxing: 'Donnees personnelles / doxxing',
  harassment_or_hate: 'Harcelement / haine',
  defamation_unverified_accusation: 'Accusation non verifiable',
  conflict_of_interest: "Conflit d'interet",
  off_topic: 'Hors sujet',
  copyright_or_copied_content: "Copie / droit d'auteur",
  // Legacy reasons kept for backward compatibility in old rows.
  spam: 'Spam',
  fake: 'Faux avis',
  offensive: 'Contenu offensant',
  irrelevant: 'Hors sujet',
  other: 'Autre',
};

export default function ReviewReportsPage() {
  const [reports, setReports] = useState<ReviewReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all'>('pending');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
  }, [filterStatus]);

  async function fetchReports() {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from('review_reports')
      .select('*, businesses(name)')
      .order('created_at', { ascending: false });

    if (filterStatus === 'pending') {
      query = query.eq('status', 'pending');
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    setReports(data || []);
    const unreadIds = (data || []).filter((r) => !r.is_read).map((r) => r.id);
    if (unreadIds.length > 0) {
      await supabase.from('review_reports').update({ is_read: true }).in('id', unreadIds);
    }
    setLoading(false);
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
        fetchReports();
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
        fetchReports();
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
        return <Badge variant="outline" className="border-amber-500/50 text-amber-600 bg-amber-500/5">En attente</Badge>;
      case 'resolved':
        return <Badge className="bg-emerald-500 text-white">Traite</Badge>;
      case 'dismissed':
        return <Badge variant="secondary">Rejete</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === reports.length && reports.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reports.map((r) => r.id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Signalements avis</h1>
          <p className="text-muted-foreground mt-1">Traitez les signalements rapidement et de facon tracee.</p>
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
            {reports.filter((r) => r.status === 'pending').length} signalements en attente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3" />
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
                    <TableRow
                      key={report.id}
                      className={cn(selectedIds.includes(report.id) ? "bg-primary/10" : "")}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(report.id)}
                          onCheckedChange={() => toggleSelect(report.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <Link href={`/businesses/${report.business_id}`} className="font-medium hover:text-primary">
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
                          onClick={() => handleStatusUpdate(report.id, 'resolved')}
                          disabled={actionLoading === report.id}
                          title="Marquer comme traite"
                        >
                          {actionLoading === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-rose-500"
                          onClick={() => handleStatusUpdate(report.id, 'dismissed')}
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
          <div className="rounded-2xl border bg-background/95 backdrop-blur p-4 flex items-center justify-between shadow-lg">
            <div className="text-sm font-medium">{selectedIds.length} selectionnes</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedIds([])} disabled={isProcessing}>
                Annuler
              </Button>
              <Button variant="outline" onClick={() => handleBulkAction('dismissed')} disabled={isProcessing}>
                <X className="mr-2 h-4 w-4" />
                Rejeter
              </Button>
              <Button onClick={() => handleBulkAction('resolved')} disabled={isProcessing}>
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
