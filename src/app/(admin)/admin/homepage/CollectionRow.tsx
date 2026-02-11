'use client';

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { Trash2, Pencil } from "lucide-react";
import Image from "next/image";
import { getStoragePublicUrl } from "@/lib/data";
import { isValidImageUrl } from "@/lib/utils";
import { deleteSeasonalCollection, toggleCollectionActive, updateSeasonalCollection, getCollectionSuggestions } from "@/app/actions/collections";
import { useToast } from "@/hooks/use-toast";
import { useState, useTransition, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type CollectionRowProps = {
    collection: {
        id: string;
        title: string;
        subtitle: string;
        image_url: string;
        image_hint: string | null;
        link_config: any;
        active: boolean;
    };
};

export function CollectionRow({ collection }: CollectionRowProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isActive, setIsActive] = useState(collection.active);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Edit form state
    const [linkType, setLinkType] = useState(collection.link_config.type || 'filter');
    const [suggestions, setSuggestions] = useState<{
        categories: string[];
        tags: string[];
        amenities: string[];
        cities: string[];
    }>({ categories: [], tags: [], amenities: [], cities: [] });

    useEffect(() => {
        if (isEditDialogOpen) {
            getCollectionSuggestions().then(setSuggestions);
        }
    }, [isEditDialogOpen]);

    const handleToggle = (checked: boolean) => {
        setIsActive(checked);
        startTransition(async () => {
            const result = await toggleCollectionActive(collection.id, checked);
            if (result.status === 'error') {
                setIsActive(!checked); // Revert on error
                toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
            } else {
                toast({ title: 'Succès', description: result.message });
            }
        });
    };

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteSeasonalCollection(collection.id);
            if (result.status === 'error') {
                toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
            } else {
                toast({ title: 'Succès', description: result.message });
            }
        });
    };

    const handleUpdate = async (formData: FormData) => {
        startTransition(async () => {
            const result = await updateSeasonalCollection(collection.id, formData);
            if (result.status === 'error') {
                toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
            } else {
                toast({ title: 'Succès', description: result.message });
                setIsEditDialogOpen(false);
            }
        });
    };

    return (
        <TableRow className={isPending ? 'opacity-50' : ''}>
            <TableCell>
                {(() => {
                    const imageUrl = getStoragePublicUrl(collection.image_url, 'carousel-images');
                    if (imageUrl && isValidImageUrl(imageUrl)) {
                        return (
                            <Image
                                src={imageUrl}
                                alt={collection.title}
                                width={60}
                                height={40}
                                className="rounded-sm object-cover"
                            />
                        );
                    }
                    return <div className="w-[60px] h-[40px] bg-muted rounded-sm" />;
                })()}
            </TableCell>
            <TableCell className="font-medium">{collection.title}</TableCell>
            <TableCell>
                <Switch
                    checked={isActive}
                    onCheckedChange={handleToggle}
                    disabled={isPending}
                    aria-label="Activer/Désactiver la collection"
                />
            </TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[525px] overflow-y-auto max-h-[90vh]">
                            <form action={handleUpdate}>
                                <DialogHeader>
                                    <DialogTitle>Modifier la Collection</DialogTitle>
                                    <DialogDescription>
                                        Modifiez les détails de la collection thématique.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="title" className="text-right">Titre</Label>
                                        <Input id="title" name="title" defaultValue={collection.title} className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="subtitle" className="text-right">Sous-titre</Label>
                                        <Input id="subtitle" name="subtitle" defaultValue={collection.subtitle} className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="imageUrl" className="text-right">Image URL</Label>
                                        <Input id="imageUrl" name="imageUrl" defaultValue={collection.image_url} className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="imageHint" className="text-right">Image Hint</Label>
                                        <Input id="imageHint" name="imageHint" defaultValue={collection.image_hint || ''} className="col-span-3" />
                                    </div>

                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="linkType" className="text-right">Type de lien</Label>
                                        <Select name="linkType" value={linkType} onValueChange={setLinkType}>
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Type de filtre" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="filter">Filtre (tag)</SelectItem>
                                                <SelectItem value="category">Catégorie</SelectItem>
                                                <SelectItem value="city">Ville</SelectItem>
                                                <SelectItem value="custom">Lien personnalisé</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {linkType === 'filter' && (
                                        <>
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="linkTag" className="text-right">Tag (optionnel)</Label>
                                                <div className="col-span-3">
                                                    <Input id="linkTag" name="linkTag" defaultValue={collection.link_config.tag || ''} list="tag-list-edit" />
                                                    <datalist id="tag-list-edit">
                                                        {suggestions.tags.map(t => <option key={t} value={t} />)}
                                                    </datalist>
                                                    <p className="text-[10px] text-muted-foreground mt-1">Choisissez un tag existant ou saisissez un nouveau.</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="linkCategory" className="text-right">Catégorie (optionnel)</Label>
                                                <div className="col-span-3">
                                                    <Select name="linkCategory" defaultValue={collection.link_config.category || 'null_category'}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Choisir une catégorie" />
                                                        </SelectTrigger>
                                                        <SelectContent
                                                            className="max-h-60"
                                                            onWheel={(event) => event.stopPropagation()}
                                                            onTouchMove={(event) => event.stopPropagation()}
                                                        >
                                                            <SelectItem value="null_category">Aucune catégorie</SelectItem>
                                                            {suggestions.categories.map(c => (
                                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <p className="text-[10px] text-muted-foreground mt-1">Sélectionnez "Aucune catégorie" pour réinitialiser.</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="linkAmenities" className="text-right">Amenities</Label>
                                                <div className="col-span-3">
                                                    <Input id="linkAmenities" name="linkAmenities" defaultValue={collection.link_config.amenities ? collection.link_config.amenities.join(',') : ''} list="benefits-list-edit" />
                                                    <datalist id="benefits-list-edit">
                                                        {suggestions.amenities.map(b => <option key={b} value={b} />)}
                                                    </datalist>
                                                    <p className="text-[10px] text-muted-foreground mt-1">Séparez par des virgules. Suggestions disponibles.</p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    {linkType === 'category' && (
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="linkCategory" className="text-right">Catégorie</Label>
                                            <div className="col-span-3">
                                                <Select name="linkCategory" defaultValue={collection.link_config.category || 'null_category'}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Choisir une catégorie" />
                                                    </SelectTrigger>
                                                    <SelectContent
                                                        className="max-h-60"
                                                        onWheel={(event) => event.stopPropagation()}
                                                        onTouchMove={(event) => event.stopPropagation()}
                                                    >
                                                        <SelectItem value="null_category">Aucune catégorie</SelectItem>
                                                        {suggestions.categories.map(c => (
                                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-[10px] text-muted-foreground mt-1">Sélectionnez "Aucune catégorie" pour réinitialiser.</p>
                                            </div>
                                        </div>
                                    )}
                                    {(linkType === 'filter' || linkType === 'category' || linkType === 'city') && (
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="linkCity" className="text-right">Ville (optionnel)</Label>
                                            <div className="col-span-3">
                                                <Select name="linkCity" defaultValue={collection.link_config.city || 'null_city'}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Toutes les villes" />
                                                    </SelectTrigger>
                                                    <SelectContent
                                                        className="max-h-60"
                                                        onWheel={(event) => event.stopPropagation()}
                                                        onTouchMove={(event) => event.stopPropagation()}
                                                    >
                                                        <SelectItem value="null_city">Toutes les villes</SelectItem>
                                                        {suggestions.cities.map(c => (
                                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )}
                                    {linkType === 'custom' && (
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="linkHref" className="text-right">URL</Label>
                                            <Input id="linkHref" name="linkHref" defaultValue={collection.link_config.href || ''} className="col-span-3" />
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isPending}>
                                        {isPending ? 'Enregistrement...' : 'Enregistrer'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={isPending}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer cette collection ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Cette action est irréversible. La collection "{collection.title}" sera définitivement supprimée.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Supprimer
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </TableCell>
        </TableRow>
    );
}



