'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, AlertTriangle, Clock, MessageSquare, Filter, Trash2, ShieldCheck, MoreHorizontal, Eye, ArrowRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { bulkUpdateReviewReports } from "@/app/actions/admin-bulk";
import { cn } from "@/lib/utils";

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

    if (!error && data) {
      setReports(data);
      // Mark all pending/unread as read when admin views the list
      const unreadIds = data.filter(r => !r.is_read).map(r => r.id);
      if (unreadIds.length > 0) {
        const { error: readError } = await supabase
          .from('review_reports')
          .update({ is_read: true })
          .in('id', unreadIds);
        if (readError) {
          console.error('Error marking review reports as read:', readError);
        }
      }
    }
    setLoading(false);
  }

  const handleStatusUpdate = async (id: string, status: 'resolved' | 'dismissed') => {
    setActionLoading(id);
    try {
      const result = await bulkUpdateReviewReports([id], status);
      if (result.success) {
        toast({ title: "Succès", description: `Signalement ${status === 'resolved' ? 'résolu' : 'rejeté'}.` });
        fetchReports();
      } else {
        toast({ title: "Erreur", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    }
    setActionLoading(null);
  };

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleBulkAction = async (status: 'resolved' | 'dismissed') => {
    if (selectedIds.length === 0) return;

    setIsProcessing(true);
    try {
      const result = await bulkUpdateReviewReports(selectedIds, status);
      if (result.success) {
        toast({
          title: "Action réussie",
          description: result.message,
        });
        setSelectedIds([]);
        fetchReports();
      } else {
        toast({
          title: "Erreur",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-amber-500/50 text-amber-600 bg-amber-500/5 font-bold px-3 rounded-lg flex items-center gap-1 w-fit"><Clock className="h-3 w-3" />En attente</Badge>;
      case 'resolved':
        return <Badge className="bg-emerald-500 text-white font-bold px-3 rounded-lg flex items-center gap-1 w-fit"><Check className="h-3 w-3" />Résolu</Badge>;
      case 'dismissed':
        return <Badge variant="secondary" className="bg-slate-200 text-slate-600 font-bold px-3 rounded-lg flex items-center gap-1 w-fit"><X className="h-3 w-3" />Rejeté</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === reports.length && reports.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reports.map(r => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <Badge className="mb-4 bg-primary/10 text-primary border-none font-bold px-3 py-1 uppercase tracking-wider text-[10px]">Modération Automatisée</Badge>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Signalements <span className="text-primary italic">Avis</span>
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            Assurez la qualité et la véracité des retours sur votre plateforme
          </p>
        </div>
        <div className="flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-1.5 rounded-2xl border border-border/50 shadow-sm gap-2">
          <Button
            variant={filterStatus === 'pending' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterStatus('pending')}
            className={cn(
              "rounded-xl font-bold px-6 h-10 transition-all",
              filterStatus === 'pending' && "shadow-lg shadow-primary/20"
            )}
          >
            En attente
          </Button>
          <Button
            variant={filterStatus === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterStatus('all')}
            className={cn(
              "rounded-xl font-bold px-6 h-10 transition-all",
              filterStatus === 'all' && "shadow-lg shadow-primary/20"
            )}
          >
            Historique complet
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-8 border-b border-border/10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-black">File de Modération</CardTitle>
              <CardDescription className="font-medium">
                {reports.filter(r => r.status === 'pending').length} signalements nécessitent une action immédiate
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12 hover:bg-primary/10 hover:text-primary transition-all" onClick={fetchReports}>
              <Clock className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="h-12 w-12 border-b-2 border-primary border-t-2 border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground font-bold animate-pulse">Syncing reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-32 space-y-6">
              <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-inner">
                <ShieldCheck className="h-12 w-12 text-emerald-500" />
              </div>
              <div className="max-w-xs mx-auto space-y-2">
                <p className="text-2xl font-black">Excellente nouvelle !</p>
                <p className="text-muted-foreground font-medium">Tous les signalements ont été traités. Votre plateforme est saine.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/10">
                    <TableHead className="w-[80px] pl-8">
                      <Checkbox
                        checked={selectedIds.length === reports.length && reports.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="rounded-lg border-2 border-primary/20 data-[state=checked]:bg-primary"
                      />
                    </TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px] py-6">Etablissement</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Motif du signalement</TableHead>
                    <TableHead className="hidden lg:table-cell font-bold uppercase tracking-widest text-[10px]">Date</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Statut</TableHead>
                    <TableHead className="text-right pr-8 font-bold uppercase tracking-widest text-[10px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow
                      key={report.id}
                      className={cn(
                        "group transition-all duration-300 border-b border-border/10",
                        selectedIds.includes(report.id) ? "bg-primary/10" : "hover:bg-muted/50"
                      )}
                    >
                      <TableCell className="pl-8">
                        <Checkbox
                          checked={selectedIds.includes(report.id)}
                          onCheckedChange={() => toggleSelect(report.id)}
                          className="rounded-lg border-2 border-border/40 group-hover:border-primary/50 transition-colors"
                        />
                      </TableCell>
                      <TableCell className="py-6">
                        <div className="flex flex-col space-y-0.5">
                          <div className="flex items-center gap-2">
                            {!report.is_read && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
                            <Link href={`/businesses/${report.business_id}`} className="hover:text-primary transition-colors font-black text-slate-800 dark:text-white truncate max-w-[200px]">
                              {report.businesses?.name || report.business_id}
                            </Link>
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground/60">ID AVIS: #{report.review_id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-white/50 border-none font-bold text-xs px-3 py-1 rounded-lg">
                          {reasonLabels[report.reason] || report.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground font-semibold text-xs tabular-nums">
                        {format(new Date(report.created_at), 'dd/MM/yyyy • HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-right pr-8">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 rounded-xl hover:bg-emerald-500/10 text-emerald-600 shadow-sm"
                          onClick={() => handleStatusUpdate(report.id, 'resolved')}
                          disabled={actionLoading === report.id}
                        >
                          {actionLoading === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 rounded-xl hover:bg-rose-500/10 text-rose-500 shadow-sm"
                          onClick={() => handleStatusUpdate(report.id, 'dismissed')}
                          disabled={actionLoading === report.id}
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

      {/* Modern Floating Action Bar */}
      {
        selectedIds.length > 0 && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-6 animate-in slide-in-from-bottom-12 duration-500">
            <div className="bg-slate-950/90 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/10 p-5 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.6)] flex items-center justify-between ring-1 ring-white/20">
              <div className="flex items-center gap-5 pl-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-lg shadow-xl shadow-primary/40 animate-pulse">
                  {selectedIds.length}
                </div>
                <div>
                  <p className="text-white font-black text-base uppercase tracking-tight">Traitement Massif</p>
                  <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Action sur la sélection</p>
                </div>
              </div>

              <div className="flex gap-3 pr-2">
                <Button
                  variant="ghost"
                  className="rounded-2xl text-white hover:bg-white/10 font-bold px-6 h-12"
                  onClick={() => setSelectedIds([])}
                  disabled={isProcessing}
                >
                  Annuler
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold px-6 h-12 transition-all hover:border-amber-500/50"
                  onClick={() => handleBulkAction('dismissed')}
                  disabled={isProcessing}
                >
                  <X className="mr-2 h-4 w-4 text-amber-500" /> Rejeter
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-white rounded-2xl font-black px-10 h-12 shadow-[0_10px_30px_rgba(var(--primary),0.3)] transition-all hover:scale-105 active:scale-95"
                  onClick={() => handleBulkAction('resolved')}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Supprimer {selectedIds.length > 1 ? 'avis' : 'avis'}
                </Button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
