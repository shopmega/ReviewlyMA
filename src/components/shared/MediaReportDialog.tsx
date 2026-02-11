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
import { reportMedia } from "@/app/actions/business";
import { useToast } from "@/hooks/use-toast";

interface MediaReportDialogProps {
  mediaUrl: string;
  businessId: string;
  trigger?: React.ReactNode;
}

export function MediaReportDialog({ mediaUrl, businessId, trigger }: MediaReportDialogProps) {
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
    const result = await reportMedia({
      media_url: mediaUrl,
      media_type: 'image',
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
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/20">
            <Flag className="h-4 w-4" />
            <span className="sr-only">Signaler</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Signaler ce média
            </DialogTitle>
            <DialogDescription>
              Aidez-nous à maintenir la qualité du contenu. Pourquoi signalez-vous cette image ?
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
                  <SelectItem value="inappropriate">Contenu inapproprié</SelectItem>
                  <SelectItem value="copyright">Violation de copyright</SelectItem>
                  <SelectItem value="misleading">Contenu trompeur</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
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
