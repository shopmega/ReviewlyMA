'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Star, MessageSquare, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { StarRating } from "@/components/shared/StarRating";
import { BulkActions } from "@/components/admin/BulkActions";
import { createClient } from "@/lib/supabase/client";

type Review = {
  id: number;
  business_id: string;
  author_name: string;
  rating: number;
  title: string | null;
  content: string | null;
  status: 'published' | 'pending' | 'rejected';
  date: string;
  created_at: string;
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
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
    const supabase = createClient();
    const { error } = await supabase
      .from('reviews')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: `Statut mis à jour : ${status}` });
      fetchReviews();
    }
  };

  const deleteReview = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet avis définitivement ?')) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Avis supprimé.' });
      fetchReviews();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">En attente</Badge>;
      case 'published':
        return <Badge className="bg-green-500 text-white">Publié</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tous les avis</h1>
        <p className="text-muted-foreground mt-1">
          Gérez l'intégralité des avis publiés sur la plateforme.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des avis</CardTitle>
          <CardDescription>Consultez, approuvez ou supprimez les avis.</CardDescription>
        </CardHeader>
        <CardContent>
          <BulkActions 
            reviews={reviews}
            businesses={[]}
            onReviewsUpdate={fetchReviews}
            onBusinessesUpdate={() => {}}
          />
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun avis trouvé.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden mt-4">
              <Table>
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left">Établissement</th>
                    <th className="px-4 py-3 text-left">Auteur</th>
                    <th className="px-4 py-3 text-left">Note</th>
                                        <th className="px-4 py-3 text-left hidden lg:table-cell">Détails</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Avis</th>
                    <th className="px-4 py-3 text-left">Statut</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((review) => (
                    <tr key={review.id} className="hover:bg-muted/50 border-b">
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
                                <span className="text-muted-foreground">Carrière:</span>
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
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          {review.status !== 'published' && (
                            <Button size="icon" variant="outline" className="h-8 w-8 text-green-600" onClick={() => updateStatus(review.id, 'published')} title="Publier">
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {review.status !== 'rejected' && (
                            <Button size="icon" variant="outline" className="h-8 w-8 text-amber-600" onClick={() => updateStatus(review.id, 'rejected')} title="Rejeter">
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="outline" className="h-8 w-8 text-red-600" onClick={() => deleteReview(review.id)} title="Supprimer">
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
