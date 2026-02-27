'use client';

import { useFormStatus } from 'react-dom';
import { useActionState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { submitReview } from '@/app/actions/review';
import { reviewSchema, ReviewFormState, ReviewFormData } from '@/lib/types';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { StarRating } from '@/components/shared/StarRating';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Terminal } from 'lucide-react';
import { SubRatingInput } from '../shared/SubRatingInput';
import { useI18n } from '@/components/providers/i18n-provider';

type ReviewFormProps = {
  businessId: string;
  businessName: string;
};

function SubmitButton({ t }: { t: (key: string, fallback?: string) => string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? t('reviewForm.submitting', 'Soumission en cours...') : t('reviewForm.submit', 'Soumettre mon avis')}
    </Button>
  );
}

export function ReviewForm({ businessId }: ReviewFormProps) {
  const initialState: ReviewFormState = { status: 'idle', message: '' };
  const [state, formAction] = useActionState(submitReview, initialState);
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      businessId,
      title: '',
      text: '',
      rating: 0,
      isAnonymous: true,
      employmentStatus: 'current',
      tenureBand: '1_2y',
      contractType: 'cdi',
      workMode: 'onsite',
      roleSlug: '',
      departmentSlug: '',
      citySlug: '',
      subRatingWorkLifeBalance: 0,
      subRatingManagement: 0,
      subRatingCareerGrowth: 0,
      subRatingCulture: 0,
    },
  });

  useEffect(() => {
    if (state.status === 'error' && state.message && !state.errors) {
      toast({
        variant: 'destructive',
        title: t('reviewForm.submitErrorTitle', 'Erreur de soumission'),
        description: state.message || t('reviewForm.submitErrorDesc', 'Echec de la soumission de votre avis. Veuillez reessayer.'),
      });
    }

    if (state.status === 'success') {
      const isPublished = Boolean(state.data?.published);
      toast({
        title: isPublished ? t('reviewForm.publishedTitle', 'Avis publie') : t('reviewForm.submittedTitle', 'Avis soumis'),
        description: state.message || (isPublished ? t('reviewForm.publishedDesc', 'Merci ! Votre avis est maintenant visible.') : t('reviewForm.pendingDesc', 'Merci ! Votre avis est en cours de validation.')),
      });
      if (isPublished) {
        router.push(`/businesses/${businessId}`);
      } else {
        form.reset({
          businessId,
          title: '',
          text: '',
          rating: 0,
          isAnonymous: true,
          employmentStatus: 'current',
          tenureBand: '1_2y',
          contractType: 'cdi',
          workMode: 'onsite',
          roleSlug: '',
          departmentSlug: '',
          citySlug: '',
          subRatingWorkLifeBalance: 0,
          subRatingManagement: 0,
          subRatingCareerGrowth: 0,
          subRatingCulture: 0,
        });
      }
    }
  }, [state.status, state.message, state.errors, state.data, toast, router, businessId, form, t]);

  return (
    <Card className="w-full border border-border/50 shadow-none bg-card">
      <CardContent className="pt-6">
        <Form {...form}>
          <form action={formAction} className="space-y-5">
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="rating" value={form.watch('rating') || 0} />
            <input type="hidden" name="title" value={form.watch('title') || ''} />
            <input type="hidden" name="text" value={form.watch('text') || ''} />
            <input type="hidden" name="isAnonymous" value={form.watch('isAnonymous') ? 'true' : 'false'} />
            <input type="hidden" name="employmentStatus" value={form.watch('employmentStatus') || ''} />
            <input type="hidden" name="roleSlug" value={form.watch('roleSlug') || ''} />
            <input type="hidden" name="departmentSlug" value={form.watch('departmentSlug') || ''} />
            <input type="hidden" name="citySlug" value={form.watch('citySlug') || ''} />
            <input type="hidden" name="tenureBand" value={form.watch('tenureBand') || ''} />
            <input type="hidden" name="contractType" value={form.watch('contractType') || ''} />
            <input type="hidden" name="workMode" value={form.watch('workMode') || ''} />
            <input type="hidden" name="subRatingWorkLifeBalance" value={form.watch('subRatingWorkLifeBalance') || 0} />
            <input type="hidden" name="subRatingManagement" value={form.watch('subRatingManagement') || 0} />
            <input type="hidden" name="subRatingCareerGrowth" value={form.watch('subRatingCareerGrowth') || 0} />
            <input type="hidden" name="subRatingCulture" value={form.watch('subRatingCulture') || 0} />

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg border border-border/30 bg-muted/20">
                <FormField
                  control={form.control}
                  name="employmentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Statut</FormLabel>
                      <FormControl>
                        <select className="h-8 text-sm w-full rounded-md border border-input bg-background px-2" value={field.value || 'current'} onChange={(e) => field.onChange(e.target.value)}>
                          <option value="current">Employe actuel</option>
                          <option value="former">Ancien employe</option>
                          <option value="candidate">Candidat</option>
                        </select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tenureBand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Anciennete</FormLabel>
                      <FormControl>
                        <select className="h-8 text-sm w-full rounded-md border border-input bg-background px-2" value={field.value || '1_2y'} onChange={(e) => field.onChange(e.target.value)}>
                          <option value="lt_6m">Moins de 6 mois</option>
                          <option value="6_12m">6-12 mois</option>
                          <option value="1_2y">1-2 ans</option>
                          <option value="3_5y">3-5 ans</option>
                          <option value="gt_5y">Plus de 5 ans</option>
                        </select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contractType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Contrat</FormLabel>
                      <FormControl>
                        <select className="h-8 text-sm w-full rounded-md border border-input bg-background px-2" value={field.value || 'cdi'} onChange={(e) => field.onChange(e.target.value)}>
                          <option value="cdi">CDI</option>
                          <option value="cdd">CDD</option>
                          <option value="intern">Stage</option>
                          <option value="freelance">Freelance</option>
                          <option value="other">Autre</option>
                        </select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="workMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Mode de travail</FormLabel>
                      <FormControl>
                        <select className="h-8 text-sm w-full rounded-md border border-input bg-background px-2" value={field.value || 'onsite'} onChange={(e) => field.onChange(e.target.value)}>
                          <option value="onsite">Presentiel</option>
                          <option value="hybrid">Hybride</option>
                          <option value="remote">Remote</option>
                        </select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="roleSlug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Role (optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: software_engineer" className="h-8 text-sm" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="citySlug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Ville (optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: casablanca" className="h-8 text-sm" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-col items-center gap-3">
                      <FormLabel className="text-sm font-semibold">{t('reviewForm.globalRating', 'Note globale')}</FormLabel>
                      <FormControl>
                        <StarRating rating={field.value as number} onRatingChange={(value) => field.onChange(value)} size={36} />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <div className="bg-muted/30 border border-border/30 rounded-lg p-3">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3">{t('reviewForm.detailsOptional', 'Details (optionnel)')}</h3>
                <div className="space-y-2.5">
                  <SubRatingInput name="subRatingWorkLifeBalance" label={t('reviewForm.workLife', 'Equilibre travail-vie')} control={form.control} />
                  <SubRatingInput name="subRatingManagement" label={t('reviewForm.management', 'Management')} control={form.control} />
                  <SubRatingInput name="subRatingCareerGrowth" label={t('reviewForm.careerGrowth', 'Evolution de carriere')} control={form.control} />
                  <SubRatingInput name="subRatingCulture" label={t('reviewForm.culture', 'Culture')} control={form.control} />
                </div>
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t('reviewForm.titleLabel', 'Titre')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('reviewForm.titlePlaceholder', 'Ex: Excellent service')} className="h-8 text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t('reviewForm.reviewLabel', 'Votre avis')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('reviewForm.reviewPlaceholder', "Qu'avez-vous apprecie ? Que pourrait-on ameliorer ?")}
                        className="min-h-[100px] text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isAnonymous"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/50 p-3 bg-muted/20 space-y-0">
                    <div className="space-y-0.5 flex-1">
                      <FormLabel className="text-xs font-medium">{field.value ? t('reviewForm.anonymous', 'Anonyme') : t('reviewForm.public', 'Public')}</FormLabel>
                      <FormDescription className="text-xs">
                        {field.value
                          ? t('reviewForm.anonymousDesc', 'Votre nom ne sera pas affiche (recommande pour proteger votre anonymat)')
                          : t('reviewForm.publicDesc', 'Votre nom sera affiche')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={(checked) => field.onChange(checked)} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {state.status === 'error' && state.message && !state.errors && (
              <Alert variant="destructive" className="text-xs">
                <Terminal className="h-3.5 w-3.5" />
                <AlertTitle>{t('common.error', 'Erreur')}</AlertTitle>
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}

            <SubmitButton t={t} />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
