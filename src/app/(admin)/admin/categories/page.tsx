'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Tag,
    Plus,
    Search,
    Edit2,
    Trash2,
    ChevronRight,
    RefreshCcw,
    Loader2,
    ChevronDown,
    ChevronUp,
    LayoutGrid,
    Check,
    X,
    Save,
    Settings2,
    Layers
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    getCategories,
    getSubcategories,
    upsertCategory,
    deleteCategory,
    upsertSubcategory,
    deleteSubcategory,
    syncCategoriesFromBusinesses,
    Category,
    Subcategory
} from "@/app/actions/categories";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

export default function CategoriesAdminPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [subcategories, setSubcategories] = useState<Record<string, Subcategory[]>>({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    // Dialog states
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [isSubcategoryDialogOpen, setIsSubcategoryDialogOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<Partial<Category> | null>(null);
    const [currentSubcategory, setCurrentSubcategory] = useState<Partial<Subcategory> | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const { toast } = useToast();

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setLoading(true);
        const data = await getCategories();
        setCategories(data);
        setLoading(false);
    };

    const toggleRow = async (categoryId: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
            // Load subcategories if not already loaded
            if (!subcategories[categoryId]) {
                const subs = await getSubcategories(categoryId);
                setSubcategories(prev => ({ ...prev, [categoryId]: subs }));
            }
        }
        setExpandedRows(newExpanded);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        const result = await syncCategoriesFromBusinesses();
        if (result.status === 'success') {
            toast({ title: 'Succès', description: result.message });
            loadCategories();
        } else {
            toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
        }
        setIsSyncing(false);
    };

    const handleSaveCategory = async () => {
        if (!currentCategory?.name || !currentCategory?.slug) return;

        setActionLoading(true);
        const result = await upsertCategory(currentCategory);
        if (result.status === 'success') {
            toast({ title: 'Succès', description: result.message });
            loadCategories();
            setIsCategoryDialogOpen(false);
        } else {
            toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
        }
        setActionLoading(false);
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ? Cela supprimera également toutes ses sous-catégories.')) return;

        const result = await deleteCategory(id);
        if (result.status === 'success') {
            toast({ title: 'Succès', description: result.message });
            loadCategories();
        } else {
            toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
        }
    };

    const handleSaveSubcategory = async () => {
        if (!currentSubcategory?.name || !currentSubcategory?.slug || !currentSubcategory?.category_id) return;

        setActionLoading(true);
        const result = await upsertSubcategory(currentSubcategory);
        if (result.status === 'success') {
            toast({ title: 'Succès', description: result.message });
            // Refresh subcategories for this category
            const subs = await getSubcategories(currentSubcategory.category_id);
            setSubcategories(prev => ({ ...prev, [currentSubcategory.category_id!]: subs }));
            setIsSubcategoryDialogOpen(false);
        } else {
            toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
        }
        setActionLoading(false);
    };

    const handleDeleteSubcategory = async (sub: Subcategory) => {
        if (!confirm('Supprimer cette sous-catégorie ?')) return;

        const result = await deleteSubcategory(sub.id);
        if (result.status === 'success') {
            toast({ title: 'Succès', description: result.message });
            const subs = await getSubcategories(sub.category_id);
            setSubcategories(prev => ({ ...prev, [sub.category_id]: subs }));
        } else {
            toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
        }
    };

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                <div className="space-y-2">
                    <Badge className="bg-primary/10 text-primary border-none font-bold px-3 py-1 uppercase tracking-wider text-[10px]">Taxonomie & Contenu</Badge>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                        Gestion des <span className="text-primary italic">Catégories</span>
                    </h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <Tag className="h-4 w-4" /> {categories.length} catégories principales configurées
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl h-12 w-12 hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
                        onClick={loadCategories}
                        disabled={loading}
                    >
                        <RefreshCcw className={cn("h-5 w-5", loading && "animate-spin")} />
                    </Button>
                    <Button
                        variant="outline"
                        className="rounded-2xl border-border/40 font-bold px-6 h-12 hover:bg-primary/5 transition-all"
                        onClick={handleSync}
                        disabled={isSyncing}
                    >
                        {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                        Synchroniser
                    </Button>
                    <Button
                        className="bg-primary hover:bg-primary/90 text-white font-black px-8 h-12 rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                        onClick={() => {
                            setCurrentCategory({ name: '', slug: '', icon: '', position: categories.length, is_active: true });
                            setIsCategoryDialogOpen(true);
                        }}
                    >
                        <Plus size={18} className="mr-2" /> Nouvelle Catégorie
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <Card className="border-0 shadow-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 border-b border-border/10">
                    <div className="relative w-full lg:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Rechercher une catégorie..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-11 h-12 bg-white/50 dark:bg-slate-950/50 border-border/20 rounded-2xl focus:ring-primary/20 transition-all font-medium"
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 space-y-4">
                            <div className="h-12 w-12 border-b-2 border-primary border-t-2 border-t-transparent rounded-full animate-spin" />
                            <p className="text-muted-foreground font-black animate-pulse uppercase tracking-widest text-[10px]">Chargement des données...</p>
                        </div>
                    ) : filteredCategories.length === 0 ? (
                        <div className="text-center py-40 space-y-6">
                            <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto border border-dashed border-border/60">
                                <LayoutGrid className="h-12 w-12 text-muted-foreground/30" />
                            </div>
                            <p className="text-xl font-black">Aucune catégorie trouvée</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/10">
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead className="py-6 font-bold uppercase tracking-widest text-[10px]">Nom / Slug</TableHead>
                                        <TableHead className="font-bold uppercase tracking-widest text-[10px]">Icone</TableHead>
                                        <TableHead className="font-bold uppercase tracking-widest text-[10px]">Position</TableHead>
                                        <TableHead className="font-bold uppercase tracking-widest text-[10px]">Statut</TableHead>
                                        <TableHead className="text-right pr-8 font-bold uppercase tracking-widest text-[10px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCategories.map((category) => (
                                        <React.Fragment key={category.id}>
                                            <TableRow className="group hover:bg-muted/40 border-b border-border/10 transition-colors">
                                                <TableCell className="pl-6">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg"
                                                        onClick={() => toggleRow(category.id)}
                                                    >
                                                        {expandedRows.has(category.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="py-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-800 dark:text-white leading-tight">{category.name}</span>
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-0.5">{category.slug}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-2xl">{category.icon || "—"}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-mono">{category.position}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn(
                                                        "font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest border-none",
                                                        category.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-200 text-slate-500"
                                                    )}>
                                                        {category.is_active ? "Actif" : "Inactif"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-8">
                                                    <div className="flex gap-2 justify-end">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-10 w-10 rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-sm"
                                                            onClick={() => {
                                                                setCurrentCategory(category);
                                                                setIsCategoryDialogOpen(true);
                                                            }}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-10 w-10 rounded-xl hover:bg-rose-500/10 text-rose-500 shadow-sm"
                                                            onClick={() => handleDeleteCategory(category.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {/* Subcategories Row */}
                                            {expandedRows.has(category.id) && (
                                                <TableRow className="bg-slate-50/50 dark:bg-slate-950/20">
                                                    <TableCell colSpan={6} className="p-0 border-b border-border/10">
                                                        <div className="p-8 space-y-6">
                                                            <div className="flex justify-between items-center bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-border/50 shadow-sm">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                                                        <Layers className="h-5 w-5" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-black uppercase tracking-widest leading-none">Sous-Catégories</p>
                                                                        <p className="text-[10px] font-medium text-muted-foreground mt-1">Gérer les segments de {category.name}</p>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-slate-900 text-white rounded-xl font-bold px-4 h-9"
                                                                    onClick={() => {
                                                                        setCurrentSubcategory({
                                                                            category_id: category.id,
                                                                            name: '',
                                                                            slug: '',
                                                                            position: (subcategories[category.id]?.length || 0),
                                                                            is_active: true
                                                                        });
                                                                        setIsSubcategoryDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Plus className="h-3 w-3 mr-2" /> Ajouter
                                                                </Button>
                                                            </div>

                                                            {!subcategories[category.id] ? (
                                                                <div className="flex justify-center py-8">
                                                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                                </div>
                                                            ) : subcategories[category.id].length === 0 ? (
                                                                <div className="text-center py-12 bg-white/50 rounded-3xl border border-dashed border-border/50 px-6">
                                                                    <p className="text-sm font-medium text-muted-foreground">Aucune sous-catégorie configurée pour ce secteur.</p>
                                                                </div>
                                                            ) : (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                    {subcategories[category.id].map(sub => (
                                                                        <div key={sub.id} className="group/sub flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                                                                            <div className="flex flex-col">
                                                                                <span className="font-bold text-slate-800 dark:text-white">{sub.name}</span>
                                                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{sub.slug}</span>
                                                                            </div>
                                                                            <div className="flex gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                                                                <Button
                                                                                    size="icon"
                                                                                    variant="ghost"
                                                                                    className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                                    onClick={() => {
                                                                                        setCurrentSubcategory(sub);
                                                                                        setIsSubcategoryDialogOpen(true);
                                                                                    }}
                                                                                >
                                                                                    <Edit2 className="h-3 w-3" />
                                                                                </Button>
                                                                                <Button
                                                                                    size="icon"
                                                                                    variant="ghost"
                                                                                    className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-rose-500"
                                                                                    onClick={() => handleDeleteSubcategory(sub)}
                                                                                >
                                                                                    <Trash2 className="h-3 w-3" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Category Dialog */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent className="rounded-[2.5rem] border-0 bg-white dark:bg-slate-950 p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                    <DialogHeader className="space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                            <Settings2 className="h-8 w-8" />
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tight">
                            {currentCategory?.id ? "Modifier" : "Nouvelle"} Catégorie
                        </DialogTitle>
                        <DialogDescription className="font-medium text-muted-foreground">
                            Configurez les propriétés de votre catégorie principale.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-6 font-headline">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest opacity-60 pl-1">Nom Public</Label>
                            <Input
                                id="name"
                                value={currentCategory?.name || ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    setCurrentCategory(prev => ({
                                        ...prev,
                                        name: val,
                                        // Auto-slug if new
                                        slug: !prev?.id ? val.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-') : prev?.slug
                                    }));
                                }}
                                className="h-12 bg-slate-50 border-border/20 rounded-xl font-bold px-4"
                                placeholder="ex: Restaurants & Cafés"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="slug" className="text-xs font-black uppercase tracking-widest opacity-60 pl-1">URL (Slug)</Label>
                            <Input
                                id="slug"
                                value={currentCategory?.slug || ''}
                                onChange={e => setCurrentCategory(prev => ({ ...prev, slug: e.target.value }))}
                                className="h-12 bg-slate-50 border-border/20 rounded-xl font-mono text-xs px-4"
                                placeholder="ex: restaurants-cafes"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="icon" className="text-xs font-black uppercase tracking-widest opacity-60 pl-1">Emoji / Icone</Label>
                                <Input
                                    id="icon"
                                    value={currentCategory?.icon || ''}
                                    onChange={e => setCurrentCategory(prev => ({ ...prev, icon: e.target.value }))}
                                    className="h-12 bg-slate-50 border-border/20 rounded-xl text-center text-xl px-0"
                                    placeholder="🍴"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="position" className="text-xs font-black uppercase tracking-widest opacity-60 pl-1">Position</Label>
                                <Input
                                    id="position"
                                    type="number"
                                    value={currentCategory?.position ?? 0}
                                    onChange={e => setCurrentCategory(prev => ({ ...prev, position: parseInt(e.target.value) }))}
                                    className="h-12 bg-slate-50 border-border/20 rounded-xl font-black text-center px-0"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-border/20">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-black uppercase tracking-widest">Activer la catégorie</Label>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase">Visible sur le site public</p>
                            </div>
                            <Switch
                                checked={currentCategory?.is_active ?? true}
                                onCheckedChange={checked => setCurrentCategory(prev => ({ ...prev, is_active: checked }))}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-3 mt-4">
                        <Button variant="ghost" className="rounded-2xl font-bold px-8" onClick={() => setIsCategoryDialogOpen(false)}>Annuler</Button>
                        <Button
                            className="bg-primary text-white rounded-2xl font-black px-10 shadow-xl shadow-primary/20 transition-all active:scale-95"
                            disabled={actionLoading}
                            onClick={handleSaveCategory}
                        >
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Subcategory Dialog */}
            <Dialog open={isSubcategoryDialogOpen} onOpenChange={setIsSubcategoryDialogOpen}>
                <DialogContent className="rounded-[2.5rem] border-0 bg-white dark:bg-slate-950 p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                    <DialogHeader className="space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                            <Layers className="h-8 w-8" />
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tight">
                            {currentSubcategory?.id ? "Modifier" : "Nouvelle"} Sous-Catégorie
                        </DialogTitle>
                        <DialogDescription className="font-medium text-muted-foreground">
                            Précisez le segment au sein du secteur parent.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-6 font-headline">
                        <div className="grid gap-2">
                            <Label htmlFor="sub-name" className="text-xs font-black uppercase tracking-widest opacity-60 pl-1">Nom Public</Label>
                            <Input
                                id="sub-name"
                                value={currentSubcategory?.name || ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    setCurrentSubcategory(prev => ({
                                        ...prev,
                                        name: val,
                                        slug: !prev?.id ? val.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-') : prev?.slug
                                    }));
                                }}
                                className="h-12 bg-slate-50 border-border/20 rounded-xl font-bold px-4"
                                placeholder="ex: Cuisine Italienne"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="sub-slug" className="text-xs font-black uppercase tracking-widest opacity-60 pl-1">URL (Slug)</Label>
                            <Input
                                id="sub-slug"
                                value={currentSubcategory?.slug || ''}
                                onChange={e => setCurrentSubcategory(prev => ({ ...prev, slug: e.target.value }))}
                                className="h-12 bg-slate-50 border-border/20 rounded-xl font-mono text-xs px-4"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="sub-position" className="text-xs font-black uppercase tracking-widest opacity-60 pl-1">Position</Label>
                            <Input
                                id="sub-position"
                                type="number"
                                value={currentSubcategory?.position ?? 0}
                                onChange={e => setCurrentSubcategory(prev => ({ ...prev, position: parseInt(e.target.value) }))}
                                className="h-12 bg-slate-50 border-border/20 rounded-xl font-black px-4"
                            />
                        </div>
                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-border/20">
                            <div>
                                <Label className="text-sm font-black uppercase tracking-widest">Actif</Label>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase">Afficher cette option</p>
                            </div>
                            <Switch
                                checked={currentSubcategory?.is_active ?? true}
                                onCheckedChange={checked => setCurrentSubcategory(prev => ({ ...prev, is_active: checked }))}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-3 mt-4">
                        <Button variant="ghost" className="rounded-2xl font-bold px-8" onClick={() => setIsSubcategoryDialogOpen(false)}>Annuler</Button>
                        <Button
                            className="bg-primary text-white rounded-2xl font-black px-10 shadow-xl shadow-primary/20 transition-all"
                            disabled={actionLoading}
                            onClick={handleSaveSubcategory}
                        >
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Helper to use React.Fragment in the map
import React from 'react';
