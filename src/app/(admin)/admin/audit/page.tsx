'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from '@/lib/supabase/client';
import {
    Loader2,
    Shield,
    User,
    Info,
    History,
    FileText,
    Zap,
    Database,
    Search,
    Activity,
    Terminal,
    ExternalLink,
    ChevronRight,
    Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AuditLog {
    id: string;
    admin_id: string;
    action: string;
    target_type: string;
    target_id: string;
    details: any;
    created_at: string;
    profiles?: {
        full_name: string;
        email: string;
    };
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [monthActions, setMonthActions] = useState(0);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    async function fetchLogs() {
        setLoading(true);
        const supabase = createClient();

        // Fetch audit logs with admin profile information
        // First, get the audit logs
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Error fetching audit logs:', error.message || error);
            toast({ title: "Erreur Supabase", description: error.message, variant: "destructive" });
            setLoading(false);
            return;
        }

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const startOfNextMonth = new Date(startOfMonth);
        startOfNextMonth.setMonth(startOfNextMonth.getMonth() + 1);

        const { count: monthCount, error: monthCountError } = await supabase
            .from('audit_logs')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', startOfMonth.toISOString())
            .lt('created_at', startOfNextMonth.toISOString());

        if (monthCountError) {
            console.error('Error fetching monthly audit count:', monthCountError);
            setMonthActions(0);
        } else {
            setMonthActions(monthCount || 0);
        }

        // Then, fetch profile information for each unique admin_id
        const uniqueAdminIds = [...new Set(data?.map(log => log.admin_id).filter(id => id))];
        let profilesMap: Record<string, { id: string; full_name: string; email: string } | undefined> = {};
        
        if (uniqueAdminIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', uniqueAdminIds);
                
            if (profilesError) {
                console.error('Error fetching admin profiles:', profilesError);
                // Continue without profile data
            } else {
                profilesMap = profiles?.reduce((acc, profile) => {
                    acc[profile.id] = profile;
                    return acc;
                }, {} as Record<string, { id: string; full_name: string; email: string }>) || {};
            }
        }

        // Combine logs with profile information
        const logsWithData = data?.map(log => ({
            ...log,
            profiles: profilesMap[log.admin_id] || null
        })) || [];

        setLogs(logsWithData);
        setLoading(false);
    }

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.target_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.profiles?.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getActionColor = (action: string) => {
        const a = action.toUpperCase();
        if (a.includes('DELETE') || a.includes('BANNED') || a.includes('REJECT'))
            return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
        if (a.includes('UPDATE') || a.includes('EDIT'))
            return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
        if (a.includes('APPROVE') || a.includes('CREATE') || a.includes('GRANTED'))
            return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                <div className="space-y-2">
                    <Badge className="bg-primary/10 text-primary border-none font-bold px-3 py-1 uppercase tracking-wider text-[10px]">Sécurité & Traçabilité</Badge>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                        Audit <span className="text-primary italic">Logs</span>
                    </h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <Terminal className="h-4 w-4" /> Historique des 100 dernières actions administratives
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12 hover:bg-primary/10 hover:text-primary transition-all shadow-sm" onClick={fetchLogs}>
                        <History className="h-5 w-5" />
                    </Button>
                    <Button className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black px-8 h-12 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95">
                        <FileText size={18} className="mr-2" /> Exporter le rapport CSV
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Database className="h-6 w-6" />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-emerald-500/20 text-emerald-600">Sync</Badge>
                        </div>
                        <p className="text-3xl font-black tabular-nums">{monthActions}</p>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Actions ce mois</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Shield className="h-6 w-6" />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-indigo-500/20 text-indigo-600">Vérifié</Badge>
                        </div>
                        <p className="text-3xl font-black tabular-nums">{new Set(logs.map(l => l.admin_id)).size}</p>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Administrateurs Actifs</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all group">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Activity className="h-6 w-6" />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-rose-500/20 text-rose-600">Intégrité</Badge>
                        </div>
                        <p className="text-3xl font-black tabular-nums">99.9%</p>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Score de Conformité</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 border-b border-border/10">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-4">
                            <div className="relative w-full lg:w-96 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    placeholder="Rechercher une action, une cible..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-11 h-12 bg-white/50 dark:bg-slate-950/50 border-border/20 rounded-2xl focus:ring-primary/20 transition-all font-medium"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 space-y-4">
                            <div className="h-12 w-12 border-b-2 border-primary border-t-2 border-t-transparent rounded-full animate-spin" />
                            <p className="text-muted-foreground font-black animate-pulse uppercase tracking-widest text-[10px]">Reading logs...</p>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-40 space-y-6">
                            <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto border border-dashed border-border/60">
                                <Database className="h-12 w-12 text-muted-foreground/30" />
                            </div>
                            <p className="text-2xl font-black">Aucun log trouvé</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/10">
                                        <TableHead className="py-6 pl-8 font-bold uppercase tracking-widest text-[10px]">Horodatage</TableHead>
                                        <TableHead className="font-bold uppercase tracking-widest text-[10px]">Administrateur</TableHead>
                                        <TableHead className="font-bold uppercase tracking-widest text-[10px]">Action</TableHead>
                                        <TableHead className="font-bold uppercase tracking-widest text-[10px]">Cible</TableHead>
                                        <TableHead className="font-bold uppercase tracking-widest text-[10px]">Données</TableHead>
                                        <TableHead className="text-right pr-8 font-bold uppercase tracking-widest text-[10px]">Statut</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.map((log) => (
                                        <TableRow key={log.id} className="group border-b border-border/10 hover:bg-muted/40 transition-all duration-300">
                                            <TableCell className="py-6 pl-8">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black tabular-nums">{format(new Date(log.created_at), 'dd/MM/yyyy')}</span>
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 mt-0.5">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-800 dark:text-white text-xs truncate max-w-[120px]">{log.profiles?.full_name || 'System'}</span>
                                                        <span className="text-[9px] font-bold text-muted-foreground truncate max-w-[120px]">{log.profiles?.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn("font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest border-2", getActionColor(log.action))}>
                                                    {log.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase tracking-tight flex items-center gap-1">
                                                        <Zap className="h-3 w-3 text-amber-500" /> {log.target_type}
                                                    </span>
                                                    <span className="text-[9px] font-mono text-muted-foreground opacity-60">#{log.target_id.substring(0, 8)}...</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-500/10 hover:text-indigo-500 transition-all">
                                                            Voir Détails <ChevronRight className="ml-1 h-3 w-3 opacity-50" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" className="w-[400px] p-0 rounded-2xl border-border/10 overflow-hidden shadow-2xl backdrop-blur-3xl">
                                                        <div className="bg-slate-900 text-slate-300 p-4 font-mono text-[10px] max-h-96 overflow-y-auto">
                                                            <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                                                        </div>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <div className="flex items-center justify-end gap-2 text-emerald-500">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Enregistré</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-center pb-10">
                <Button variant="outline" className="rounded-2xl font-bold px-10 h-10 border-border/40 hover:bg-primary/5 hover:text-primary transition-all group">
                    Charger les logs antérieurs <ChevronRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
}
