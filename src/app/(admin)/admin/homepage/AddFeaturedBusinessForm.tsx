'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

type Business = {
  id: string;
  name: string;
  location: string | null;
};

function SubmitButton({ loading }: { loading: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || loading}>
      {pending ? 'Ajout en cours...' : 'Ajouter à la une'}
    </Button>
  );
}

export function AddFeaturedBusinessForm() {
  const [open, setOpen] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchUnfeaturedBusinesses();
    }
  }, [open]);

  async function fetchUnfeaturedBusinesses() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, location')
      .eq('is_featured', false)
      .order('name');

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setBusinesses(data || []);
    }
    setLoading(false);
  }

  async function handleAddFeatured() {
    if (!selectedBusiness) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('businesses')
      .update({ is_featured: true })
      .eq('id', selectedBusiness);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Entreprise ajoutée à la une.' });
      setSelectedBusiness('');
      setOpen(false);
      // Trigger page refresh to update the list
      window.location.reload();
    }
    setLoading(false);
  }

  const filteredBusinesses = businesses.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.location || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="mr-2 h-4 w-4" /> Ajouter à la une
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Ajouter une entreprise à la une</DialogTitle>
          <DialogDescription>
            Sélectionnez une entreprise à mettre en avant sur la page d'accueil.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="search">Rechercher une entreprise</Label>
            <Input
              id="search"
              placeholder="Nom ou ville..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="business">Entreprise</Label>
            {loading && filteredBusinesses.length === 0 ? (
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement...
              </div>
            ) : (
              <Select value={selectedBusiness} onValueChange={setSelectedBusiness} disabled={loading}>
                <SelectTrigger id="business">
                  <SelectValue placeholder="Sélectionner une entreprise" />
                </SelectTrigger>
                <SelectContent>
                  {filteredBusinesses.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      {businesses.length === 0 ? 'Toutes les entreprises sont à la une' : 'Aucun résultat'}
                    </div>
                  ) : (
                    filteredBusinesses.map((business) => (
                      <SelectItem key={business.id} value={business.id}>
                        <span>{business.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({business.location})</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleAddFeatured} disabled={!selectedBusiness || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
