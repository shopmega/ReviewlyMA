'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BusinessWidget } from "@/components/shared/BusinessWidget";
import { Copy, AlertCircle, Loader2, Palette, Monitor, Smartphone, Tablet } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Business } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

export default function WidgetPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Widget customization state
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showBusinessName, setShowBusinessName] = useState<boolean>(true);
  const [showCategory, setShowCategory] = useState<boolean>(true);
  const [showLocation, setShowLocation] = useState<boolean>(true);
  const [showRating, setShowRating] = useState<boolean>(true);
  const [showReviewsCount, setShowReviewsCount] = useState<boolean>(true);
  const [showHours, setShowHours] = useState<boolean>(true);
  const [showCtaButton, setShowCtaButton] = useState<boolean>(true);

  /* Refactored to use central hook */
  const { businessId, profile, loading: profileLoading, error: profileError } = useBusinessProfile();

  useEffect(() => {
    if (profileLoading || !businessId) return;

    async function fetchBusiness() {
      setLoading(true);
      const supabase = createClient();

      const { data, error: businessError } = await supabase
        .from('businesses')
        .select('*, reviews(count)')
        .eq('id', businessId)
        .single();

      if (data) {
        // Add review_count to the object
        const businessWithCount = {
          ...data,
          review_count: (data as any).reviews?.[0]?.count || 0
        };
        setBusiness(businessWithCount as unknown as Business);
      } else {
        setError('Etablissement introuvable.');
      }
      setLoading(false);
    }

    fetchBusiness();
  }, [businessId, profileLoading]);

  const handleCopy = async () => {
    if (!business) return;

    // Calculate dimensions based on size selection
    let width = 350;
    let height = 200;

    switch (size) {
      case 'small':
        width = 280;
        height = 160;
        break;
      case 'large':
        width = 420;
        height = 250;
        break;
      default:
        width = 350;
        height = 200;
    }

    // Build query parameters for customization
    const params = new URLSearchParams();
    params.append('theme', theme);
    if (!showBusinessName) params.append('hideName', 'true');
    if (!showCategory) params.append('hideCategory', 'true');
    if (!showLocation) params.append('hideLocation', 'true');
    if (!showRating) params.append('hideRating', 'true');
    if (!showReviewsCount) params.append('hideReviewsCount', 'true');
    if (!showHours) params.append('hideHours', 'true');
    if (!showCtaButton) params.append('hideCta', 'true');

    const embedCode = `<iframe
  src="${process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://example.com')}/widget/${business.id}?${params.toString()}"
  width="${width}"
  height="${height}"
  style="border:none; overflow:hidden;"
  scrolling="no"
  frameborder="0"
  allowTransparency="true"
  allow="encrypted-media"
></iframe>`;

    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast({ title: 'Succes', description: 'Code copie dans le presse-papiers!' });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de copier le code.' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Widget pour votre site web</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!business) return null;

  // Calculate dimensions and params for the reactive embed code
  const getEmbedData = () => {
    if (!business) return { width: 350, height: 200, params: '' };

    let width = 350;
    let height = 200;

    switch (size) {
      case 'small':
        width = 280;
        height = 160;
        break;
      case 'large':
        width = 420;
        height = 250;
        break;
      default:
        width = 350;
        height = 200;
    }

    const params = new URLSearchParams();
    params.append('theme', theme);
    if (!showBusinessName) params.append('hideName', 'true');
    if (!showCategory) params.append('hideCategory', 'true');
    if (!showLocation) params.append('hideLocation', 'true');
    if (!showRating) params.append('hideRating', 'true');
    if (!showReviewsCount) params.append('hideReviewsCount', 'true');
    if (!showHours) params.append('hideHours', 'true');
    if (!showCtaButton) params.append('hideCta', 'true');

    return { width, height, params: params.toString() };
  };

  const { width, height, params } = getEmbedData();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://avis.ma');
  const reactiveEmbedCode = `<iframe
  src="${siteUrl}/widget/${business.id}?${params}"
  width="${width}"
  height="${height}"
  style="border:none; overflow:hidden; border-radius:12px;"
  scrolling="no"
  frameborder="0"
  allowTransparency="true"
  allow="encrypted-media"
></iframe>`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Widget pour {business ? business.name : 'votre site web'}</h1>
        <p className="text-muted-foreground">
          Affichez votre note et vos avis directement sur votre site pour renforcer la confiance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Customization Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Personnalisation Avancée
              </CardTitle>
              <CardDescription>
                Configurez l'apparence de votre widget selon vos préférences
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Size Selection */}
              <div className="space-y-3">
                <Label>Taille du Widget</Label>
                <RadioGroup value={size} onValueChange={(value: 'small' | 'medium' | 'large') => setSize(value)} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="small" id="size-small" />
                    <Label htmlFor="size-small" className="text-sm font-normal">Petit</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="size-medium" />
                    <Label htmlFor="size-medium" className="text-sm font-normal">Moyen</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="large" id="size-large" />
                    <Label htmlFor="size-large" className="text-sm font-normal">Grand</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Theme Selection */}
              <div className="space-y-3">
                <Label>Thème</Label>
                <RadioGroup value={theme} onValueChange={(value: 'light' | 'dark') => setTheme(value)} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="theme-light" />
                    <Label htmlFor="theme-light" className="text-sm font-normal">Clair</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="theme-dark" />
                    <Label htmlFor="theme-dark" className="text-sm font-normal">Sombre</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Content Visibility Options */}
              <div className="space-y-3">
                <Label>Options d'affichage</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showName" checked={showBusinessName} onCheckedChange={(checked) => setShowBusinessName(checked === true)} />
                    <Label htmlFor="showName" className="text-sm font-normal">Afficher le nom de l'établissement</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showCategory" checked={showCategory} onCheckedChange={(checked) => setShowCategory(checked === true)} />
                    <Label htmlFor="showCategory" className="text-sm font-normal">Afficher la catégorie</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showLocation" checked={showLocation} onCheckedChange={(checked) => setShowLocation(checked === true)} />
                    <Label htmlFor="showLocation" className="text-sm font-normal">Afficher la localisation</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showRating" checked={showRating} onCheckedChange={(checked) => setShowRating(checked === true)} />
                    <Label htmlFor="showRating" className="text-sm font-normal">Afficher la notation</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Options supplémentaires</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showReviewsCount" checked={showReviewsCount} onCheckedChange={(checked) => setShowReviewsCount(checked === true)} />
                    <Label htmlFor="showReviewsCount" className="text-sm font-normal">Afficher le nombre d'avis</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showHours" checked={showHours} onCheckedChange={(checked) => setShowHours(checked === true)} />
                    <Label htmlFor="showHours" className="text-sm font-normal">Afficher les horaires</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showCtaButton" checked={showCtaButton} onCheckedChange={(checked) => setShowCtaButton(checked === true)} />
                    <Label htmlFor="showCtaButton" className="text-sm font-normal">Afficher le bouton "Voir les avis"</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Embed Code Card */}
          <Card>
            <CardHeader>
              <CardTitle>Copier le code</CardTitle>
              <CardDescription>
                Copiez et collez ce code HTML là où vous souhaitez que le widget apparaisse sur votre site.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="embedCode">Code d'intégration</Label>
                <div className="relative">
                  <Textarea
                    id="embedCode"
                    readOnly
                    value={reactiveEmbedCode}
                    className="h-48 font-mono text-xs bg-muted"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleCopy}
                    title="Copier le code"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600">Code copié avec succès!</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Le widget est entièrement responsive et s'adaptera à la largeur de son conteneur. La hauteur est fixe.
              </p>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Aperçu du Widget</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center p-4 bg-muted/30 min-h-[300px]">
              <div
                className="transition-all duration-300 ease-in-out shadow-2xl rounded-xl overflow-hidden"
                style={{ width: `${width}px`, height: `${height}px` }}
              >
                <BusinessWidget
                  business={business}
                  theme={theme}
                  showName={showBusinessName}
                  showCategory={showCategory}
                  showLocation={showLocation}
                  showRating={showRating}
                  showReviewsCount={showReviewsCount}
                  showHours={showHours}
                  showCtaButton={showCtaButton}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
