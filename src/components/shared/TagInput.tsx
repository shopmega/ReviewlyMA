
import React, { useState, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface TagInputProps {
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    placeholder?: string;
    maxTags?: number;
    disabled?: boolean;
    label?: string;
}

export function TagInput({
    tags,
    onTagsChange,
    placeholder = "Appuyez sur Entrée pour ajouter un mot-clé",
    maxTags = 10,
    disabled = false,
    label
}: TagInputProps) {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    const addTag = () => {
        const trimmedValue = inputValue.trim();
        if (trimmedValue && !tags.includes(trimmedValue) && tags.length < maxTags) {
            onTagsChange([...tags, trimmedValue]);
            setInputValue('');
        }
    };

    const removeTag = (index: number) => {
        const newTags = [...tags];
        newTags.splice(index, 1);
        onTagsChange(newTags);
    };

    return (
        <div className="space-y-3">
            {label && (
                <Label className="text-sm font-semibold flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    {label}
                </Label>
            )}

            <div className={cn(
                "min-h-[100px] p-2 border-2 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40",
                disabled && "opacity-50 cursor-not-allowed pointer-events-none"
            )}>
                <div className="flex flex-wrap gap-2 mb-3">
                    {tags.length > 0 ? (
                        tags.map((tag, index) => (
                            <Badge
                                key={index}
                                variant="secondary"
                                className="pl-3 pr-1 py-1 h-8 rounded-xl bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 flex items-center gap-1 group transition-all"
                            >
                                <span className="text-xs font-bold font-headline">{tag}</span>
                                <button
                                    type="button"
                                    onClick={() => removeTag(index)}
                                    className="p-1 rounded-full hover:bg-primary/20 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        ))
                    ) : (
                        <div className="text-[11px] font-medium text-muted-foreground/60 italic px-2 py-4">
                            Aucun mot-clé ajouté. Les mots-clés aident les utilisateurs à vous trouver via la barre de recherche.
                        </div>
                    )}
                </div>

                <div className="relative group">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={tags.length >= maxTags ? "Limite de mots-clés atteinte" : placeholder}
                        disabled={disabled || tags.length >= maxTags}
                        className="h-10 border-0 bg-transparent focus-visible:ring-0 shadow-none px-2 font-medium"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                            {tags.length}/{maxTags}
                        </span>
                        <button
                            type="button"
                            onClick={addTag}
                            disabled={disabled || !inputValue.trim() || tags.length >= maxTags}
                            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white disabled:opacity-0 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <p className="text-[11px] text-muted-foreground/80 font-medium px-1">
                Utilisez des mots-clés pertinents (ex: "Halal", "Terrasse", "Vue sur mer") pour améliorer votre visibilité.
            </p>
        </div>
    );
}
