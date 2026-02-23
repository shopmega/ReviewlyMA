'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createReferralOffer } from '@/app/actions/referrals';
import type { ActionState } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Building2, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const initialState: ActionState = { status: 'idle', message: '' };

type BusinessOption = {
  id: string;
  name: string;
  city: string;
};

type SearchResult = {
  id: string;
  name: string;
  city: string;
};

export function OfferCreateForm({ businessOptions }: { businessOptions: BusinessOption[] }) {
  const [state, formAction] = useActionState(createReferralOffer, initialState);
  const { toast } = useToast();
  const router = useRouter();
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [companyQuery, setCompanyQuery] = useState('');
  const [manualCompanyName, setManualCompanyName] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<SearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  useEffect(() => {
    if (selectedBusiness) {
      setCompanyQuery(selectedBusiness.name);
    }
  }, [selectedBusiness]);

  useEffect(() => {
    const query = companyQuery.trim();
    if (selectedBusiness && query === selectedBusiness.name) {
      setSuggestions([]);
      return;
    }
    if (query.length < 2) {
      setSuggestions([]);
      setSearchError('');
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');
      try {
        const response = await fetch(`/api/businesses/search?q=${encodeURIComponent(query)}&limit=8`, {
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) {
          setSearchError('Recherche indisponible. Continuez en saisie manuelle.');
          setSuggestions([]);
          return;
        }
        const next = Array.isArray(body?.results)
          ? body.results
              .filter((item: any) => item?.id && item?.name)
              .map((item: any) => ({
                id: String(item.id),
                name: String(item.name),
                city: item.city ? String(item.city) : '',
              }))
          : [];
        setSuggestions(next);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setSearchError('Recherche indisponible. Continuez en saisie manuelle.');
          setSuggestions([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [companyQuery, selectedBusiness]);

  const clearBusinessSelection = () => {
    setSelectedBusinessId('');
    setSelectedBusiness(null);
    setCompanyQuery('');
    setSuggestions([]);
    setSearchOpen(false);
  };

  const handleSelectBusiness = (business: SearchResult) => {
    setSelectedBusinessId(business.id);
    setSelectedBusiness(business);
    setCompanyQuery(business.name);
    setSuggestions([]);
    setSearchOpen(false);
  };

  useEffect(() => {
    if (!selectedBusinessId || selectedBusiness?.id === selectedBusinessId) return;
    const fallback = businessOptions.find((item) => item.id === selectedBusinessId);
    if (fallback) {
      setSelectedBusiness({ id: fallback.id, name: fallback.name, city: fallback.city });
    }
  }, [businessOptions, selectedBusiness, selectedBusinessId]);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Succes', description: state.message });
      if (state.data?.id) {
        router.push(`/parrainages/${state.data.id}`);
      } else {
        router.push('/parrainages');
      }
      return;
    }
    if (state.status === 'error') {
      toast({ title: 'Erreur', description: state.message, variant: 'destructive' });
    }
  }, [state, toast, router]);

  const fieldErrors = (state.errors || {}) as Record<string, string[] | undefined>;
  const fieldError = (name: string) => fieldErrors[name]?.[0];

  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-5">
          <div className="space-y-2" ref={searchBoxRef}>
            <Label htmlFor="businessSearch">Entreprise (recommandee)</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="businessSearch"
                value={companyQuery}
                onChange={(e) => {
                  const next = e.target.value;
                  setCompanyQuery(next);
                  if (selectedBusiness && next.trim() !== selectedBusiness.name) {
                    setSelectedBusinessId('');
                    setSelectedBusiness(null);
                  }
                  setSearchOpen(next.trim().length >= 2);
                }}
                onFocus={() => {
                  if (companyQuery.trim().length >= 2) setSearchOpen(true);
                }}
                placeholder="Rechercher votre entreprise..."
                className="pl-10 pr-10"
                autoComplete="off"
              />
              {(isSearching || !!companyQuery) && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <button
                      type="button"
                      onClick={clearBusinessSelection}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                      aria-label="Effacer la recherche d entreprise"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
              {searchOpen && (
                <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border bg-background p-1 shadow-xl">
                  {suggestions.length > 0 ? (
                    <div className="max-h-72 overflow-y-auto py-1">
                      {suggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectBusiness(item)}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted"
                        >
                          <div className="rounded-md bg-muted p-1.5">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{item.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{item.city || 'Maroc'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      {isSearching ? 'Recherche en cours...' : 'Aucune entreprise trouvee. Continuez en saisie manuelle.'}
                    </p>
                  )}
                </div>
              )}
            </div>
            <input type="hidden" name="businessId" value={selectedBusinessId} />
            {selectedBusiness && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Fiche liee: {selectedBusiness.name}{selectedBusiness.city ? ` (${selectedBusiness.city})` : ''}
              </div>
            )}
            {!selectedBusiness && (
              <p className="text-xs text-muted-foreground">
                Vous pouvez publier avec une saisie manuelle si votre entreprise n&apos;apparait pas.
              </p>
            )}
            {searchError && <p className="text-xs text-destructive">{searchError}</p>}
            {fieldError('businessId') && <p className="text-xs text-destructive">{fieldError('businessId')}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Entreprise</Label>
              <Input
                id="companyName"
                name="companyName"
                required
                value={selectedBusiness?.name ?? manualCompanyName}
                onChange={(e) => setManualCompanyName(e.target.value)}
                readOnly={!!selectedBusiness}
              />
              {selectedBusiness && <p className="text-xs text-muted-foreground">Nom synchronise depuis la fiche entreprise.</p>}
              {fieldError('companyName') && <p className="text-xs text-destructive">{fieldError('companyName')}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Poste</Label>
              <Input id="jobTitle" name="jobTitle" required />
              {fieldError('jobTitle') && <p className="text-xs text-destructive">{fieldError('jobTitle')}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                name="city"
                value={selectedBusiness?.city ?? manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                readOnly={!!selectedBusiness}
              />
              {fieldError('city') && <p className="text-xs text-destructive">{fieldError('city')}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractType">Contrat</Label>
              <select id="contractType" name="contractType" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
                <option value="">Selectionner</option>
                <option value="cdi">CDI</option>
                <option value="cdd">CDD</option>
                <option value="stage">Stage</option>
                <option value="freelance">Freelance</option>
                <option value="alternance">Alternance</option>
                <option value="autre">Autre</option>
              </select>
              {fieldError('contractType') && <p className="text-xs text-destructive">{fieldError('contractType')}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="workMode">Mode</Label>
              <select id="workMode" name="workMode" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
                <option value="">Selectionner</option>
                <option value="onsite">Presentiel</option>
                <option value="hybrid">Hybride</option>
                <option value="remote">Remote</option>
              </select>
              {fieldError('workMode') && <p className="text-xs text-destructive">{fieldError('workMode')}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="seniority">Niveau</Label>
              <select id="seniority" name="seniority" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
                <option value="">Selectionner</option>
                <option value="junior">Junior</option>
                <option value="confirme">Confirme</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
                <option value="manager">Manager</option>
                <option value="autre">Autre</option>
              </select>
              {fieldError('seniority') && <p className="text-xs text-destructive">{fieldError('seniority')}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description de l&apos;offre</Label>
            <Textarea
              id="description"
              name="description"
              required
              className="min-h-[140px]"
              placeholder="Expliquez le contexte, l equipe, et ce que vous attendez du candidat."
            />
            {fieldError('description') && <p className="text-xs text-destructive">{fieldError('description')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirements">Exigences (optionnel)</Label>
            <Textarea id="requirements" name="requirements" className="min-h-[90px]" />
            {fieldError('requirements') && <p className="text-xs text-destructive">{fieldError('requirements')}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slots">Nombre de places</Label>
              <Input id="slots" name="slots" type="number" min="1" max="10" defaultValue="1" />
              {fieldError('slots') && <p className="text-xs text-destructive">{fieldError('slots')}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="expiresAt">Expiration (optionnel)</Label>
              <Input id="expiresAt" name="expiresAt" type="datetime-local" />
              {fieldError('expiresAt') && <p className="text-xs text-destructive">{fieldError('expiresAt')}</p>}
            </div>
          </div>

          <div className="rounded-xl border bg-muted/40 p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className={cn(selectedBusiness ? 'border-emerald-300 text-emerald-700' : '')}>
                {selectedBusiness ? 'Entreprise verifiee' : 'Entreprise manuelle'}
              </Badge>
              <span>Les candidats vous contacteront depuis la page de l&apos;offre.</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="rounded-xl">Publier mon offre</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
