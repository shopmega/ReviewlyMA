'use client';

import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type SoftAuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextPath: string;
  intent?: string;
  title?: string;
  description?: string;
};

export function SoftAuthDialog({
  open,
  onOpenChange,
  nextPath,
  intent = 'soft_gate',
  title = 'Accedez a plus de valeur avec un compte gratuit',
  description = 'Sauvegardez vos entreprises, votez sur les avis et debloquez les details salaires.',
}: SoftAuthDialogProps) {
  const encodedNext = encodeURIComponent(nextPath);
  const encodedIntent = encodeURIComponent(intent);
  const loginHref = `/login?next=${encodedNext}&intent=${encodedIntent}`;
  const signupHref = `/signup?next=${encodedNext}&intent=${encodedIntent}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          <Button asChild className="w-full">
            <Link href={loginHref}>Continuer</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={signupHref}>Creer un compte</Link>
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Pas maintenant
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

