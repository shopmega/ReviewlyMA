'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { moderateSalary } from '@/app/actions/salary';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type SalaryRow = {
  id: number;
  business_id: string;
  job_title: string;
  salary: number;
  pay_period: 'monthly' | 'yearly';
  employment_type: string;
  department: string | null;
  status: 'pending' | 'published' | 'rejected';
  moderation_notes: string | null;
  created_at: string;
  businesses: { name: string }[] | null;
};

type StatusFilter = 'all' | 'pending' | 'published' | 'rejected';

export default function AdminSalariesPage() {
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [rejectRow, setRejectRow] = useState<SalaryRow | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  async function loadRows(filter: StatusFilter) {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from('salaries')
      .select('id,business_id,job_title,salary,pay_period,employment_type,department,status,moderation_notes,created_at,businesses(name)')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      q = q.eq('status', filter);
    }

    const { data, error } = await q;
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setRows((data || []) as SalaryRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadRows(statusFilter);
  }, [statusFilter]);

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      row.job_title.toLowerCase().includes(term)
      || (row.department || '').toLowerCase().includes(term)
      || (row.businesses?.[0]?.name || '').toLowerCase().includes(term)
    );
  }, [rows, query]);

  const updateStatus = (id: number, status: 'published' | 'rejected', notes?: string) => {
    startTransition(async () => {
      const result = await moderateSalary(id, status, notes);
      if (result.status === 'success') {
        toast({ title: 'Succes', description: result.message });
        setRejectRow(null);
        setRejectionNote('');
        await loadRows(statusFilter);
      } else {
        toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
      }
    });
  };

  const badge = (status: SalaryRow['status']) => {
    if (status === 'pending') return <Badge variant="outline" className="border-amber-500/40 text-amber-600">En attente</Badge>;
    if (status === 'published') return <Badge className="bg-emerald-500 text-white">Publie</Badge>;
    return <Badge variant="destructive">Rejete</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Moderation des salaires</h1>
        <p className="text-muted-foreground mt-1">Approuvez ou rejetez les soumissions de salaire.</p>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>Soumissions</CardTitle>
            <CardDescription>{rows.length} elements charges</CardDescription>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <TabsList>
                <TabsTrigger value="pending">En attente</TabsTrigger>
                <TabsTrigger value="published">Publies</TabsTrigger>
                <TabsTrigger value="rejected">Rejetes</TabsTrigger>
                <TabsTrigger value="all">Tous</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher poste, departement, entreprise..."
              className="md:w-96"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Poste</TableHead>
                  <TableHead>Salaire</TableHead>
                  <TableHead className="hidden lg:table-cell">Contrat / Dept</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.businesses?.[0]?.name || row.business_id}</TableCell>
                    <TableCell>{row.job_title}</TableCell>
                    <TableCell>{Number(row.salary).toLocaleString('fr-MA')} MAD / {row.pay_period === 'yearly' ? 'an' : 'mois'}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm">{row.employment_type}</div>
                      <div className="text-xs text-muted-foreground">{row.department || 'Non defini'}</div>
                    </TableCell>
                    <TableCell>{format(new Date(row.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                    <TableCell>{badge(row.status)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="text-emerald-600"
                          disabled={isPending || row.status === 'published'}
                          onClick={() => updateStatus(row.id, 'published')}
                          title="Publier"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="text-rose-600"
                          disabled={isPending || row.status === 'rejected'}
                          onClick={() => {
                            setRejectRow(row);
                            setRejectionNote(row.moderation_notes || '');
                          }}
                          title="Rejeter"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectRow} onOpenChange={(open) => !open && setRejectRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la soumission</DialogTitle>
            <DialogDescription>Ajoutez une note de moderation (optionnel).</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            placeholder="Ex: montant incoherent avec les intervalles autorises"
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectRow(null)}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={isPending || !rejectRow}
              onClick={() => rejectRow && updateStatus(rejectRow.id, 'rejected', rejectionNote)}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
