'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, Clock, User, Building, MapPin, Calendar, Filter, MoreHorizontal, Eye, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { approveBusinessSuggestion, rejectBusinessSuggestion } from "@/app/actions/admin";

type BusinessSuggestion = {
  id: string;
  name: string;
  category: string;
  city: string;
  description: string | null;
  location: string | null;
  suggested_by: string;
  suggested_at: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  profiles?: { full_name: string };
};

export default function BusinessSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<BusinessSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    suggestionId: string;
    suggestionName: string;
    action: 'approve' | 'reject';
  }>({ open: false, suggestionId: '', suggestionName: '', action: 'approve' });
  
  const [reviewNotes, setReviewNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const supabase = createClient();
      
      // First, try to fetch suggestions with profile join
      let { data, error } = await supabase
        .from('business_suggestions')
        .select(`
          *,
          profiles:suggested_by (full_name)
        `)
        .order('suggested_at', { ascending: false });

      if (error) {
        // If the join fails, try without the join
        console.warn('Warning: Could not join with profiles table, fetching suggestions without user names:', error);
        const { data: dataWithoutJoin, error: errorWithoutJoin } = await supabase
          .from('business_suggestions')
          .select('*')
          .order('suggested_at', { ascending: false });
        
        if (errorWithoutJoin) {
          console.error('Error fetching suggestions without join:', errorWithoutJoin);
          throw errorWithoutJoin;
        }
        
        // Manually fetch profile names for each suggestion
        const suggestionsWithProfiles = await Promise.all(
          dataWithoutJoin.map(async (suggestion: any) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', suggestion.suggested_by)
              .single();
              
            return {
              ...suggestion,
              profiles: profileData || null
            };
          })
        );
        
        setSuggestions(suggestionsWithProfiles);
      } else {
        setSuggestions(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching suggestions:', error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de charger les suggestions.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 bg-yellow-500/5"><Clock className="mr-1 h-3 w-3" />En attente</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-500 text-white"><Check className="mr-1 h-3 w-3" />Approuvée</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="bg-rose-500 text-white"><X className="mr-1 h-3 w-3" />Rejetée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(filteredSuggestions.map(s => s.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleReviewAction = async (action: 'approve' | 'reject') => {
    setActionLoading(reviewDialog.suggestionId);
    
    try {
      let result;
      if (action === 'approve') {
        result = await approveBusinessSuggestion(reviewDialog.suggestionId, reviewNotes || undefined);
      } else {
        result = await rejectBusinessSuggestion(reviewDialog.suggestionId, reviewNotes || undefined);
      }

      if (result.status === 'success') {
        toast({
          title: "Succès",
          description: result.message
        });

        setReviewDialog({ open: false, suggestionId: '', suggestionName: '', action: 'approve' });
        setReviewNotes('');
        fetchSuggestions();
      } else {
        toast({
          title: "Erreur",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error reviewing suggestion:', error);
      toast({
        title: "Erreur",
        description: "Impossible de traiter la suggestion.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSuggestions = suggestions.filter(s => 
    filterStatus === 'all' || s.status === filterStatus
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Suggestions d'entreprises</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Modérez les suggestions d'entreprises soumises par les utilisateurs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white/50 border-border/20 transition-all">
              <Filter className="h-3 w-3 mr-2 opacity-50" />
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/10 backdrop-blur-xl">
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="approved">Approuvées</SelectItem>
              <SelectItem value="rejected">Rejetées</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-primary">{selectedIds.length} sélectionnée(s)</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:bg-primary/10"
              onClick={clearSelection}
            >
              Désélectionner
            </Button>
          </div>
        </div>
      )}

      <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-8 border-b border-border/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-black">Toutes les suggestions</CardTitle>
              <CardDescription className="mt-2">
                {filteredSuggestions.length} suggestion(s) trouvée(s)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSuggestions.length === 0 ? (
            <div className="text-center py-16">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune suggestion</h3>
              <p className="text-muted-foreground">Aucune suggestion d'entreprise ne correspond à vos critères.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/20">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === filteredSuggestions.length && filteredSuggestions.length > 0}
                        onCheckedChange={selectedIds.length === filteredSuggestions.length ? clearSelection : selectAll}
                        className="rounded-lg"
                      />
                    </TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Suggérée par</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuggestions.map((suggestion) => (
                    <TableRow 
                      key={suggestion.id} 
                      className={cn(
                        "border-border/10 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors",
                        selectedIds.includes(suggestion.id) ? "bg-primary/5" : ""
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(suggestion.id)}
                          onCheckedChange={() => toggleSelect(suggestion.id)}
                          className="rounded-lg"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{suggestion.name}</div>
                        {suggestion.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {suggestion.description}
                          </div>
                        )}
                        {suggestion.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            {suggestion.location}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 border-none font-bold text-[10px] px-2 py-0.5 rounded-lg">
                          {suggestion.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{suggestion.city}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{suggestion.profiles?.full_name || 'Utilisateur'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(suggestion.suggested_at), 'dd MMM yyyy', { locale: fr })}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(suggestion.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl border-border/10 backdrop-blur-xl">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-border/10" />
                            <DropdownMenuItem
                              className="rounded-xl py-3 font-bold text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                              onClick={() => setReviewDialog({
                                open: true,
                                suggestionId: suggestion.id,
                                suggestionName: suggestion.name,
                                action: 'approve'
                              })}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Approuver
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="rounded-xl py-3 font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
                              onClick={() => setReviewDialog({
                                open: true,
                                suggestionId: suggestion.id,
                                suggestionName: suggestion.name,
                                action: 'reject'
                              })}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Rejeter
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => {
        if (!open) {
          setReviewDialog({ open: false, suggestionId: '', suggestionName: '', action: 'approve' });
          setReviewNotes('');
        }
      }}>
        <DialogContent className="rounded-[2.5rem] border-0 bg-white dark:bg-slate-950 p-8 shadow-2xl max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
              {reviewDialog.action === 'approve' ? (
                <Check className="h-8 w-8" />
              ) : (
                <X className="h-8 w-8" />
              )}
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">
              {reviewDialog.action === 'approve' ? 'Approuver' : 'Rejeter'} la suggestion
            </DialogTitle>
            <DialogDescription className="font-medium">
              {reviewDialog.action === 'approve' 
                ? 'Approuver cette suggestion créera une nouvelle entreprise.' 
                : 'Rejeter cette suggestion la marquera comme refusée.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <div className="p-4 bg-muted/30 rounded-2xl border border-border/50">
              <p className="font-bold text-lg">{reviewDialog.suggestionName}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-[10px] font-black uppercase tracking-widest ml-1">
                Notes de modération (optionnel)
              </Label>
              <Textarea
                id="notes"
                placeholder="Ajoutez des notes pour expliquer votre décision..."
                className="rounded-xl min-h-[100px]"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-8 gap-3">
            <Button 
              variant="outline" 
              className="rounded-2xl border-border/40 font-bold px-8 h-12" 
              onClick={() => {
                setReviewDialog({ open: false, suggestionId: '', suggestionName: '', action: 'approve' });
                setReviewNotes('');
              }}
            >
              Annuler
            </Button>
            <Button
              className={cn(
                "rounded-2xl font-black px-10 h-12 shadow-xl",
                reviewDialog.action === 'approve' 
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20" 
                  : "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
              )}
              onClick={() => handleReviewAction(reviewDialog.action)}
              disabled={actionLoading === reviewDialog.suggestionId}
            >
              {actionLoading === reviewDialog.suggestionId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {reviewDialog.action === 'approve' ? 'Approuver' : 'Rejeter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}