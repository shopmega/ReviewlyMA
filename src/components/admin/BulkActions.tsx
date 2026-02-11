'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit, CheckSquare, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { bulkUpdateReviews, bulkDeleteReviews, bulkUpdateBusinesses, bulkDeleteBusinesses } from "@/app/actions/admin-bulk";
import type { Review } from "@/lib/types";

interface BulkActionsProps {
  reviews: any[];
  businesses: any[];
  onReviewsUpdate: () => void;
  onBusinessesUpdate: () => void;
}

export function BulkActions({ reviews, businesses, onReviewsUpdate, onBusinessesUpdate }: BulkActionsProps) {
  const [selectedReviews, setSelectedReviews] = useState<number[]>([]);
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([]);
  const [reviewAction, setReviewAction] = useState<'publish' | 'reject' | 'delete'>('publish');
  const [businessAction, setBusinessAction] = useState<'activate' | 'suspend' | 'delete'>('activate');
  const [reviewReason, setReviewReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleBulkReviewAction = async () => {
    if (selectedReviews.length === 0) {
      toast({
        title: "Aucune sélection",
        description: "Veuillez sélectionner au moins un avis à traiter.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      let result;

      if (reviewAction === 'delete') {
        result = await bulkDeleteReviews(selectedReviews);
      } else if (reviewAction === 'publish' || reviewAction === 'reject') {
        result = await bulkUpdateReviews(selectedReviews, {
          status: reviewAction === 'publish' ? 'published' : 'rejected',
          reason: reviewReason || undefined
        });
      }

      if (result && result.success) {
        toast({
          title: "Opération réussie",
          description: result.message,
        });
        setSelectedReviews([]);
        setReviewReason('');
        onReviewsUpdate();
      } else {
        toast({
          title: "Erreur",
          description: result?.message || "Une erreur est survenue",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'opération groupée.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkBusinessAction = async () => {
    if (selectedBusinesses.length === 0) {
      toast({
        title: "Aucune sélection",
        description: "Veuillez sélectionner au moins une entreprise à traiter.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      let result;

      if (businessAction === 'delete') {
        result = await bulkDeleteBusinesses(selectedBusinesses);
      } else {
        result = await bulkUpdateBusinesses(selectedBusinesses, {
          status: businessAction === 'activate' ? 'active' : 'suspended',
          is_premium: businessAction === 'activate',
          featured: businessAction === 'activate'
        });
      }

      if (result && result.success) {
        toast({
          title: "Opération réussie",
          description: result.message,
        });
        setSelectedBusinesses([]);
        onBusinessesUpdate();
      } else {
        toast({
          title: "Erreur",
          description: result?.message || "Une erreur est survenue",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'opération groupée.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleReviewSelection = (reviewId: number) => {
    setSelectedReviews(prev =>
      prev.includes(reviewId)
        ? prev.filter(id => id !== reviewId)
        : [...prev, reviewId]
    );
  };

  const toggleBusinessSelection = (businessId: string) => {
    setSelectedBusinesses(prev =>
      prev.includes(businessId)
        ? prev.filter(id => id !== businessId)
        : [...prev, businessId]
    );
  };

  const selectAllReviews = () => {
    setSelectedReviews(reviews.map((r: any) => r.id));
  };

  const selectAllBusinesses = () => {
    setSelectedBusinesses(businesses.map((b: any) => b.id));
  };

  return (
    <div className="space-y-6">
      {/* Bulk Reviews Actions */}
      {reviews && reviews.length > 0 && (
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Square className="h-5 w-5" />
              Actions Groupées - Avis
              <Badge variant="secondary" className="ml-2">
                {reviews.length} avis
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={selectedReviews.length > 0 ? () => setSelectedReviews([]) : selectAllReviews}
              >
                {selectedReviews.length === 0 ? 'Sélectionner tout' : 'Désélectionner'}
              </Button>

              <div className="flex items-center gap-2">
                <Select value={reviewAction} onValueChange={(value: 'publish' | 'reject' | 'delete') => setReviewAction(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Choisir une action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publish">Publier</SelectItem>
                    <SelectItem value="reject">Rejeter</SelectItem>
                    <SelectItem value="delete">Supprimer</SelectItem>
                  </SelectContent>
                </Select>

                {reviewAction === 'reject' && (
                  <input
                    type="text"
                    placeholder="Raison (optionnel)"
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    className="ml-2 px-3 py-2 border rounded"
                  />
                )}
              </div>

              <Button
                onClick={handleBulkReviewAction}
                disabled={isProcessing || selectedReviews.length === 0}
                className="min-w-32"
              >
                {isProcessing ? 'Traitement...' : `Exécuter (${selectedReviews.length})`}
              </Button>
            </div>

            {/* Selected Reviews Summary */}
            {selectedReviews.length > 0 && (
              <div className="mt-4 p-4 bg-muted/20 rounded-lg">
                <h4 className="font-medium mb-2">
                  {selectedReviews.length} avis sélectionnés
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
                  {selectedReviews.map(reviewId => {
                    const review = reviews.find((r: any) => r.id === reviewId);
                    return review ? (
                      <div key={reviewId} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedReviews.includes(reviewId)}
                            onCheckedChange={() => toggleReviewSelection(reviewId)}
                          />
                          <span className="text-sm">
                            {review.author_name} - {review.title}
                          </span>
                        </div>
                        <Badge variant={review.status === 'published' ? 'default' : 'secondary'}>
                          {review.status}
                        </Badge>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bulk Businesses Actions */}
      {businesses && businesses.length > 0 && (
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Square className="h-5 w-5" />
              Actions Groupées - Établissements
              <Badge variant="secondary" className="ml-2">
                {businesses.length} entreprises
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={selectedBusinesses.length > 0 ? () => setSelectedBusinesses([]) : selectAllBusinesses}
              >
                {selectedBusinesses.length === 0 ? 'Sélectionner tout' : 'Désélectionner'}
              </Button>

              <div className="flex items-center gap-2">
                <Select value={businessAction} onValueChange={(value: 'activate' | 'suspend' | 'delete') => setBusinessAction(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Choisir une action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activate">Activer</SelectItem>
                    <SelectItem value="suspend">Suspendre</SelectItem>
                    <SelectItem value="delete">Supprimer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleBulkBusinessAction}
                disabled={isProcessing || selectedBusinesses.length === 0}
                className="min-w-32"
              >
                {isProcessing ? 'Traitement...' : `Exécuter (${selectedBusinesses.length})`}
              </Button>
            </div>

            {/* Selected Businesses Summary */}
            {selectedBusinesses.length > 0 && (
              <div className="mt-4 p-4 bg-muted/20 rounded-lg">
                <h4 className="font-medium mb-2">
                  {selectedBusinesses.length} entreprises sélectionnées
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
                  {selectedBusinesses.map(businessId => {
                    const business = businesses.find((b: any) => b.id === businessId);
                    return business ? (
                      <div key={businessId} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedBusinesses.includes(businessId)}
                            onCheckedChange={() => toggleBusinessSelection(businessId)}
                          />
                          <span className="text-sm">
                            {business.name}
                          </span>
                        </div>
                        <Badge variant={business.is_premium ? 'default' : 'secondary'}>
                          {business.is_premium ? 'Premium' : 'Standard'}
                        </Badge>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
