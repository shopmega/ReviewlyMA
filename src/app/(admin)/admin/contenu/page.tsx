'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertTriangle, Clock, Image as ImageIcon, Trash2, ShieldCheck, Eye, ArrowUpRight } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import Image from "next/image";
import { extractStoragePath, parsePostgresArray } from "@/lib/data";
import { cn } from "@/lib/utils";

// Helper function to convert relative URLs to absolute URLs
const getMediaUrl = (url: string) => {
  if (!url) return '/placeholders/logo-placeholder.svg';

  // If it's already an absolute URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If it's a Supabase storage path, convert to public URL
  if (url.startsWith('businesses/')) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${url}`;
  }

  // If it's a relative path starting with /, return as-is
  if (url.startsWith('/')) {
    return url;
  }

  // Otherwise, treat as relative path
  return `/${url}`;
};

type MediaReport = {
  id: string;
  media_url: string;
  media_type: string;
  business_id: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'removed' | 'dismissed';
  created_at: string;
  businesses?: { name: string };
};

const reasonLabels: Record<string, string> = {
  inappropriate: 'Contenu inapproprié',
  copyright: 'Violation copyright',
  misleading: 'Contenu trompeur',
  spam: 'Spam',
  other: 'Autre',
};

export default function MediaReportsPage() {
  const [reports, setReports] = useState<MediaReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('media_reports')
        .select('*, businesses(name)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReports(data);
      } else {
        console.error('Error fetching media reports:', error);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
    setLoading(false);
  }

  const updateStatus = async (id: string, status: 'removed' | 'dismissed') => {
    const report = reports.find(r => r.id === id);
    if (!report) return;

    const supabase = createClient();

    if (status === 'removed') {
      // 1. Get current business data to find where the media is
      const { data: business, error: fetchError } = await supabase
        .from('businesses')
        .select('logo_url, cover_url, gallery_urls')
        .eq('id', report.business_id)
        .single();

      if (!fetchError && business) {
        let updateData: any = {};
        let changed = false;

        if (business.logo_url === report.media_url) {
          updateData.logo_url = null;
          changed = true;
        } else if (business.cover_url === report.media_url) {
          updateData.cover_url = null;
          changed = true;
        } else {
          const currentGallery = parsePostgresArray(business.gallery_urls);
          if (currentGallery.includes(report.media_url)) {
            updateData.gallery_urls = currentGallery.filter((u: string) => u !== report.media_url);
            changed = true;
          }
        }

        if (changed) {
          await supabase.from('businesses').update(updateData).eq('id', report.business_id);
        }

        // 2. Try to delete from storage
        const path = extractStoragePath(report.media_url);
        if (path) {
          await supabase.storage.from('business-images').remove([path]);
        }
      }
    }

    const { error } = await supabase
      .from('media_reports')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: status === 'removed' ? 'Média supprimé du site.' : 'Signalement rejeté.' });
      fetchReports();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-amber-500/50 text-amber-600 bg-amber-500/5 font-bold px-3 rounded-lg flex items-center gap-1 w-fit"><Clock className="h-3 w-3" />En attente</Badge>;
      case 'removed':
        return <Badge className="bg-red-500 text-white font-bold px-3 rounded-lg flex items-center gap-1 w-fit"><Trash2 className="h-3 w-3" />Supprimé</Badge>;
      case 'dismissed':
        return <Badge variant="secondary" className="bg-slate-200 text-slate-600 font-bold px-3 rounded-lg flex items-center gap-1 w-fit"><Check className="h-3 w-3" />Conservé</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <Badge className="mb-4 bg-primary/10 text-primary border-none font-bold px-3 py-1 uppercase tracking-wider text-[10px]">Audit de Contenu</Badge>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Médias <span className="text-primary italic">Signalés</span>
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            Examinez et modérez les visuels partagés par la communauté
          </p>
        </div>
        <div className="flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-4 rounded-3xl border border-border/50 shadow-sm transition-all hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors ${pendingCount > 0 ? 'bg-amber-500/20 text-amber-600' : 'bg-emerald-500/20 text-emerald-600'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black tabular-nums leading-none">{pendingCount}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">En attente</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-8 border-b border-border/10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-black">Contenu à vérifier</CardTitle>
              <CardDescription className="font-medium">Images et documents reportés pour non-conformité</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12 hover:bg-primary/10 hover:text-primary" onClick={fetchReports}>
              <Clock className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="h-12 w-12 border-b-2 border-primary border-t-2 border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground font-bold animate-pulse">Scanning media...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-32 space-y-6">
              <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <ImageIcon className="h-12 w-12 text-emerald-500 opacity-50" />
              </div>
              <p className="text-xl font-black">Galerie immaculée</p>
              <p className="text-muted-foreground max-w-xs mx-auto">Tous les médias signalés ont été vérifiés par l'équipe.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/10">
                    <TableHead className="pl-8 py-6 font-bold uppercase tracking-widest text-[10px]">Aperçu</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Établissement</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Raison</TableHead>
                    <TableHead className="hidden md:table-cell font-bold uppercase tracking-widest text-[10px]">Date</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px]">Statut</TableHead>
                    <TableHead className="text-right pr-8 font-bold uppercase tracking-widest text-[10px]">Décision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} className="group hover:bg-muted/50 border-b border-border/10 transition-colors">
                      <TableCell className="pl-8 py-6">
                        <div className="relative h-16 w-24 rounded-2xl overflow-hidden bg-muted shadow-lg ring-1 ring-border/20 group-hover:scale-105 transition-transform duration-500">
                          <Image
                            src={getMediaUrl(report.media_url)}
                            alt="Reported media"
                            fill
                            className="object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholders/logo-placeholder.svg';
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <Link href={`/businesses/${report.business_id}`} className="hover:text-primary transition-colors font-black text-slate-800 dark:text-white">
                            {report.businesses?.name || report.business_id}
                          </Link>
                          <span className="text-[10px] font-bold text-muted-foreground/60">SOURCE: {report.media_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-white/50 border-none font-bold text-xs px-3 py-1 rounded-lg">
                          {reasonLabels[report.reason] || report.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground font-semibold text-xs tabular-nums">
                        {format(new Date(report.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-right pr-8">
                        {report.status === 'pending' ? (
                          <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                            <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-red-500/10 text-red-500 shadow-sm" onClick={() => updateStatus(report.id, 'removed')}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-emerald-500/10 text-emerald-500 shadow-sm" onClick={() => updateStatus(report.id, 'dismissed')}>
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted" asChild>
                            <Link href={`/businesses/${report.business_id}`}>
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
