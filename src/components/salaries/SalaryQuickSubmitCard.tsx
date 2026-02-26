'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { submitSalary, type SalaryFormState } from '@/app/actions/salary';
import { getSearchSuggestions, type SearchSuggestion } from '@/app/actions/search';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, Search } from 'lucide-react';

type Interval = {
  id: string;
  label: string;
  min: number;
  max: number;
};

type SalaryQuickSubmitCardProps = {
  roles: string[];
  departments: string[];
  intervals: Interval[];
};

const INITIAL_STATE: SalaryFormState = { status: 'idle', message: '' };

export function SalaryQuickSubmitCard({ roles, departments, intervals }: SalaryQuickSubmitCardProps) {
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<SearchSuggestion | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [state, formAction] = useActionState(submitSalary, INITIAL_STATE);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const sync = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error || !data.user) {
        setAuthStatus('unauthenticated');
        return;
      }
      setAuthStatus('authenticated');
    };

    sync();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthStatus(session?.user ? 'authenticated' : 'unauthenticated');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedBusiness) return;
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const result = await getSearchSuggestions(query.trim());
        setSuggestions(result.filter((item) => item.type === 'business'));
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, selectedBusiness]);

  useEffect(() => {
    if (state.status === 'success') {
      setQuery('');
      setSuggestions([]);
      setSelectedBusiness(null);
    }
  }, [state.status]);

  const loginHref = '/login?next=/salaires/partager';
  const canSubmit = authStatus === 'authenticated' && !!selectedBusiness;
  const intervalText = useMemo(
    () => intervals.map((item) => item.label).join(' | '),
    [intervals]
  );

  return (
    <Card className="rounded-2xl border border-border/60">
      <CardHeader>
        <CardTitle>Soumettre maintenant</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {authStatus === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verification de session...
          </div>
        )}

        {authStatus === 'unauthenticated' && (
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Connectez-vous pour publier un salaire
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              La soumission directe est reservee aux comptes connectes pour limiter le spam.
            </p>
            <div className="mt-3">
              <Button asChild>
                <Link href={loginHref}>Se connecter</Link>
              </Button>
            </div>
          </div>
        )}

        {authStatus === 'authenticated' && (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="businessId" value={selectedBusiness?.id || ''} />
            <input type="hidden" name="isCurrent" value="true" />

            <div className="space-y-2">
              <Label htmlFor="business-search">Entreprise</Label>
              {!selectedBusiness ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="business-search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Rechercher une entreprise..."
                      className="pl-9"
                    />
                  </div>
                  {isSearching && (
                    <p className="text-xs text-muted-foreground">Recherche...</p>
                  )}
                  {suggestions.length > 0 && (
                    <div className="max-h-48 overflow-auto rounded-md border">
                      {suggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            setSelectedBusiness(item);
                            setSuggestions([]);
                          }}
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{item.city || 'Maroc'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-md border p-2.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Selectionne</Badge>
                    <span className="text-sm font-medium">{selectedBusiness.name}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedBusiness(null)}>
                    Changer
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Poste</Label>
                {roles.length > 0 ? (
                  <select id="jobTitle" name="jobTitle" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required>
                    <option value="">Selectionner un poste</option>
                    {roles.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                ) : (
                  <Input id="jobTitle" name="jobTitle" required placeholder="Ex: Developpeur Full Stack" />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">Salaire (MAD)</Label>
                <Input id="salary" name="salary" type="number" min="500" step="1" required />
                {intervals.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">Intervalles autorises: {intervalText}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="payPeriod">Periode</Label>
                <select id="payPeriod" name="payPeriod" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="monthly">
                  <option value="monthly">Mensuel</option>
                  <option value="yearly">Annuel</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employmentType">Contrat</Label>
                <select id="employmentType" name="employmentType" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="full_time">
                  <option value="full_time">Temps plein</option>
                  <option value="part_time">Temps partiel</option>
                  <option value="contract">Contrat</option>
                  <option value="intern">Stage</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearsExperience">Experience</Label>
                <Input id="yearsExperience" name="yearsExperience" type="number" min="0" max="60" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="seniorityLevel">Seniority (optionnel)</Label>
                <select id="seniorityLevel" name="seniorityLevel" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
                  <option value="">Auto</option>
                  <option value="junior">Junior</option>
                  <option value="confirme">Confirme</option>
                  <option value="senior">Senior</option>
                  <option value="expert">Expert</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Departement (optionnel)</Label>
                {departments.length > 0 ? (
                  <select id="department" name="department" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
                    <option value="">Selectionner un departement</option>
                    {departments.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                ) : (
                  <Input id="department" name="department" placeholder="Ex: Engineering" />
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Soumission anonyme, publication apres moderation.
            </p>

            {state.status === 'error' && state.message && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}
            {state.status === 'success' && state.message && (
              <p className="text-sm text-green-700">{state.message}</p>
            )}

            <Button type="submit" disabled={!canSubmit}>
              {!selectedBusiness ? 'Selectionnez une entreprise' : 'Soumettre un salaire'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

