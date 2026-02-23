'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2, Flag } from 'lucide-react';
import { reportBusiness } from '@/app/actions/moderation';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/components/providers/i18n-provider';

interface BusinessReportDialogProps {
  businessId: string;
  businessName: string;
  trigger?: React.ReactNode;
}

export function BusinessReportDialog({ businessId, businessName, trigger }: BusinessReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const { toast } = useToast();
  const { t, tf } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      toast({
        title: t('common.error', 'Erreur'),
        description: t('businessReport.reasonRequired', 'Veuillez selectionner une raison.'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const result = await reportBusiness({
      business_id: businessId,
      reason: reason as any,
      details: details || undefined,
    });

    if (result.status === 'success') {
      toast({
        title: t('businessReport.sentTitle', 'Signalement envoye'),
        description: result.message,
      });
      setOpen(false);
      setReason('');
      setDetails('');
    } else {
      toast({
        title: t('common.error', 'Erreur'),
        description: result.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-9 flex items-center gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 border-dashed transition-all">
            <Flag className="h-4 w-4" />
            <span className="text-xs font-semibold">{t('businessReport.trigger', 'Signaler ce lieu')}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {tf('businessReport.title', 'Signaler {businessName}', { businessName })}
            </DialogTitle>
            <DialogDescription>
              {t('businessReport.description', "Un probleme avec cette entreprise ? Dites-le nous pour que nous puissions verifier.")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">{t('businessReport.problemLabel', 'Quel est le probleme ?')}</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="reason" className="h-11">
                  <SelectValue placeholder={t('businessReport.selectReason', 'Selectionnez une raison')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="closed">{t('businessReport.reason.closed', 'Lieu definitivement ferme')}</SelectItem>
                  <SelectItem value="duplicate">{t('businessReport.reason.duplicate', "C'est un doublon")}</SelectItem>
                  <SelectItem value="incorrect_info">{t('businessReport.reason.incorrect', 'Informations incorrectes')}</SelectItem>
                  <SelectItem value="offensive">{t('businessReport.reason.offensive', 'Contenu offensant')}</SelectItem>
                  <SelectItem value="scam">{t('businessReport.reason.scam', 'Arnaque ou fraude')}</SelectItem>
                  <SelectItem value="other">{t('businessReport.reason.other', 'Autre probleme')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="details">{t('businessReport.detailsLabel', 'Precision (optionnel)')}</Label>
              <Textarea
                id="details"
                placeholder={t('businessReport.detailsPlaceholder', 'Soyez le plus precis possible pour nous aider...')}
                className="min-h-[120px] resize-none"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-primary hover:bg-primary/90">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Flag className="mr-2 h-4 w-4" />
              )}
              {t('businessReport.submit', 'Envoyer le rapport')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
