'use client';

import { useFormStatus } from 'react-dom';
import { useActionState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { submitReview } from '@/app/actions/review';
import { reviewSchema, ReviewFormState, ReviewFormData, Business } from '@/lib/types';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { StarRating } from '@/components/shared/StarRating';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Terminal, Eye, EyeOff } from 'lucide-react';
import { SubRatingInput } from '../shared/SubRatingInput';

type ReviewFormProps = {
  businessId: string;
  businessName: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? 'Soumission en cours...' : 'Soumettre mon avis'}
    </Button>
  );
}

export function ReviewForm({ businessId, businessName }: ReviewFormProps) {
  const initialState: ReviewFormState = { status: 'idle', message: '' };
  const [state, formAction] = useActionState(submitReview, initialState);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      businessId,
      title: '',
      text: '',
      rating: 0,
      isAnonymous: true,
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
        title: 'Erreur de soumission',
        description: state.message || 'Échec de la soumission de votre avis. Veuillez réessayer.',
      });
    }

    if (state.status === 'success') {
      const isPublished = Boolean(state.data?.published);
      toast({
        title: isPublished ? 'Avis publié !' : 'Avis soumis !',
        description: state.message || (isPublished
          ? 'Merci ! Votre avis est maintenant visible.'
          : 'Merci ! Votre avis est en cours de validation.'),
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
          subRatingWorkLifeBalance: 0,
          subRatingManagement: 0,
          subRatingCareerGrowth: 0,
          subRatingCulture: 0,
        });
      }
    }
  }, [state.status, state.message, state.errors, state.data, toast, router, businessId, form]);

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
            <input type="hidden" name="subRatingWorkLifeBalance" value={form.watch('subRatingWorkLifeBalance') || 0} />
            <input type="hidden" name="subRatingManagement" value={form.watch('subRatingManagement') || 0} />
            <input type="hidden" name="subRatingCareerGrowth" value={form.watch('subRatingCareerGrowth') || 0} />
            <input type="hidden" name="subRatingCulture" value={form.watch('subRatingCulture') || 0} />

            <div className="space-y-5">
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-col items-center gap-3">
                      <FormLabel className="text-sm font-semibold">Note globale</FormLabel>
                      <FormControl>
                        <StarRating rating={field.value as number} onRatingChange={(value) => field.onChange(value)} size={36} />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <div className="bg-muted/30 border border-border/30 rounded-lg p-3">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3">Détails (optionnel)</h3>
                <div className="space-y-2.5">
                  <SubRatingInput name="subRatingWorkLifeBalance" label="Équilibre travail-vie" control={form.control} />
                  <SubRatingInput name="subRatingManagement" label="Management" control={form.control} />
                  <SubRatingInput name="subRatingCareerGrowth" label="Évolution de carrière" control={form.control} />
                  <SubRatingInput name="subRatingCulture" label="Culture" control={form.control} />
                </div>
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Titre</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Excellent service" className="h-8 text-sm" {...field} />
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
                    <FormLabel className="text-xs">Votre avis</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Qu'avez-vous apprécié ? Que pourrait-on améliorer ?"
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
                      <FormLabel className="text-xs font-medium">
                        {field.value ? 'Anonyme' : 'Public'}
                      </FormLabel>
                      <FormDescription className="text-xs">
                        {field.value ? 'Votre nom ne sera pas affiché (recommandé pour protéger votre anonymat)' : 'Votre nom sera affiché'}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {state.status === 'error' && state.message && !state.errors && (
              <Alert variant="destructive" className="text-xs">
                <Terminal className="h-3.5 w-3.5" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}

            <SubmitButton />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
