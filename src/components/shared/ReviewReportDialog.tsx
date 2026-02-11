'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2, Flag } from "lucide-react";
import { reportReview } from "@/app/actions/review";
import { useToast } from "@/hooks/use-toast";

interface ReviewReportDialogProps {
  reviewId: number;
  businessId: string;
  trigger?: React.ReactNode;
}

export function ReviewReportDialog({ reviewId, businessId, trigger }: ReviewReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une raison.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const result = await reportReview({
      review_id: reviewId,
      business_id: businessId,
      reason: reason as any,
      details: details || undefined,
    });

    if (result.status === 'success') {
      toast({
        title: "Signalement envoyé",
        description: result.message,
      });
      setOpen(false);
      setReason('');
      setDetails('');
    } else {
      toast({
        title: "Erreur",
        description: result.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 flex items-center gap-2 text-muted-foreground hover:text-destructive transition-colors">
            <Flag className="h-4 w-4" />
            <span className="text-xs">Signaler</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Signaler cet avis
            </DialogTitle>
            <DialogDescription>
              Aidez-nous à maintenir l'intégrité de notre plateforme. Pourquoi signalez-vous cet avis ?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Raison du signalement</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Sélectionnez une raison" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="fake">Faux avis</SelectItem>
                  <SelectItem value="offensive">Contenu offensant</SelectItem>
                  <SelectItem value="irrelevant">Hors sujet</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="details">Détails supplémentaires (Optionnel)</Label>
              <Textarea
                id="details"
                placeholder="Précisez votre signalement ici..."
                className="min-h-[100px]"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Flag className="mr-2 h-4 w-4" />}
              Envoyer le signalement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
