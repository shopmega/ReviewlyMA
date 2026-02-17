'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from '@/components/ui/label';
import { StarRating } from "@/components/shared/StarRating";
import { VoteButtons } from "@/components/shared/VoteButtons";
import { ReviewReportDialog } from "@/components/shared/ReviewReportDialog";
import { EditReviewModal } from "@/components/reviews/EditReviewModal";
import { DeleteReviewDialog } from "@/components/reviews/DeleteReviewDialog";
import { ReviewSubRatings } from "@/components/shared/ReviewSubRatings";
import { MessageSquare, CornerDownRight, ShieldCheck, Edit, Trash2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Business, Review } from '@/lib/types';

interface ReviewsSectionProps {
  business: Business;
  searchTerm?: string;
}

export default function ReviewsSection({ business, searchTerm = '' }: ReviewsSectionProps) {
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [reviews, setReviews] = useState(business.reviews || []);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating' | 'helpful'>('newest');
  const [isOwner, setIsOwner] = useState(false);
  const [isReviewOwner, setIsReviewOwner] = useState<Record<number, boolean>>({});
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [deletingReview, setDeletingReview] = useState<Review | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  // Check if current user is the business owner
  useEffect(() => {
    async function checkOwnership() {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.id);
      console.log('Business ID:', business.id);

      if (!user) {
        console.log('No user logged in');
        return;
      }

      // Check via profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id, role')
        .eq('id', user.id)
        .single();

      console.log('User profile:', profile);

      // Check via claims
      const { data: claim } = await supabase
        .from('business_claims')
        .select('status')
        .eq('user_id', user.id)
        .eq('business_id', business.id)
        .eq('status', 'approved')
        .single();

      console.log('Business claim:', claim);

      const isOwnerCheck = (profile?.business_id === business.id && profile?.role === 'pro') || !!claim;
      console.log('Is owner?', isOwnerCheck);
      setIsOwner(isOwnerCheck);
    }
    checkOwnership();
  }, [business.id, supabase]);

  // Check if current user owns each review
  useEffect(() => {
    async function checkReviewOwnership() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const ownershipMap: Record<number, boolean> = {};

      for (const review of reviews) {
        // Check if user owns this review (or is admin)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const isAdmin = profile?.role === 'admin';
        // Optimized: Check ownership via ID first (works for anonymous), fallback to name (legacy/guest)
        const isOwner = (review.userId && review.userId === user.id) ||
          (review.author === user.user_metadata?.full_name);

        ownershipMap[review.id] = isAdmin || !!isOwner;
      }

      setIsReviewOwner(ownershipMap);
    }

    if (reviews.length > 0) {
      checkReviewOwnership();
    }
  }, [reviews, supabase]);

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setEditModalOpen(true);
  };

  const handleDeleteReview = (review: Review) => {
    setDeletingReview(review);
    setDeleteModalOpen(true);
  };

  const handleReviewUpdated = (updatedReview: Review) => {
    setReviews(prev => prev.map(r => r.id === updatedReview.id ? updatedReview : r));
    setEditingReview(null);
    setEditModalOpen(false);
  };

  const handleReviewDeleted = (reviewId: number) => {
    setReviews(prev => prev.filter(r => r.id !== reviewId));
    setDeletingReview(null);
    setDeleteModalOpen(false);
  };

  const handleReplySubmit = async (reviewId: number) => {
    const { error } = await supabase
      .from('reviews')
      .update({
        owner_reply: replyText,
        owner_reply_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', reviewId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la réponse.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Réponse envoyée!",
        description: "Votre réponse est maintenant visible."
      });
      // Update local state
      setReviews(prev => prev.map(r =>
        r.id === reviewId
          ? { ...r, ownerReply: { text: replyText, date: new Date().toISOString().split('T')[0] } }
          : r
      ));
    }
    setReplyingTo(null);
    setReplyText('');
  };

  // Sort and filter reviews based on selected criteria and search term
  const sortedReviews = useMemo(() => {
    if (!reviews || reviews.length === 0) return [];

    let filtered = [...reviews];

    // Apply search filter if provided
    if (searchTerm && searchTerm.trim().length > 0) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(review =>
        review.text.toLowerCase().includes(term) ||
        review.title.toLowerCase().includes(term) ||
        review.author.toLowerCase().includes(term)
      );
    }

    switch (sortBy) {
      case 'newest':
        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'oldest':
        return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case 'rating':
        return filtered.sort((a, b) => b.rating - a.rating);
      case 'helpful':
        return filtered.sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));
      default:
        return filtered;
    }
  }, [reviews, sortBy, searchTerm]);

  const hasReviews = sortedReviews && sortedReviews.length > 0;

  return (
    <section id="reviews">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-border/50 pb-4 gap-4">
        <h2 className="text-2xl font-bold font-headline text-foreground uppercase tracking-tight">Avis & Expérience employés</h2>

        {/* Sorting Controls */}
        {hasReviews && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Trier par:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'rating' | 'helpful')}
              className="text-sm border border-input rounded-lg px-3 py-1.5 bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="newest">Plus récents</option>
              <option value="oldest">Plus anciens</option>
              <option value="rating">Meilleures notes</option>
              <option value="helpful">Plus utiles</option>
            </select>
          </div>
        )}
      </div>

      {hasReviews ? (
        <div className="space-y-6">
          {sortedReviews.map((review) => (
            <div key={review.id} className="p-6 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl shadow-inner">
                    {review.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-foreground font-headline">
                      {review.isAnonymous ? (
                        'Utilisateur Anonyme'
                      ) : review.userId ? (
                        <Link href={`/users/${review.userId}`} className="hover:text-primary transition-colors">
                          {review.author}
                        </Link>
                      ) : (
                        review.author
                      )}
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">{review.date}</p>
                  </div>
                </div>
                <div className="bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50 backdrop-blur-sm">
                  <StarRating rating={review.rating} readOnly size={16} />
                </div>
              </div>

              <div className="pl-0 md:pl-16">
                <h4 className="font-bold text-lg text-foreground mb-3 font-headline leading-snug">{review.title}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed font-body">{review.text}</p>

                {review.ownerReply && (
                  <div className="mt-6 pl-6 border-l-4 border-primary/30 py-4 bg-primary/5 rounded-r-xl">
                    <p className="text-xs font-bold text-primary mb-2 flex items-center gap-2 uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4" /> Réponse officielle
                    </p>
                    <p className="text-sm text-foreground/80 italic leading-relaxed">{review.ownerReply.text}</p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
                  <VoteButtons
                    reviewId={review.id}
                    initialLikes={review.likes || 0}
                    initialDislikes={review.dislikes || 0}
                  />
                  <div className="flex items-center gap-2">
                    {isOwner && !review.ownerReply && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReplyingTo(review.id)}
                        className="rounded-xl border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/50"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Répondre
                      </Button>
                    )}
                    {isReviewOwner[review.id] && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditReview(review)}
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteReview(review)}
                          className="text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <ReviewReportDialog reviewId={review.id} businessId={business.id} />
                  </div>
                </div>

                {isOwner && replyingTo === review.id && (
                  <div className="mt-6 p-6 bg-secondary/30 rounded-2xl border border-primary/20 space-y-4">
                    <Label className="font-bold flex items-center gap-2 text-primary uppercase tracking-widest text-xs">
                      <MessageSquare className="w-4 h-4" />
                      VOTRE RÉPONSE PROFESSIONNELLE
                    </Label>
                    <Textarea
                      placeholder="Remerciez l'auteur pour son avis et apportez des précisions si nécessaire..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="bg-background min-h-[120px] border-border focus-visible:ring-primary rounded-xl"
                    />
                    <div className="flex justify-end gap-3">
                      <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="rounded-xl">
                        Annuler
                      </Button>
                      <Button size="sm" onClick={() => handleReplySubmit(review.id)} className="rounded-xl bg-primary hover:bg-primary/90 px-6">
                        Publier la réponse
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-secondary/10 rounded-3xl border border-border/50 border-dashed">
          <div className="h-16 w-16 bg-background rounded-full flex items-center justify-center shadow-sm mx-auto mb-6 border border-border">
            <MessageSquare className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-headline font-bold text-foreground">Aucun avis pour le moment</h3>
          <p className="text-muted-foreground mb-8 max-w-xs mx-auto">Soyez le premier à partager votre expérience avec cette société !</p>
          <Button variant="default" className="rounded-xl px-8" asChild>
            <Link href={`/businesses/${business.id}/review`}>Donner mon avis</Link>
          </Button>
        </div>
      )}

      {/* Edit Review Modal */}
      {editingReview && (
        <EditReviewModal
          review={editingReview}
          isOpen={editModalOpen}
          onClose={() => {
            setEditingReview(null);
            setEditModalOpen(false);
          }}
          onUpdate={handleReviewUpdated}
        />
      )}

      {/* Delete Review Modal */}
      {deletingReview && (
        <DeleteReviewDialog
          review={deletingReview}
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeletingReview(null);
            setDeleteModalOpen(false);
          }}
          onDelete={handleReviewDeleted}
        />
      )}
    </section>
  );
}
