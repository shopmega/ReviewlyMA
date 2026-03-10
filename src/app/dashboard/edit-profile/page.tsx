'use client';

import { useState, useEffect, useActionState, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';
import { Zap, MessageCircle, ExternalLink, Loader2, AlertCircle, Upload, X, Plus, Image as ImageIcon } from 'lucide-react';
import { BusinessHoursEditor, type DayHoursData } from '@/components/shared/BusinessHoursEditor';
import { saveBusinessHours, getBusinessHours, updateBusinessProfile, updateBusinessImagesAction, type BusinessActionState } from '@/app/actions/business';
import { ALL_CITIES, SUBCATEGORIES, getQuartiersForCity, BENEFITS, MAIN_CATEGORIES } from '@/lib/location-discovery';
import { TagInput } from '@/components/shared/TagInput';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { businessProfileUpdateSchema, type BusinessProfileUpdateData } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { getStoragePublicUrl, parsePostgresArray } from '@/lib/data';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { isPaidTier } from '@/lib/tier-utils';
import { useI18n } from '@/components/providers/i18n-provider';

type BusinessData = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  location: string;
  website: string | null;
  amenities: string[] | null;
};

type AmenityGroup = {
  group: string;
  amenities: string[];
};

const normalizeAmenityGroups = (value: unknown, fallbackGroupLabel = 'Services'): AmenityGroup[] => {
  if (!Array.isArray(value)) return [];

  const grouped = value.filter((item): item is AmenityGroup => {
    return (
      !!item &&
      typeof item === 'object' &&
      'group' in item &&
      'amenities' in item &&
      typeof (item as AmenityGroup).group === 'string' &&
      Array.isArray((item as AmenityGroup).amenities)
    );
  });
  if (grouped.length > 0) return grouped;

  const flatAmenities = value.filter((item): item is string => typeof item === 'string');
  if (flatAmenities.length === 0) return [];
  return [{ group: fallbackGroupLabel, amenities: flatAmenities }];
};

const normalizeAmenitiesValue = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  const parsed = parsePostgresArray(value);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
};

function FormSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function EditProfilePage() {
  const { toast } = useToast();
  const { t, tf } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /* businessId comes from hook now */
  const [isPending, startTransition] = useTransition();

  const initialState: BusinessActionState = { status: 'idle', message: '' };
  const [state, formAction] = useActionState(updateBusinessProfile, initialState);

  const form = useForm<BusinessProfileUpdateData>({
    resolver: zodResolver(businessProfileUpdateSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      subcategory: '',
      city: '',
      quartier: '',
      location: '',
      website: '',
      amenities: [],
      whatsapp_number: '',
      affiliate_link: '',
      affiliate_cta: '',
      tags: [],
    },
  });

  // Image state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  // Business hours state
  const [businessHours, setBusinessHours] = useState<DayHoursData[]>([]);
  const [savingHours, setSavingHours] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null); // 'logo' | 'cover' | 'gallery' | null

  /* Refactored to use central hook */
  const { businessId, profile, loading: profileLoading, error: profileError } = useBusinessProfile();

  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  const [availableSubcategories, setAvailableSubcategories] = useState<string[]>([]);
  const [amenitiesList, setAmenitiesList] = useState<AmenityGroup[]>([]);

  // Fetch categories and amenities on mount
  useEffect(() => {
    async function loadData() {
      const { getAllCategories, getAmenities } = await import('@/lib/data/businesses');
      const [cats, amens] = await Promise.all([
        getAllCategories(),
        getAmenities()
      ]);
      setCategories(cats.map((c: string) => ({ id: c, name: c })));

      // Always expose the full default catalog in dashboard, then append custom DB amenities.
      const defaultGroups = normalizeAmenityGroups(
        BENEFITS,
        t('dashboardEditProfilePage.business.defaultServicesGroup', 'Services')
      );
      const defaultAmenities = new Set(defaultGroups.flatMap((group) => group.amenities));
      const discoveredAmenities = Array.isArray(amens)
        ? amens.filter((item): item is string => typeof item === 'string')
        : [];
      const customAmenities = discoveredAmenities
        .map((item) => item.trim())
        .filter((item) => item.length > 0 && !defaultAmenities.has(item));

      if (customAmenities.length > 0) {
        setAmenitiesList([
          ...defaultGroups,
          {
            group: t('dashboardEditProfilePage.business.customServicesGroup', 'Other services'),
            amenities: Array.from(new Set(customAmenities)).sort(),
          },
        ]);
      } else {
        setAmenitiesList(defaultGroups);
      }
    }
    loadData();
  }, [t]);

  // Update subcategories when category changes
  useEffect(() => {
    const category = form.watch('category');
    if (!category) {
      setAvailableSubcategories([]);
      return;
    }

    async function loadSubcategories() {
      const { getSubcategoriesByCategory } = await import('@/lib/data/businesses');
      const subs = await getSubcategoriesByCategory(category);
      setAvailableSubcategories(subs);
    }
    loadSubcategories();
  }, [form.watch('category')]);

  // Reset form when businessId changes
  useEffect(() => {
    if (profileLoading || !businessId) return;

    async function fetchBusinessData() {
      setLoading(true);
      const supabase = createClient();

      // Fetch business info
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (businessError || !business) {
        setError(t('dashboardEditProfilePage.errors.businessNotFound', 'Business not found.'));
        setLoading(false);
        return;
      }

      // Populate form
      form.reset({
        name: business.name || '',
        description: business.description || '',
        category: business.category || '',
        subcategory: business.subcategory || '',
        city: business.city || '',
        quartier: business.quartier || '',
        location: business.location || '',
        website: business.website || '',
        amenities: normalizeAmenitiesValue(business.amenities),
        whatsapp_number: business.whatsapp_number || '',
        affiliate_link: business.affiliate_link || '',
        affiliate_cta: business.affiliate_cta || '',
        tags: parsePostgresArray(business.tags) || [],
      });

      setLogoUrl(business.logo_url || null);
      setCoverUrl(business.cover_url || null);
      setGalleryUrls(parsePostgresArray(business.gallery_urls));

      // Fetch business hours
      const hoursData = await getBusinessHours(businessId as string);
      if (hoursData && Array.isArray(hoursData)) {
        setBusinessHours(hoursData);
      }

      setLoading(false);
    }

    fetchBusinessData();
  }, [businessId, profileLoading, form, t]);

  useEffect(() => {
    if (state.status === 'success') {
      toast({
        title: t('dashboardEditProfilePage.success.savedChangesTitle', 'Changes saved'),
        description: state.message,
      });
    } else if (state.status === 'error') {
      if (state.errors) {
        Object.entries(state.errors).forEach(([key, messages]) => {
          const fieldMessages = messages as string[] | undefined;
          if (fieldMessages && fieldMessages.length > 0) {
            form.setError(key as keyof BusinessProfileUpdateData, {
              type: 'server',
              message: fieldMessages[0],
            });
          }
        });
      }
      toast({
        title: t('dashboardEditProfilePage.errors.genericTitle', 'Error'),
        description: state.message,
        variant: 'destructive',
      });
    }
  }, [state, toast, form, t]);

  const onSubmit = (data: BusinessProfileUpdateData) => {
    if (!businessId) {
      toast({
        title: t('dashboardEditProfilePage.errors.genericTitle', 'Error'),
        description: t('dashboardEditProfilePage.errors.missingBusinessId', 'Missing business ID'),
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();

    // CRITICAL: Add the business ID being edited
    formData.append('businessId', businessId);

    Object.entries(data).forEach(([key, value]) => {
      // Preserve array fields for server validation.
      if (key === 'amenities' || key === 'tags') {
        const arrayValue = Array.isArray(value) ? value : [];
        formData.append(key, JSON.stringify(arrayValue));
      } else if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

    startTransition(() => {
      formAction(formData);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover' | 'gallery') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!businessId) {
      toast({
        title: t('dashboardEditProfilePage.errors.genericTitle', 'Error'),
        description: t(
          'dashboardEditProfilePage.errors.missingBusinessIdRefresh',
          'Missing business ID. Please refresh the page.'
        ),
        variant: 'destructive',
      });
      return;
    }

    // Type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: t('dashboardEditProfilePage.errors.unsupportedFormatTitle', 'Unsupported format'),
        description: t(
          'dashboardEditProfilePage.errors.unsupportedFormatDescription',
          'Please use JPG, PNG, WEBP, AVIF, or GIF.'
        ),
        variant: 'destructive',
      });
      return;
    }

    // Limit size: 10MB (aligned with storage bucket limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: t('dashboardEditProfilePage.errors.fileTooLargeTitle', 'File too large'),
        description: tf(
          'dashboardEditProfilePage.errors.fileTooLargeDescription',
          'Maximum size is {sizeMB}MB.',
          { sizeMB: String(maxSize / (1024 * 1024)) }
        ),
        variant: 'destructive',
      });
      return;
    }

    // Extra: Validation rules (e.g. min dimensions for cover)
    if (type === 'cover') {
      const isValidCover = await new Promise<boolean>((resolve) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
          const valid = img.width >= 400 && img.height >= 200;
          if (!valid) {
            toast({
              title: t('dashboardEditProfilePage.errors.imageTooSmallTitle', 'Image too small'),
              description: t(
                'dashboardEditProfilePage.errors.imageTooSmallDescription',
                'Cover image must be at least 400x200 pixels (1200x400 recommended).'
              ),
              variant: 'destructive',
            });
          }
          URL.revokeObjectURL(objectUrl);
          resolve(valid);
        };

        img.onerror = () => {
          toast({
            title: t('dashboardEditProfilePage.errors.invalidImageTitle', 'Invalid image'),
            description: t(
              'dashboardEditProfilePage.errors.invalidImageDescription',
              'Unable to read image file. The file may be corrupted.'
            ),
            variant: 'destructive',
          });
          URL.revokeObjectURL(objectUrl);
          resolve(false);
        };

        img.src = objectUrl;
      });

      if (!isValidCover) {
        setIsUploading(null);
        e.target.value = '';
        return;
      }
    }

    setIsUploading(type);
    const supabase = createClient();

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `businesses/${businessId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      if (type === 'logo') {
        const result = await updateBusinessImagesAction(businessId, { logo_url: filePath });
        if (result.status !== 'success') throw new Error(result.message);
        setLogoUrl(filePath);
      } else if (type === 'cover') {
        const result = await updateBusinessImagesAction(businessId, { cover_url: filePath });
        if (result.status !== 'success') throw new Error(result.message);
        setCoverUrl(filePath);
      } else if (type === 'gallery') {
        const newGallery = [...galleryUrls, filePath];
        const result = await updateBusinessImagesAction(businessId, { gallery_urls: newGallery });
        if (result.status !== 'success') throw new Error(result.message);
        setGalleryUrls(newGallery);
      }

      toast({
        title: t('dashboardEditProfilePage.success.imageUploadedTitle', 'Image uploaded'),
        description: t(
          'dashboardEditProfilePage.success.imageUploadedDescription',
          'The image was updated successfully.'
        ),
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: t('dashboardEditProfilePage.errors.genericTitle', 'Error'),
        description: error.message || t('dashboardEditProfilePage.errors.uploadFailed', 'Unable to upload image.'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(null);
      e.target.value = '';
    }
  };

  const handleRemoveImage = async (type: 'logo' | 'cover' | 'gallery', url?: string) => {
    if (!businessId) return;

    try {
      if (type === 'logo') {
        const result = await updateBusinessImagesAction(businessId, { logo_url: null });
        if (result.status !== 'success') throw new Error(result.message);
        setLogoUrl(null);
      } else if (type === 'cover') {
        const result = await updateBusinessImagesAction(businessId, { cover_url: null });
        if (result.status !== 'success') throw new Error(result.message);
        setCoverUrl(null);
      } else if (type === 'gallery' && url) {
        const newGallery = galleryUrls.filter(u => u !== url);
        const result = await updateBusinessImagesAction(businessId, { gallery_urls: newGallery });
        if (result.status !== 'success') throw new Error(result.message);
        setGalleryUrls(newGallery);
      }

      toast({
        title: t('dashboardEditProfilePage.success.imageRemovedTitle', 'Image removed'),
        description: t(
          'dashboardEditProfilePage.success.imageRemovedDescription',
          'The image was removed successfully.'
        ),
      });
    } catch (error: any) {
      console.error('Error removing image:', error);
      toast({
        title: t('dashboardEditProfilePage.errors.genericTitle', 'Error'),
        description: error.message || t('dashboardEditProfilePage.errors.removeFailed', 'Unable to remove image.'),
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <FormSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('dashboardEditProfilePage.errorState.title', 'Edit profile')}
          </h1>
        </div>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 flex items-center gap-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">
                {t('dashboardEditProfilePage.errorState.accessDenied', 'Access denied')}
              </h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
        <Button asChild>
          <Link href="/pour-les-pros">
            {t('dashboardEditProfilePage.errorState.claimBusiness', 'Claim a business')}
          </Link>
        </Button>
      </div>
    );
  }

  const businessNameForTitle = form.watch('name') || t('dashboardEditProfilePage.header.fallbackTitleName', 'your business');
  const businessNameForSubtitle = form.watch('name') || t('dashboardEditProfilePage.header.fallbackSubtitleName', 'your business');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {tf('dashboardEditProfilePage.header.title', 'Manage {name}', { name: businessNameForTitle })}
            </h1>
            <p className="text-muted-foreground">
              {tf(
                'dashboardEditProfilePage.header.subtitle',
                'Update information for {name}.',
                { name: businessNameForSubtitle }
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard">{t('dashboardEditProfilePage.header.back', 'Back')}</Link>
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('dashboardEditProfilePage.header.save', 'Save')}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="general">{t('dashboardEditProfilePage.tabs.general', 'General')}</TabsTrigger>
            <TabsTrigger value="media">{t('dashboardEditProfilePage.tabs.media', 'Photos')}</TabsTrigger>
            <TabsTrigger value="business">{t('dashboardEditProfilePage.tabs.business', 'Services')}</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboardEditProfilePage.general.title', 'General information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('dashboardEditProfilePage.general.nameLabel', 'Business name')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('dashboardEditProfilePage.general.descriptionLabel', 'Description')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ''} rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('dashboardEditProfilePage.general.categoryLabel', 'Category')}</FormLabel>
                        <Select value={field.value} onValueChange={(val) => { field.onChange(val); form.setValue('subcategory', ''); }}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('dashboardEditProfilePage.general.categoryPlaceholder', 'Select a category')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subcategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('dashboardEditProfilePage.general.subcategoryLabel', 'Subcategory')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={!form.watch('category') || availableSubcategories.length === 0}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('dashboardEditProfilePage.general.subcategoryPlaceholder', 'Select a subcategory')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableSubcategories.map((sub) => (
                              <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('dashboardEditProfilePage.general.cityLabel', 'City')}</FormLabel>
                        <Select value={field.value} onValueChange={(val) => { field.onChange(val); form.setValue('quartier', ''); }}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('dashboardEditProfilePage.general.cityPlaceholder', 'Select a city')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ALL_CITIES.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quartier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('dashboardEditProfilePage.general.quartierLabel', 'District')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={!form.watch('city') || getQuartiersForCity(form.watch('city')).length === 0}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('dashboardEditProfilePage.general.quartierPlaceholder', 'Select a district')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {form.watch('city') && getQuartiersForCity(form.watch('city')).map((q) => (
                              <SelectItem key={q} value={q}>{q}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('dashboardEditProfilePage.general.locationLabel', 'Full address')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('dashboardEditProfilePage.general.locationPlaceholder', 'Street, number, etc.')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('dashboardEditProfilePage.general.websiteLabel', 'Website')}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder={t('dashboardEditProfilePage.general.websitePlaceholder', 'www.example.com')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator className="my-6" />
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-amber-600 flex items-center gap-2">
                      <Zap className="w-4 h-4 fill-current" />
                      {t('dashboardEditProfilePage.pro.title', 'Business PRO options')}
                    </h3>
                    {!isPaidTier(profile?.tier) && (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 uppercase tracking-tighter">
                        {t('dashboardEditProfilePage.pro.badgeRequired', 'PRO plan required')}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="whatsapp_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MessageCircle className="w-3.5 h-3.5" />
                            {t('dashboardEditProfilePage.pro.whatsappLabel', 'WhatsApp number')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t('dashboardEditProfilePage.pro.whatsappPlaceholder', 'Ex: 212 600000000')}
                              disabled={!isPaidTier(profile?.tier)}
                            />
                          </FormControl>
                          <FormDescription className="text-[11px]">
                            {isPaidTier(profile?.tier)
                              ? t(
                                'dashboardEditProfilePage.pro.whatsappDescriptionEnabled',
                                'Displays a direct contact button on your profile.'
                              )
                              : t(
                                'dashboardEditProfilePage.pro.whatsappDescriptionDisabled',
                                'Unlock direct WhatsApp contact with a PRO plan.'
                              )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="affiliate_link"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <ExternalLink className="w-3.5 h-3.5" />
                            {t('dashboardEditProfilePage.pro.affiliateLabel', 'Booking / affiliate link')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t('dashboardEditProfilePage.pro.affiliatePlaceholder', 'Ex: https://booking.com/...')}
                              disabled={!isPaidTier(profile?.tier)}
                            />
                          </FormControl>
                          <FormDescription className="text-[11px]">
                            {isPaidTier(profile?.tier)
                              ? t(
                                'dashboardEditProfilePage.pro.affiliateDescriptionEnabled',
                                'Direct link to your booking engine (Booking, etc.).'
                              )
                              : t(
                                'dashboardEditProfilePage.pro.affiliateDescriptionDisabled',
                                'Redirect customers to your booking engine with a PRO plan.'
                              )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="affiliate_cta"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel className="text-xs">
                          {t('dashboardEditProfilePage.pro.ctaLabel', 'Button text (optional)')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t('dashboardEditProfilePage.pro.ctaPlaceholder', 'Ex: Book on Booking')}
                            disabled={!isPaidTier(profile?.tier)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator className="my-6" />

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <TagInput
                          label={t('dashboardEditProfilePage.pro.tagsLabel', 'Search keywords (tags)')}
                          tags={field.value || []}
                          onTagsChange={field.onChange}
                          disabled={!isPaidTier(profile?.tier)}
                          maxTags={10}
                        />
                        <FormDescription className="text-[11px]">
                          {isPaidTier(profile?.tier)
                            ? t(
                              'dashboardEditProfilePage.pro.tagsDescriptionEnabled',
                              'Add up to 10 keywords to help customers find you (e.g. Terrace, Halal, Brunch).'
                            )
                            : t(
                              'dashboardEditProfilePage.pro.tagsDescriptionDisabled',
                              'The PRO plan allows custom search keywords.'
                            )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboardEditProfilePage.media.title', 'Media & images')}</CardTitle>
                <CardDescription>
                  {t('dashboardEditProfilePage.media.description', 'Manage your business photos.')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo Upload */}
                  <div className="space-y-3">
                    <Label>{t('dashboardEditProfilePage.media.logoLabel', 'Business logo')}</Label>
                    <div className="flex items-center gap-4">
                      <div className="relative w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted overflow-hidden group">
                        {logoUrl ? (
                          <>
                            <img
                              src={getStoragePublicUrl(logoUrl) || ''}
                              alt={t('dashboardEditProfilePage.media.logoAlt', 'Business logo')}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage('logo')}
                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="text-white h-6 w-6" />
                            </button>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 rounded text-sm font-bold">
                            {form.watch('name') && form.watch('name').split(' ').length > 1
                              ? (form.watch('name').split(' ')[0][0] + form.watch('name').split(' ')[1][0]).toUpperCase()
                              : form.watch('name')
                                ? form.watch('name')[0].toUpperCase()
                                : t('dashboardEditProfilePage.media.businessInitial', 'B')}
                          </div>
                        )}
                        {isUploading === 'logo' && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="relative overflow-hidden"
                          disabled={!!isUploading}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {t('dashboardEditProfilePage.media.chooseLogo', 'Choose a logo')}
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'logo')}
                          />
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          {t('dashboardEditProfilePage.media.logoHint', 'Square format recommended (PNG, JPG, max 5MB)')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cover Upload */}
                  <div className="space-y-3">
                    <Label>{t('dashboardEditProfilePage.media.coverLabel', 'Cover photo')}</Label>
                    <div className="space-y-3">
                      <div className="relative w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted overflow-hidden group">
                        {coverUrl ? (
                          <>
                            <img
                              src={getStoragePublicUrl(coverUrl) || ''}
                              alt={t('dashboardEditProfilePage.media.coverAlt', 'Cover image')}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage('cover')}
                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="text-white h-6 w-6" />
                            </button>
                          </>
                        ) : (
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        )}
                        {isUploading === 'cover' && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full relative overflow-hidden"
                        disabled={!!isUploading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {t('dashboardEditProfilePage.media.changeCover', 'Change cover')}
                        <input
                          type="file"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'cover')}
                        />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Gallery Upload */}
                <div className="space-y-4 border-t pt-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      {t('dashboardEditProfilePage.media.galleryLabel', 'Photo gallery')}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {tf('dashboardEditProfilePage.media.galleryCount', '{count}/10 photos', { count: String(galleryUrls.length) })}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {galleryUrls.map((url, index) => (
                      <div key={index} className="relative aspect-square border rounded-lg overflow-hidden group">
                        <img
                          src={getStoragePublicUrl(url) || ''}
                          alt={tf('dashboardEditProfilePage.media.galleryAlt', 'Gallery image {index}', {
                            index: String(index + 1),
                          })}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage('gallery', url)}
                          className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="text-white h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {galleryUrls.length < 10 && (
                      <label className={`aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors ${isUploading === 'gallery' ? 'opacity-50 pointer-events-none' : ''}`}>
                        {isUploading === 'gallery' ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-6 w-6 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground">
                              {t('dashboardEditProfilePage.media.add', 'Add')}
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'gallery')}
                          disabled={isUploading === 'gallery'}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('dashboardEditProfilePage.media.galleryHint', 'High-quality photos of your venue (max 10MB per image)')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="business" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboardEditProfilePage.business.title', 'Amenities & services')}</CardTitle>
                <CardDescription>
                  {t('dashboardEditProfilePage.business.description', 'Select available amenities.')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="amenities"
                  render={({ field }) => (
                    <div className="space-y-4">
                      {amenitiesList.map((group) => (
                        <div key={group.group}>
                          <p className="text-sm font-semibold text-muted-foreground mb-2">{group.group}</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 ml-2">
                            {group.amenities.map((amenity: string) => (
                              <FormItem key={amenity} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={Array.isArray(field.value) && field.value.includes(amenity)}
                                    onCheckedChange={(checked) => {
                                      const safeValue = Array.isArray(field.value) ? field.value : [];
                                      const updatedValue = checked
                                        ? [...safeValue, amenity]
                                        : safeValue.filter((val) => val !== amenity);
                                      field.onChange(updatedValue);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {amenity}
                                </FormLabel>
                              </FormItem>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            {businessId && (
              <BusinessHoursEditor
                businessId={businessId}
                initialHours={businessHours}
                onSave={async (hours) => {
                  setSavingHours(true);
                  const result = await saveBusinessHours(hours, businessId);
                  setSavingHours(false);
                  if (result.status === 'error') {
                    throw new Error(result.message);
                  }
                  setBusinessHours(hours);
                }}
                isSaving={savingHours}
              />
            )}
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}
