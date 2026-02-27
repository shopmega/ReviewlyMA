'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Star, MessageSquare, Trash2, ExternalLink, Clock3, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { StarRating } from "@/components/shared/StarRating";
import { BulkActions } from "@/components/admin/BulkActions";
import { createClient } from "@/lib/supabase/client";
import { bulkDeleteReviews, bulkUpdateReviews } from "@/app/actions/admin-bulk";

type Review = {
  id: number;
  business_id: string;
  author_name: string;
  rating: number;
  title: string | null;
  content: string | null;
  status:
    | 'draft'
    | 'submitted'
    | 'pending'
    | 'approved'
    | 'published'
    | 'rejected'
    | 'hidden'
    | 'under_investigation'
    | 'edited_requires_review'
    | 'appealed'
    | 'restored'
    | 'deleted';
  date: string;
  created_at: string;
  moderation_sla_due_at?: string | null;
  reviewed_at?: string | null;
  sub_ratings?: {
    work_life_balance: number | null;
    management: number | null;
    career_growth: number | null;
    culture: number | null;
  } | null;
  businesses?: { name: string };
};

export default function AllReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [queueFilter, setQueueFilter] = useState<'all' | 'active' | 'at_risk' | 'breached'>('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const now = Date.now();

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reviews')
      .select('*, sub_ratings, businesses(name)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReviews(data);
    }
    setLoading(false);
  }

  const updateStatus = async (id: number, status: 'published' | 'rejected') => {
    let reason: string | undefined;

    if (status === 'rejected') {
      const input = window.prompt('Raison obligatoire pour rejeter cet avis:');
      if (input === null) return;
      reason = input.trim();
      if (!reason) {
        toast({ title: 'Erreur', description: 'La raison est obligatoire pour rejeter un avis.', variant: 'destructive' });
        return;
      }
    }

    const result = await bulkUpdateReviews([id], { status, reason });
    if (!result.success) {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Succes', description: `Statut mis a jour : ${status}` });
    fetchReviews();
  };

  const deleteReview = async (id: number) => {
    const input = window.prompt('Raison obligatoire pour retirer cet avis:');
    if (input === null) return;
    const reason = input.trim();
    if (!reason) {
      toast({ title: 'Erreur', description: 'La raison est obligatoire pour retirer un avis.', variant: 'destructive' });
      return;
    }

    if (!confirm('Confirmer le retrait de cet avis ?')) return;

    const result = await bulkDeleteReviews([id], reason);
    if (!result.success) {
      toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Succes', description: 'Avis retire.' });
    fetchReviews();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">En attente</Badge>;
      case 'draft':
      case 'submitted':
      case 'edited_requires_review':
      case 'appealed':
        return <Badge variant="outline" className="border-orange-500 text-orange-600">A revoir</Badge>;
      case 'approved':
      case 'restored':
        return <Badge className="bg-emerald-500 text-white">Valide</Badge>;
      case 'published':
        return <Badge className="bg-green-500 text-white">Publie</Badge>;
      case 'hidden':
      case 'under_investigation':
        return <Badge variant="outline" className="border-purple-500 text-purple-600">Investigation</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejete</Badge>;
      case 'deleted':
        return <Badge variant="secondary">Retire</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const ACTIVE_REVIEW_STATUSES: Review['status'][] = [
    'draft',
    'submitted',
    'pending',
    'edited_requires_review',
    'appealed',
    'under_investigation',
  ];

  const isActiveModerationReview = (review: Review) =>
    ACTIVE_REVIEW_STATUSES.includes(review.status);

  const getHoursSince = (isoDate: string) =>
    Math.max(0, (now - new Date(isoDate).getTime()) / (1000 * 60 * 60));

  const getSlaState = (review: Review): 'no_sla' | 'healthy' | 'at_risk' | 'breached' => {
    if (!isActiveModerationReview(review)) return 'no_sla';
    if (!review.moderation_sla_due_at) return 'no_sla';
    const msLeft = new Date(review.moderation_sla_due_at).getTime() - now;
    if (msLeft < 0) return 'breached';
    if (msLeft <= 12 * 60 * 60 * 1000) return 'at_risk';
    return 'healthy';
  };

  const activeReviews = reviews.filter(isActiveModerationReview);
  const breachedReviews = activeReviews.filter((review) => getSlaState(review) === 'breached');
  const atRiskReviews = activeReviews.filter((review) => getSlaState(review) === 'at_risk');
  const filteredReviews = reviews.filter((review) => {
    if (queueFilter === 'all') return true;
    if (queueFilter === 'active') return isActiveModerationReview(review);
    if (queueFilter === 'at_risk') return getSlaState(review) === 'at_risk';
    return getSlaState(review) === 'breached';
  });
  const avgQueueAgeHours = activeReviews.length
    ? Math.round(
      activeReviews.reduce((acc, review) => acc + getHoursSince(review.created_at), 0) / activeReviews.length
    )
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tous les avis</h1>
        <p className="text-muted-foreground mt-1">
          Gerez l'integralite des avis publies sur la plateforme.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>File active moderation</CardDescription>
            <CardTitle className="text-2xl">{activeReviews.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Statuts: draft, soumis, pending, edit, appel, investigation.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>SLA depasses</CardDescription>
            <CardTitle className="text-2xl text-rose-600">{breachedReviews.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Revues actives avec delai depasse.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>SLA a risque (&lt; 12h)</CardDescription>
            <CardTitle className="text-2xl text-amber-600">{atRiskReviews.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Priorite operationnelle avant breach.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Age moyen file</CardDescription>
            <CardTitle className="text-2xl">{avgQueueAgeHours}h</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Temps moyen depuis creation des avis actifs.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des avis</CardTitle>
          <CardDescription>Consultez, approuvez ou retirez les avis.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={queueFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setQueueFilter('all')}
            >
              Tous ({reviews.length})
            </Button>
            <Button
              size="sm"
              variant={queueFilter === 'active' ? 'default' : 'outline'}
              onClick={() => setQueueFilter('active')}
            >
              Actifs ({activeReviews.length})
            </Button>
            <Button
              size="sm"
              variant={queueFilter === 'at_risk' ? 'default' : 'outline'}
              onClick={() => setQueueFilter('at_risk')}
            >
              A risque ({atRiskReviews.length})
            </Button>
            <Button
              size="sm"
              variant={queueFilter === 'breached' ? 'destructive' : 'outline'}
              onClick={() => setQueueFilter('breached')}
            >
              SLA depasses ({breachedReviews.length})
            </Button>
          </div>

          <BulkActions
            reviews={filteredReviews}
            businesses={[]}
            onReviewsUpdate={fetchReviews}
            onBusinessesUpdate={() => {}}
          />

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun avis pour ce filtre.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden mt-4">
              <Table>
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left">Etablissement</th>
                    <th className="px-4 py-3 text-left">Auteur</th>
                    <th className="px-4 py-3 text-left">Note</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Details</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Avis</th>
                    <th className="px-4 py-3 text-left">Statut</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">SLA</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.map((review) => (
                    <tr
                      key={review.id}
                      className={`border-b ${getSlaState(review) === 'breached' ? 'bg-rose-50/60 hover:bg-rose-50' : 'hover:bg-muted/50'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{review.businesses?.name || review.business_id}</span>
                          <Link href={`/businesses/${review.business_id}`} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                            Voir la page <ExternalLink className="h-2 w-2" />
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{review.author_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="font-bold">{review.rating}</span>
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {review.sub_ratings && (
                          <div className="text-xs space-y-1">
                            {review.sub_ratings.work_life_balance && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Equilibre:</span>
                                <StarRating rating={review.sub_ratings.work_life_balance} size={10} readOnly />
                                <span>({review.sub_ratings.work_life_balance})</span>
                              </div>
                            )}
                            {review.sub_ratings.management && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Management:</span>
                                <StarRating rating={review.sub_ratings.management} size={10} readOnly />
                                <span>({review.sub_ratings.management})</span>
                              </div>
                            )}
                            {review.sub_ratings.career_growth && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Carriere:</span>
                                <StarRating rating={review.sub_ratings.career_growth} size={10} readOnly />
                                <span>({review.sub_ratings.career_growth})</span>
                              </div>
                            )}
                            {review.sub_ratings.culture && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Culture:</span>
                                <StarRating rating={review.sub_ratings.culture} size={10} readOnly />
                                <span>({review.sub_ratings.culture})</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell max-w-xs">
                        <div className="text-xs font-semibold truncate">{review.title}</div>
                        <div className="text-[10px] text-muted-foreground line-clamp-1">{review.content}</div>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(review.status)}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {(() => {
                          const slaState = getSlaState(review);
                          if (slaState === 'no_sla') {
                            return <span className="text-xs text-muted-foreground">-</span>;
                          }
                          if (slaState === 'healthy') {
                            return (
                              <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                                <Clock3 className="h-3 w-3 mr-1" /> OK
                              </Badge>
                            );
                          }
                          if (slaState === 'at_risk') {
                            return (
                              <Badge variant="outline" className="border-amber-500 text-amber-600">
                                <Clock3 className="h-3 w-3 mr-1" /> A risque
                              </Badge>
                            );
                          }
                          return (
                            <Badge variant="outline" className="border-rose-500 text-rose-600">
                              <ShieldAlert className="h-3 w-3 mr-1" /> Depasse
                            </Badge>
                          );
                        })()}
                        {review.moderation_sla_due_at && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            Echeance: {new Date(review.moderation_sla_due_at).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          {review.status !== 'published' && review.status !== 'deleted' && (
                            <Button size="icon" variant="outline" className="h-8 w-8 text-green-600" onClick={() => updateStatus(review.id, 'published')} title="Publier">
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {review.status !== 'rejected' && review.status !== 'deleted' && (
                            <Button size="icon" variant="outline" className="h-8 w-8 text-amber-600" onClick={() => updateStatus(review.id, 'rejected')} title="Rejeter">
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          {review.status !== 'deleted' && (
                            <Button size="icon" variant="outline" className="h-8 w-8 text-red-600" onClick={() => deleteReview(review.id)} title="Retirer">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
