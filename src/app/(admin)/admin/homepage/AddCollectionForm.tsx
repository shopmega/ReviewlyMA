'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addSeasonalCollection, getCollectionSuggestions, type CollectionFormState } from "@/app/actions/collections";
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const initialState: CollectionFormState = {
    status: 'idle',
    message: '',
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Ajout en cours...' : 'Ajouter'}
        </Button>
    );
}

export function AddCollectionForm() {
    const [state, formAction] = useActionState(addSeasonalCollection, initialState);
    const [linkType, setLinkType] = useState('filter');
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [suggestions, setSuggestions] = useState<{
        categories: string[];
        tags: string[];
        amenities: string[];
        cities: string[];
    }>({ categories: [], tags: [], amenities: [], cities: [] });

    useEffect(() => {
        if (open) {
            getCollectionSuggestions().then(setSuggestions);
        }
    }, [open]);

    useEffect(() => {
        if (state.status === 'success') {
            toast({ title: 'Succès', description: state.message });
            setOpen(false);
        } else if (state.status === 'error') {
            toast({ title: 'Erreur', description: state.message, variant: 'destructive' });
        }
    }, [state, toast]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Ajouter une collection
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px] overflow-y-auto max-h-[90vh]">
                <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Nouvelle Collection</DialogTitle>
                        <DialogDescription>
                            Créez une nouvelle collection thématique pour le carrousel de la page d'accueil.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right">Titre</Label>
                            <Input id="title" name="title" placeholder="Idées pour le Ftour" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="subtitle" className="text-right">Sous-titre</Label>
                            <Input id="subtitle" name="subtitle" placeholder="Les meilleurs endroits..." className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="imageUrl" className="text-right">Image URL</Label>
                            <Input id="imageUrl" name="imageUrl" placeholder="https://placehold.co/..." className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="imageHint" className="text-right">Image Hint</Label>
                            <Input id="imageHint" name="imageHint" placeholder="Ramadan meal" className="col-span-3" />
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
                                        <Input id="linkTag" name="linkTag" placeholder="Ex: ramadan-ftour" list="tag-list" />
                                        <datalist id="tag-list">
                                            {suggestions.tags.map(t => <option key={t} value={t} />)}
                                        </datalist>
                                        <p className="text-[10px] text-muted-foreground mt-1">Choisissez un tag existant ou saisissez un nouveau.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="linkCategory" className="text-right">Catégorie (optionnel)</Label>
                                    <div className="col-span-3">
                                        <Select name="linkCategory">
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
                                        <p className="text-[10px] text-muted-foreground mt-1">Choisissez une catégorie ou sélectionnez "Aucune catégorie" pour réinitialiser.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="linkAmenities" className="text-right">Amenities</Label>
                                    <div className="col-span-3">
                                        <Input id="linkAmenities" name="linkAmenities" placeholder="Ex: Télétravail, WiFi" list="benefits-list" />
                                        <datalist id="benefits-list">
                                            {suggestions.amenities.map(b => <option key={b} value={b} />)}
                                        </datalist>
                                        <p className="text-[10px] text-muted-foreground mt-1">Séparez par des virgules pour plusieurs. Suggestions disponibles.</p>
                                    </div>
                                </div>
                            </>
                        )}
                        {linkType === 'category' && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="linkCategory" className="text-right">Catégorie</Label>
                                    <div className="col-span-3">
                                        <Select name="linkCategory">
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
                                    <Select name="linkCity">
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
                                <Input id="linkHref" name="linkHref" placeholder="/businesses?..." className="col-span-3" />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
