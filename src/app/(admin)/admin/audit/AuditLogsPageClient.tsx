'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { getAdminAuditSnapshot, type UnifiedAuditLog } from '@/app/actions/admin-audit-logs';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AuditLogsPageClient({
  initialLogs,
  initialMonthActions,
}: {
  initialLogs: UnifiedAuditLog[];
  initialMonthActions: number;
}) {
  const [logs, setLogs] = useState<UnifiedAuditLog[]>(initialLogs);
  const [monthActions, setMonthActions] = useState(initialMonthActions);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  async function refreshLogs() {
    setLoading(true);
    try {
      const snapshot = await getAdminAuditSnapshot();
      setLogs(snapshot.logs);
      setMonthActions(snapshot.monthActions);
    } catch (error: any) {
      toast({ title: 'Erreur', description: error?.message || 'Impossible de charger les logs.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return logs;

    return logs.filter((log) =>
      log.action.toLowerCase().includes(query)
      || log.target_type.toLowerCase().includes(query)
      || (log.profiles?.full_name || '').toLowerCase().includes(query)
      || (log.profiles?.email || '').toLowerCase().includes(query)
      || log.source.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit logs</h1>
          <p className="text-muted-foreground mt-1">Timeline unifiee des actions admin et bulk operations.</p>
        </div>
        <Button variant="outline" onClick={() => void refreshLogs()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Rafraichir
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Actions ce mois</CardDescription>
            <CardTitle>{monthActions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Admins actifs</CardDescription>
            <CardTitle>{new Set(logs.map((log) => log.admin_id).filter(Boolean)).size}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Volume charge</CardDescription>
            <CardTitle>{logs.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Rechercher action, cible, admin, source"
            className="max-w-md"
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Aucun log trouve.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Cible</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={`${log.source}-${log.id}`}>
                      <TableCell>{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.profiles?.full_name || 'System'}</span>
                          <span className="text-xs text-muted-foreground">{log.profiles?.email || ''}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{log.target_type}</span>
                          <span className="text-xs text-muted-foreground">
                            {log.target_id ? `#${String(log.target_id).slice(0, 8)}` : '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.source === 'audit_logs' ? 'secondary' : 'default'}>
                          {log.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <pre className="max-w-[420px] overflow-x-auto whitespace-pre-wrap text-xs">
                          {JSON.stringify(log.details || {}, null, 2)}
                        </pre>
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
