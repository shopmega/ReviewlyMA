'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StarRating } from "@/components/shared/StarRating";
import { useActionState } from 'react';
import { updateReview, type ReviewFormState } from "@/app/actions/review";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit, Star } from "lucide-react";
import type { Review } from '@/lib/types';

interface EditReviewModalProps {
  review: Review;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedReview: Review) => void;
}

export function EditReviewModal({ review, isOpen, onClose, onUpdate }: EditReviewModalProps) {
  const { toast } = useToast();
  const initialState: ReviewFormState = { status: 'idle', message: '' };
  const [rating, setRating] = useState(review.rating);
  const [subRatingWorkLifeBalance, setSubRatingWorkLifeBalance] = useState(review.subRatings?.workLifeBalance || 0);
  const [subRatingManagement, setSubRatingManagement] = useState(review.subRatings?.management || 0);
  const [subRatingCareerGrowth, setSubRatingCareerGrowth] = useState(review.subRatings?.careerGrowth || 0);
  const [subRatingCulture, setSubRatingCulture] = useState(review.subRatings?.culture || 0);

  // Create a wrapper function that matches useActionState expectations
  const updateReviewWithId = async (prevState: ReviewFormState, formData: FormData) => {
    return await updateReview(review.id, formData);
  };

  const [state, formAction] = useActionState(updateReviewWithId, initialState);

  // Handle form submission success
  if (state.status === 'success') {
    toast({
      title: "Avis mis à jour",
      description: state.message,
    });
    
    // Update the review in parent component
    const updatedReview: Review = {
      ...review,
      title: state.data?.title || review.title,
      text: state.data?.text || review.text,
      rating: rating,
      subRatings: {
        workLifeBalance: subRatingWorkLifeBalance,
        management: subRatingManagement,
        careerGrowth: subRatingCareerGrowth,
        culture: subRatingCulture,
      },
    };
    
    onUpdate(updatedReview);
    onClose();
    
    // Reset state
    state.status = 'idle';
  }

  // Handle form submission error
  if (state.status === 'error') {
    toast({
      variant: "destructive",
      title: "Erreur",
      description: state.message,
    });
    state.status = 'idle';
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Modifier votre avis
          </DialogTitle>
          <DialogDescription>
            Mettez à jour votre évaluation et vos commentaires pour cette entreprise.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-6">
          {/* Hidden fields */}
          <input type="hidden" name="rating" value={rating} />
          <input type="hidden" name="subRatingWorkLifeBalance" value={subRatingWorkLifeBalance} />
          <input type="hidden" name="subRatingManagement" value={subRatingManagement} />
          <input type="hidden" name="subRatingCareerGrowth" value={subRatingCareerGrowth} />
          <input type="hidden" name="subRatingCulture" value={subRatingCulture} />

          {/* Overall Rating */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Note générale</Label>
            <div className="flex items-center gap-2">
              <StarRating 
                rating={rating} 
                onRatingChange={setRating}
                size={24}
                readOnly={false}
              />
              <span className="text-sm text-muted-foreground ml-2">
                {rating}/5
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre de l'avis</Label>
            <Input
              id="title"
              name="title"
              defaultValue={review.title}
              placeholder="Résumez votre expérience en quelques mots"
              required
              minLength={5}
              maxLength={100}
            />
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <Label htmlFor="text">Votre avis détaillé</Label>
            <Textarea
              id="text"
              name="text"
              defaultValue={review.text}
              placeholder="Décrivez votre expérience en détail..."
              required
              minLength={10}
              maxLength={2000}
              rows={4}
            />
          </div>

          {/* Sub-ratings */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Évaluations détaillées</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  Équilibre travail/vie
                  <StarRating rating={subRatingWorkLifeBalance} onRatingChange={setSubRatingWorkLifeBalance} size={16} readOnly={false} />
                </Label>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  Management
                  <StarRating rating={subRatingManagement} onRatingChange={setSubRatingManagement} size={16} readOnly={false} />
                </Label>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  Évolution de carrière
                  <StarRating rating={subRatingCareerGrowth} onRatingChange={setSubRatingCareerGrowth} size={16} readOnly={false} />
                </Label>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  Culture d'entreprise
                  <StarRating rating={subRatingCulture} onRatingChange={setSubRatingCulture} size={16} readOnly={false} />
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={state.status !== 'idle'}>
              {state.status !== 'idle' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                'Mettre à jour l\'avis'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
