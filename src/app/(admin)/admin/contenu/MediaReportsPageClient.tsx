'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, Clock, Image as ImageIcon, Trash2, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import Image from "next/image";
import { getStoragePublicUrl } from "@/lib/data";
import { resolveAdminMediaReport, getAdminMediaReports, type AdminMediaReport } from "@/app/actions/admin-media-reports";

const getMediaUrl = (url: string) => {
  if (!url) return '/placeholders/logo-placeholder.svg';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('businesses/')) return getStoragePublicUrl(url) || '/placeholders/logo-placeholder.svg';
  if (url.startsWith('/')) return url;
  return `/${url}`;
};

const reasonLabels: Record<string, string> = {
  inappropriate: 'Contenu inapproprie',
  copyright: 'Violation copyright',
  misleading: 'Contenu trompeur',
  spam: 'Spam',
  other: 'Autre',
};

export default function MediaReportsPageClient({ initialReports }: { initialReports: AdminMediaReport[] }) {
  const [reports, setReports] = useState<AdminMediaReport[]>(initialReports);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const { toast } = useToast();

  async function refreshReports() {
    setLoading(true);
    try {
      const nextReports = await getAdminMediaReports();
      setReports(nextReports);
    } catch (error) {
      console.error('Error fetching media reports:', error);
      toast({ title: 'Erreur', description: "Impossible de charger les signalements media.", variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: 'removed' | 'dismissed') {
    setResolvingId(id);
    try {
      const result = await resolveAdminMediaReport(id, status);
      if (result.status === 'error') {
        toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Succes', description: result.message });
      await refreshReports();
    } finally {
      setResolvingId(null);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-amber-500/50 bg-amber-500/5 px-3 font-bold text-amber-600"><Clock className="mr-1 h-3 w-3" />En attente</Badge>;
      case 'removed':
        return <Badge className="bg-red-500 px-3 font-bold text-white"><Trash2 className="mr-1 h-3 w-3" />Supprime</Badge>;
      case 'dismissed':
        return <Badge variant="secondary" className="bg-slate-200 px-3 font-bold text-slate-600"><Check className="mr-1 h-3 w-3" />Conserve</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingCount = reports.filter((report) => report.status === 'pending').length;

  return (
    <div className="animate-in slide-in-from-bottom-4 space-y-10 fade-in duration-700">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <Badge className="mb-4 border-none bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">Audit de Contenu</Badge>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Medias <span className="text-primary italic">Signales</span>
          </h1>
          <p className="mt-2 font-medium text-muted-foreground">
            Examinez et moderez les visuels partages par la communaute
          </p>
        </div>
        <div className="flex rounded-3xl border border-border/50 bg-white/50 p-4 shadow-sm backdrop-blur-sm transition-all hover:shadow-lg dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${pendingCount > 0 ? 'bg-amber-500/20 text-amber-600' : 'bg-emerald-500/20 text-emerald-600'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black leading-none tabular-nums">{pendingCount}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">En attente</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[2.5rem] border-0 bg-white/40 shadow-2xl backdrop-blur-xl dark:bg-slate-900/40">
        <CardHeader className="border-b border-border/10 p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-black">Contenu a verifier</CardTitle>
              <CardDescription className="font-medium">Images et documents reportes pour non-conformite</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl hover:bg-primary/10 hover:text-primary" onClick={refreshReports} disabled={loading}>
              <Clock className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-32">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary border-t-transparent" />
              <p className="animate-pulse font-bold text-muted-foreground">Scanning media...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="space-y-6 py-32 text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
                <ImageIcon className="h-12 w-12 text-emerald-500 opacity-50" />
              </div>
              <p className="text-xl font-black">Galerie immaculee</p>
              <p className="mx-auto max-w-xs text-muted-foreground">Tous les medias signales ont ete verifies par l'equipe.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/10 bg-muted/30 hover:bg-muted/30">
                    <TableHead className="py-6 pl-8 text-[10px] font-bold uppercase tracking-widest">Apercu</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Etablissement</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Raison</TableHead>
                    <TableHead className="hidden text-[10px] font-bold uppercase tracking-widest md:table-cell">Date</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Statut</TableHead>
                    <TableHead className="pr-8 text-right text-[10px] font-bold uppercase tracking-widest">Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} className="group border-b border-border/10 transition-colors hover:bg-muted/50">
                      <TableCell className="py-6 pl-8">
                        <div className="relative h-16 w-24 overflow-hidden rounded-2xl bg-muted shadow-lg ring-1 ring-border/20 transition-transform duration-500 group-hover:scale-105">
                          <Image
                            src={getMediaUrl(report.media_url)}
                            alt="Reported media"
                            fill
                            className="object-cover"
                            onError={(event) => {
                              const target = event.target as HTMLImageElement;
                              target.src = '/placeholders/logo-placeholder.svg';
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <Link href={`/businesses/${report.businesses?.slug || report.business_id}`} className="font-black text-slate-800 transition-colors hover:text-primary dark:text-white">
                            {report.businesses?.name || report.business_id}
                          </Link>
                          <span className="text-[10px] font-bold text-muted-foreground/60">SOURCE: {report.media_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-lg border-none bg-white/50 px-3 py-1 text-xs font-bold">
                          {reasonLabels[report.reason] || report.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-xs font-semibold tabular-nums text-muted-foreground md:table-cell">
                        {format(new Date(report.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="pr-8 text-right">
                        {report.status === 'pending' ? (
                          <div className="flex translate-x-4 justify-end gap-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-10 w-10 rounded-xl text-red-500 shadow-sm hover:bg-red-500/10"
                              onClick={() => void updateStatus(report.id, 'removed')}
                              disabled={resolvingId === report.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-10 w-10 rounded-xl text-emerald-500 shadow-sm hover:bg-emerald-500/10"
                              onClick={() => void updateStatus(report.id, 'dismissed')}
                              disabled={resolvingId === report.id}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted" asChild>
                            <Link href={`/businesses/${report.businesses?.slug || report.business_id}`}>
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          </Button>
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
