'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Building, Utensils, ChevronRight, Loader2 } from 'lucide-react';
import { getSearchSuggestions, SearchSuggestion } from '@/app/actions/search';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SearchAutocompleteProps {
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    city?: string;
    onSearch?: (query: string) => void;
    showIcon?: boolean;
}

export function SearchAutocomplete({
    placeholder = "Rechercher...",
    className,
    inputClassName,
    city,
    onSearch,
    showIcon = true,
}: SearchAutocompleteProps) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const fetchSuggestions = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);
        try {
            const results = await getSearchSuggestions(searchQuery, city);
            setSuggestions(results);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        } finally {
            setIsLoading(false);
        }
    }, [city]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query) {
                fetchSuggestions(query);
            } else {
                setSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, fetchSuggestions]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (suggestion: SearchSuggestion) => {
        setIsOpen(false);
        if (suggestion.type === 'business') {
            router.push(`/businesses/${suggestion.id}`);
        } else {
            router.push(`/businesses?category=${encodeURIComponent(suggestion.name)}${city ? `&city=${encodeURIComponent(city)}` : ''}`);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (onSearch) {
            onSearch(query);
        } else {
            router.push(`/businesses?search=${encodeURIComponent(query)}${city ? `&city=${encodeURIComponent(city)}` : ''}`);
        }
        setIsOpen(false);
    };

    return (
        <div className={cn("relative w-full", className)} ref={dropdownRef}>
            <form onSubmit={handleSubmit}>
                <div className="relative flex items-center">
                    {showIcon && <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                    <Input
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        placeholder={placeholder}
                        className={cn(
                            showIcon && "pl-10",
                            inputClassName
                        )}
                        name="search"
                        autoComplete="off"
                    />
                    {isLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </div>
            </form>

            {isOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background rounded-xl border border-border shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2">
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion.id}
                                onClick={() => handleSelect(suggestion)}
                                className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent rounded-lg transition-colors group"
                            >
                                <div className="p-2 bg-muted rounded-lg group-hover:bg-accent transition-colors">
                                    {suggestion.type === 'business' ? (
                                        <Building className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
                                    ) : (
                                        <Utensils className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-foreground truncate">
                                        {suggestion.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        {suggestion.type === 'business' ? (
                                            <>
                                                <MapPin className="h-3 w-3" />
                                                {suggestion.city} • {suggestion.category}
                                            </>
                                        ) : (
                                            'Catégorie'
                                        )}
                                    </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
                            </button>
                        ))}
                    </div>
                    {query.length >= 2 && (
                        <div className="border-t border-border p-2 bg-muted/50">
                            <button
                                onClick={handleSubmit}
                                className="w-full text-center py-2 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                            >
                                Voir tous les résultats pour "{query}"
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
