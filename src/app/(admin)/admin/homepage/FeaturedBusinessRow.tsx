'use client';

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useTransition } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type FeaturedBusinessRowProps = {
    business: {
        id: string;
        name: string;
        location: string;
    };
    onDelete?: () => void;
};

export function FeaturedBusinessRow({ business, onDelete }: FeaturedBusinessRowProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleRemove = () => {
        startTransition(async () => {
            const supabase = createClient();
            const { error } = await supabase
                .from('businesses')
                .update({ is_featured: false })
                .eq('id', business.id);

            if (error) {
                toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
            } else {
                toast({ title: 'Succès', description: 'Entreprise retirée de la une.' });
                onDelete?.();
                // Refresh the page to update the list
                window.location.reload();
            }
        });
    };

    return (
        <TableRow className={isPending ? 'opacity-50' : ''}>
            <TableCell className="font-medium">{business.name}</TableCell>
            <TableCell className="text-muted-foreground">{business.location}</TableCell>
            <TableCell className="text-right">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={isPending}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Retirer de la une ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                L'entreprise "{business.name}" sera retirée de la une et ne s'affichera plus sur la page d'accueil.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Retirer
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </TableCell>
        </TableRow>
    );
}
