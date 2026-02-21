'use client';

import { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useActionState } from 'react';
import { deleteReview, type ReviewFormState } from "@/app/actions/review";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import type { Review } from '@/lib/types';

interface DeleteReviewDialogProps {
  review: Review;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (reviewId: number) => void;
}

export function DeleteReviewDialog({ review, isOpen, onClose, onDelete }: DeleteReviewDialogProps) {
  const { toast } = useToast();
  const initialState: ReviewFormState = { status: 'idle', message: '' };

  // Create a wrapper function that matches useActionState expectations
  const deleteReviewWithId = async (prevState: ReviewFormState, formData: FormData) => {
    return await deleteReview(review.id);
  };

  const [state, formAction] = useActionState(deleteReviewWithId, initialState);
  const lastHandledStatus = useRef<ReviewFormState['status']>('idle');

  useEffect(() => {
    if (state.status === lastHandledStatus.current) return;
    lastHandledStatus.current = state.status;

    if (state.status === 'success') {
      toast({
        title: 'Avis supprimé',
        description: state.message,
      });

      onDelete(review.id);
      onClose();
    }

    if (state.status === 'error') {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: state.message,
      });
    }
  }, [state.status, state.message, toast, onDelete, review.id, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Supprimer l'avis
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Votre avis sera définitivement supprimé.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Êtes-vous sûr de vouloir supprimer votre avis sur "{review.title}" ?
            </AlertDescription>
          </Alert>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Avis à supprimer :</p>
            <div className="space-y-1">
              <p className="font-medium">{review.title}</p>
              <p className="text-sm line-clamp-2">{review.text}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-yellow-500">{'★'.repeat(review.rating)}</span>
                <span className="text-gray-300">{'★'.repeat(5 - review.rating)}</span>
                <span className="text-sm text-muted-foreground ml-1">({review.rating}/5)</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <form action={formAction}>
            <input type="hidden" name="reviewId" value={review.id} />
            <Button 
              type="submit" 
              variant="destructive" 
              disabled={state.status !== 'idle'}
            >
              {state.status !== 'idle' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer l'avis
                </>
              )}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
