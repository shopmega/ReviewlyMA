'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

type AuditSource = 'audit_logs' | 'admin_audit_log';

interface UnifiedAuditLog {
  id: string;
  source: AuditSource;
  admin_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: any;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<UnifiedAuditLog[]>([]);
  const [monthActions, setMonthActions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    const supabase = createClient();

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfNextMonth = new Date(startOfMonth);
    startOfNextMonth.setMonth(startOfNextMonth.getMonth() + 1);

    const [
      auditLogsRes,
      adminAuditLogsRes,
      auditMonthCountRes,
      adminAuditMonthCountRes,
    ] = await Promise.all([
      supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())
        .lt('created_at', startOfNextMonth.toISOString()),
      supabase
        .from('admin_audit_log')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())
        .lt('created_at', startOfNextMonth.toISOString()),
    ]);

    if (auditLogsRes.error) {
      toast({ title: 'Erreur', description: auditLogsRes.error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    if (adminAuditLogsRes.error) {
      toast({ title: 'Erreur', description: adminAuditLogsRes.error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const normalizedAuditLogs: UnifiedAuditLog[] = (auditLogsRes.data || []).map((item: any) => ({
      id: item.id,
      source: 'audit_logs',
      admin_id: item.admin_id || null,
      action: item.action,
      target_type: item.target_type || 'unknown',
      target_id: item.target_id || null,
      details: item.details || {},
      created_at: item.created_at,
      profiles: null,
    }));

    const normalizedAdminAuditLogs: UnifiedAuditLog[] = (adminAuditLogsRes.data || []).map((item: any) => ({
      id: item.id,
      source: 'admin_audit_log',
      admin_id: item.admin_id || null,
      action: item.action,
      target_type: item.details?.target_type || item.details?.entity_type || 'bulk_action',
      target_id: item.details?.target_id || null,
      details: item.details || {},
      created_at: item.created_at,
      profiles: null,
    }));

    const merged = [...normalizedAuditLogs, ...normalizedAdminAuditLogs].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const uniqueAdminIds = [...new Set(merged.map((l) => l.admin_id).filter(Boolean) as string[])];
    let profilesMap: Record<string, { id: string; full_name: string; email: string }> = {};

    if (uniqueAdminIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', uniqueAdminIds);

      if (profilesError) {
        toast({ title: 'Avertissement', description: 'Impossible de charger certains profils admin.' });
      } else {
        profilesMap = (profiles || []).reduce((acc, profile: any) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, { id: string; full_name: string; email: string }>);
      }
    }

    const logsWithProfiles = merged.map((log) => ({
      ...log,
      profiles: log.admin_id ? profilesMap[log.admin_id] || null : null,
    }));

    setMonthActions((auditMonthCountRes.count || 0) + (adminAuditMonthCountRes.count || 0));
    setLogs(logsWithProfiles.slice(0, 150));
    setLoading(false);
  }

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return logs;

    return logs.filter((log) =>
      log.action.toLowerCase().includes(query) ||
      log.target_type.toLowerCase().includes(query) ||
      (log.profiles?.full_name || '').toLowerCase().includes(query) ||
      (log.profiles?.email || '').toLowerCase().includes(query) ||
      log.source.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit logs</h1>
          <p className="text-muted-foreground mt-1">Timeline unifiee des actions admin et bulk operations.</p>
        </div>
        <Button variant="outline" onClick={fetchLogs}>Rafraichir</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Actions ce mois</CardDescription>
            <CardTitle>{monthActions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Admins actifs</CardDescription>
            <CardTitle>{new Set(logs.map((l) => l.admin_id).filter(Boolean)).size}</CardTitle>
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
            onChange={(e) => setSearchQuery(e.target.value)}
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
            <div className="text-muted-foreground py-10 text-center">Aucun log trouve.</div>
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
                        <pre className="max-w-[420px] overflow-x-auto text-xs whitespace-pre-wrap">
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
