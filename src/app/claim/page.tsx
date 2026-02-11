'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSiteSettings } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Search, Plus, ArrowRight, CheckCircle2, Loader2, AlertTriangle, Info, Store, Crown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getStoragePublicUrl } from '@/lib/data';
import { isValidImageUrl } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function ClaimPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<any | null>(null);
  // removed claimedBusinesses state as it's now in the result items
  const [siteName, setSiteName] = useState('Platform'); // Default fallback
  const [userClaimStatus, setUserClaimStatus] = useState<'none' | 'pending' | 'approved'>('none');
  const [existingClaim, setExistingClaim] = useState<any>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const settings = await getSiteSettings();
        setSiteName(settings.site_name || 'Platform');
      } catch (error) {
        console.error('Error fetching site settings:', error);
        // Keep default value
      }
    };
    fetchSiteSettings();
  }, []);

  // Check user's existing claim status
  useEffect(() => {
    const checkUserClaimStatus = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setUserClaimStatus('none');
          return;
        }

        // Check if user has an existing claim
        const { data: claims, error } = await supabase
          .from('business_claims')
          .select('*, business:businesses(name, logo_url)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error checking claim status:', error);
          setUserClaimStatus('none');
          return;
        }

        if (claims && claims.length > 0) {
          const claim = claims[0];
          setExistingClaim(claim);

          if (claim.status === 'approved') {
            setUserClaimStatus('approved');
            // Redirect to dashboard if they have an approved claim
            router.push('/dashboard');
            return;
          } else if (claim.status === 'pending') {
            setUserClaimStatus('pending');
          }
        } else {
          setUserClaimStatus('none');
        }
      } catch (error) {
        console.error('Error checking user claim status:', error);
        setUserClaimStatus('none');
      }
    };

    checkUserClaimStatus();
  }, [router]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/businesses/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        setSearchResults(data.results || []);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // No longer need individual checks - API handles this now

  // Show different UI based on user claim status
  if (userClaimStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-50 py-12">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <Store className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-3">Revendication en cours</h1>
            <p className="text-lg text-muted-foreground">
              Votre demande de revendication est en cours de traitement
            </p>
          </div>

          <Card className="border-2 border-amber-200 bg-amber-50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
                Revendication en attente de validation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg border">
                <p className="font-medium mb-2">Établissement concerné:</p>
                <p className="text-lg font-semibold">{existingClaim?.business?.name}</p>
                <p className="text-sm text-muted-foreground">
                  Soumis le {new Date(existingClaim?.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Prochaines étapes
                </h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Notre équipe vérifie votre demande (24-48h)</li>
                  <li>• Vous recevrez un email dès la validation</li>
                  <li>• Accès complet au tableau de bord après approbation</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-600" />
                  Limitation actuelle
                </h3>
                <p className="text-sm text-muted-foreground">
                  Actuellement, chaque utilisateur peut revendiquer une seule entreprise.
                  Cette limitation sera levée prochainement avec les comptes Premium.
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button asChild>
                  <Link href="/dashboard/pending">
                    Suivre ma demande
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">Retour à l'accueil</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-50 py-12">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Gérez votre Établissement</h1>
          <p className="text-lg text-muted-foreground">
            Revendiquez votre page {siteName} et commencez à gérer les avis de vos clients
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <div className="bg-white rounded-lg p-6 border">
            <CheckCircle2 className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-semibold mb-2">Gérez les avis</h3>
            <p className="text-sm text-muted-foreground">Répondez aux clients et améliorez votre réputation</p>
          </div>
          <div className="bg-white rounded-lg p-6 border">
            <CheckCircle2 className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-semibold mb-2">Partagez les actualités</h3>
            <p className="text-sm text-muted-foreground">Publiez des mises à jour et événements</p>
          </div>
          <div className="bg-white rounded-lg p-6 border">
            <CheckCircle2 className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-semibold mb-2">Intégrez le widget</h3>
            <p className="text-sm text-muted-foreground">Affichez vos avis sur votre site</p>
          </div>
        </div>

        {/* Important Notice */}
        <Card className="border-2 border-blue-200 bg-blue-50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Info className="h-5 w-5" />
              Information importante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Store className="h-4 w-4" />
                Une entreprise par utilisateur
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Actuellement, chaque utilisateur peut revendiquer une seule entreprise pour garantir une gestion de qualité.
              </p>
              <div className="bg-amber-50 p-3 rounded border border-amber-200">
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  <strong>Important :</strong> Les comptes Growth/Pro restent limités à un seul établissement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Card */}
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Étape 1 : Trouvez votre entreprise</CardTitle>
            <CardDescription>
              Cherchez votre entreprise existante ou créez-en une nouvelle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search Box */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Recherchez votre entreprise</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Entrez le nom ou l'adresse..."
                  className="pl-10 py-6 text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={selectedBusiness !== null}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Tapez au moins 2 caractères pour rechercher
              </p>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y bg-white">
                {searchResults.map((business) => (
                  <div
                    key={business.id}
                    className={`p-4 transition-all duration-200 border-b last:border-0 ${business.is_claimed ? 'bg-gray-50/50 opacity-80' : 'hover:bg-primary/5 cursor-pointer group'}`}
                    onClick={() => !business.is_claimed && setSelectedBusiness(business)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative w-12 h-12 flex-shrink-0">
                        {(() => {
                          const logoUrl = getStoragePublicUrl(business.logo_url);
                          if (logoUrl && isValidImageUrl(logoUrl)) {
                            return (
                              <Image
                                src={logoUrl}
                                alt={business.name}
                                fill
                                className="object-cover rounded"
                              />
                            );
                          }
                          return (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 rounded text-xs font-bold">
                              {business.name && business.name.split(' ').length > 1
                                ? (business.name.split(' ')[0][0] + business.name.split(' ')[1][0]).toUpperCase()
                                : business.name ? business.name[0].toUpperCase() : 'B'}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate text-foreground group-hover:text-primary transition-colors">{business.name}</p>
                          {business.is_claimed && (
                            <Badge variant="secondary" className="flex items-center gap-1 text-[10px] py-0 h-5 border-orange-200 bg-orange-50 text-orange-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Certifié
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{business.location}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 italic">
                            {business.category}
                          </span>
                        </div>
                      </div>
                      {!business.is_claimed ? (
                        <div className="flex flex-col items-center justify-center p-2 rounded-full group-hover:bg-primary group-hover:text-white transition-all">
                          <Plus className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="text-orange-500 opacity-60">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {loading && searchQuery.length > 0 && (
              <div className="border rounded-lg p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Recherche en cours...</p>
              </div>
            )}

            {searchQuery.length > 0 && !loading && searchResults.length === 0 && (
              <div className="border rounded-lg p-8 text-center bg-blue-50">
                <p className="text-sm text-muted-foreground mb-4">
                  Aucune entreprise trouvée pour "{searchQuery}"
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  C'est normal, créez une nouvelle entreprise ci-dessous
                </p>
              </div>
            )}

            {selectedBusiness && !selectedBusiness.is_claimed && (
              <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                <p className="text-sm text-muted-foreground mb-2">Établissement sélectionné:</p>
                <p className="font-semibold text-lg mb-3">{selectedBusiness.name}</p>
                <div className="flex gap-2">
                  <Button
                    asChild
                    size="sm"
                    onClick={() => {
                      // Pass business ID to claim form
                    }}
                  >
                    <Link href={`/claim/new?businessId=${selectedBusiness.id}`}>
                      C'est le mien
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedBusiness(null);
                      setSearchQuery('');
                    }}
                  >
                    Changer
                  </Button>
                </div>
              </div>
            )}

            {selectedBusiness && selectedBusiness.is_claimed && (
              <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-orange-800 mb-1">Établissement déjà revendiqué</p>
                    <p className="text-sm text-orange-700">
                      Cette entreprise a déjà été revendiquée par un autre utilisateur.
                      Si vous êtes le propriétaire légitime, veuillez nous contacter.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBusiness(null);
                          setSearchQuery('');
                        }}
                      >
                        Choisir un autre
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link href="/contact">Contacter l'équipe</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-muted-foreground">ou</span>
              </div>
            </div>

            {/* Create New */}
            <Button asChild size="lg" className="w-full">
              <Link href="/claim/new">
                <Plus className="mr-2 h-5 w-5" />
                Créer une nouvelle entreprise
                <ArrowRight className="ml-auto h-5 w-5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">✨ Processus rapide</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Remplissez vos informations (5 min)</li>
            <li>✓ Vérifiez votre identité (email, téléphone ou document)</li>
            <li>✓ Notre équipe approuve votre demande (24-48h)</li>
            <li>✓ Accédez à votre tableau de bord pro</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
