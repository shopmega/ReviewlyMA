'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BusinessWidget } from '@/components/shared/BusinessWidget';
import { Copy, AlertCircle, Loader2, Palette } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Business } from '@/lib/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { getClientSiteUrl } from '@/lib/site-config';
import { useI18n } from '@/components/providers/i18n-provider';

export default function WidgetPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { t, tf } = useI18n();

  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showBusinessName, setShowBusinessName] = useState<boolean>(true);
  const [showCategory, setShowCategory] = useState<boolean>(true);
  const [showLocation, setShowLocation] = useState<boolean>(true);
  const [showRating, setShowRating] = useState<boolean>(true);
  const [showReviewsCount, setShowReviewsCount] = useState<boolean>(true);
  const [showHours, setShowHours] = useState<boolean>(true);
  const [showCtaButton, setShowCtaButton] = useState<boolean>(true);

  const { businessId, loading: profileLoading } = useBusinessProfile();

  useEffect(() => {
    if (profileLoading || !businessId) return;

    async function fetchBusiness() {
      setLoading(true);
      const supabase = createClient();

      const { data } = await supabase
        .from('businesses')
        .select('*, reviews(count)')
        .eq('id', businessId)
        .single();

      if (data) {
        const businessWithCount = {
          ...data,
          review_count: (data as any).reviews?.[0]?.count || 0,
        };
        setBusiness(businessWithCount as unknown as Business);
      } else {
        setError(t('dashboardWidgetPage.errors.businessNotFound', 'Business not found.'));
      }
      setLoading(false);
    }

    fetchBusiness();
  }, [businessId, profileLoading, t]);

  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { width: 280, height: 160 };
      case 'large':
        return { width: 420, height: 250 };
      default:
        return { width: 350, height: 200 };
    }
  };

  const getParams = () => {
    const params = new URLSearchParams();
    params.append('theme', theme);
    if (!showBusinessName) params.append('hideName', 'true');
    if (!showCategory) params.append('hideCategory', 'true');
    if (!showLocation) params.append('hideLocation', 'true');
    if (!showRating) params.append('hideRating', 'true');
    if (!showReviewsCount) params.append('hideReviewsCount', 'true');
    if (!showHours) params.append('hideHours', 'true');
    if (!showCtaButton) params.append('hideCta', 'true');
    return params;
  };

  const handleCopy = async () => {
    if (!business) return;

    const { width, height } = getDimensions();
    const params = getParams();
    const embedCode = `<iframe\n  src="${getClientSiteUrl()}/widget/${business.id}?${params.toString()}"\n  width="${width}"\n  height="${height}"\n  style="border:none; overflow:hidden;"\n  scrolling="no"\n  frameborder="0"\n  allowTransparency="true"\n  allow="encrypted-media"\n></iframe>`;

    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast({
        title: t('dashboardWidgetPage.toasts.copySuccessTitle', 'Success'),
        description: t('dashboardWidgetPage.toasts.copySuccessDesc', 'Code copied to clipboard!'),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: 'destructive',
        title: t('dashboardWidgetPage.toasts.errorTitle', 'Error'),
        description: t('dashboardWidgetPage.toasts.copyErrorDesc', 'Unable to copy the code.'),
      });
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
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboardWidgetPage.titleGeneric', 'Widget for your website')}</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!business) return null;

  const { width, height } = getDimensions();
  const params = getParams().toString();
  const siteUrl = getClientSiteUrl();
  const reactiveEmbedCode = `<iframe\n  src="${siteUrl}/widget/${business.id}?${params}"\n  width="${width}"\n  height="${height}"\n  style="border:none; overflow:hidden; border-radius:12px;"\n  scrolling="no"\n  frameborder="0"\n  allowTransparency="true"\n  allow="encrypted-media"\n></iframe>`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {tf('dashboardWidgetPage.titleWithBusiness', 'Widget for {name}', {
            name: business?.name || t('dashboardWidgetPage.defaultSiteName', 'your website'),
          })}
        </h1>
        <p className="text-muted-foreground">{t('dashboardWidgetPage.subtitle', 'Display your rating and reviews directly on your website to build trust.')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {t('dashboardWidgetPage.customization.title', 'Advanced customization')}
              </CardTitle>
              <CardDescription>{t('dashboardWidgetPage.customization.description', 'Configure your widget appearance according to your preferences.')}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>{t('dashboardWidgetPage.customization.sizeLabel', 'Widget size')}</Label>
                <RadioGroup value={size} onValueChange={(value: 'small' | 'medium' | 'large') => setSize(value)} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="small" id="size-small" />
                    <Label htmlFor="size-small" className="text-sm font-normal">{t('dashboardWidgetPage.customization.sizeSmall', 'Small')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="size-medium" />
                    <Label htmlFor="size-medium" className="text-sm font-normal">{t('dashboardWidgetPage.customization.sizeMedium', 'Medium')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="large" id="size-large" />
                    <Label htmlFor="size-large" className="text-sm font-normal">{t('dashboardWidgetPage.customization.sizeLarge', 'Large')}</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>{t('dashboardWidgetPage.customization.themeLabel', 'Theme')}</Label>
                <RadioGroup value={theme} onValueChange={(value: 'light' | 'dark') => setTheme(value)} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="theme-light" />
                    <Label htmlFor="theme-light" className="text-sm font-normal">{t('dashboardWidgetPage.customization.themeLight', 'Light')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="theme-dark" />
                    <Label htmlFor="theme-dark" className="text-sm font-normal">{t('dashboardWidgetPage.customization.themeDark', 'Dark')}</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>{t('dashboardWidgetPage.customization.displayOptions', 'Display options')}</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showName" checked={showBusinessName} onCheckedChange={(checked) => setShowBusinessName(checked === true)} />
                    <Label htmlFor="showName" className="text-sm font-normal">{t('dashboardWidgetPage.customization.showName', 'Show business name')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showCategory" checked={showCategory} onCheckedChange={(checked) => setShowCategory(checked === true)} />
                    <Label htmlFor="showCategory" className="text-sm font-normal">{t('dashboardWidgetPage.customization.showCategory', 'Show category')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showLocation" checked={showLocation} onCheckedChange={(checked) => setShowLocation(checked === true)} />
                    <Label htmlFor="showLocation" className="text-sm font-normal">{t('dashboardWidgetPage.customization.showLocation', 'Show location')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showRating" checked={showRating} onCheckedChange={(checked) => setShowRating(checked === true)} />
                    <Label htmlFor="showRating" className="text-sm font-normal">{t('dashboardWidgetPage.customization.showRating', 'Show rating')}</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>{t('dashboardWidgetPage.customization.extraOptions', 'Additional options')}</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showReviewsCount" checked={showReviewsCount} onCheckedChange={(checked) => setShowReviewsCount(checked === true)} />
                    <Label htmlFor="showReviewsCount" className="text-sm font-normal">{t('dashboardWidgetPage.customization.showReviewsCount', 'Show number of reviews')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showHours" checked={showHours} onCheckedChange={(checked) => setShowHours(checked === true)} />
                    <Label htmlFor="showHours" className="text-sm font-normal">{t('dashboardWidgetPage.customization.showHours', 'Show opening hours')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showCtaButton" checked={showCtaButton} onCheckedChange={(checked) => setShowCtaButton(checked === true)} />
                    <Label htmlFor="showCtaButton" className="text-sm font-normal">{t('dashboardWidgetPage.customization.showCta', 'Show "View reviews" button')}</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboardWidgetPage.embed.title', 'Copy code')}</CardTitle>
              <CardDescription>{t('dashboardWidgetPage.embed.description', 'Copy and paste this HTML code where you want the widget to appear on your website.')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="embedCode">{t('dashboardWidgetPage.embed.codeLabel', 'Embed code')}</Label>
                <div className="relative">
                  <Textarea id="embedCode" readOnly value={reactiveEmbedCode} className="h-48 font-mono text-xs bg-muted" />
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={handleCopy} title={t('dashboardWidgetPage.embed.copyButtonTitle', 'Copy code')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {copied && <p className="text-xs text-green-600">{t('dashboardWidgetPage.embed.copiedInline', 'Code copied successfully!')}</p>}
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">{t('dashboardWidgetPage.embed.footerHint', 'The widget is fully responsive and adapts to its container width. Height is fixed.')}</p>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>{t('dashboardWidgetPage.preview.title', 'Widget preview')}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center p-4 bg-muted/30 min-h-[300px]">
              <div className="transition-all duration-300 ease-in-out shadow-2xl rounded-xl overflow-hidden" style={{ width: `${width}px`, height: `${height}px` }}>
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
