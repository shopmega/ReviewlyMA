'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AlertCircle, CornerDownRight, Loader2, MessageSquare, Percent } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/shared/StarRating';
import { VoteButtons } from '@/components/shared/VoteButtons';
import { ReviewReportDialog } from '@/components/shared/ReviewReportDialog';
import { useToast } from '@/hooks/use-toast';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { createClient } from '@/lib/supabase/client';
import { getAuthorDisplayName } from '@/lib/utils/anonymous-reviews';
import { useI18n } from '@/components/providers/i18n-provider';

type Review = {
  id: number;
  rating: number;
  title: string | null;
  content: string | null;
  author_name: string;
  is_anonymous?: boolean;
  user_id?: string;
  date: string;
  likes: number;
  dislikes: number;
  owner_reply: string | null;
  owner_reply_date: string | null;
};

type Business = {
  id: string;
  name: string;
};

function ReviewCardSkeleton() {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
    </Card>
  );
}

export default function ReviewsPage() {
  const { businessId, loading: profileLoading, error: profileError } = useBusinessProfile();
  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'rating' | 'helpful'>('newest');
  const [replyFilter, setReplyFilter] = useState<'all' | 'pending' | 'replied'>('all');
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const { toast } = useToast();
  const { t, tf, locale } = useI18n();

  const dateLocale = locale === 'fr' ? 'fr-FR' : locale === 'ar' ? 'ar-MA' : 'en-US';

  const sortedReviews = useMemo(() => {
    if (!reviews.length) return [];
    const sorted = [...reviews];
    switch (sortOption) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'helpful':
        return sorted.sort((a, b) => b.likes - b.dislikes - (a.likes - a.dislikes));
      default:
        return sorted;
    }
  }, [reviews, sortOption]);

  const filteredReviews = useMemo(() => {
    if (replyFilter === 'pending') return sortedReviews.filter((review) => !review.owner_reply);
    if (replyFilter === 'replied') return sortedReviews.filter((review) => Boolean(review.owner_reply));
    return sortedReviews;
  }, [sortedReviews, replyFilter]);

  useEffect(() => {
    if (profileLoading || !businessId) return;
    if (profileError) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      const supabase = createClient();

      const { data: businessData, error: businessError } = await supabase.from('businesses').select('id, name').eq('id', businessId).single();

      if (businessError || !businessData) {
        setLoading(false);
        return;
      }

      setBusiness(businessData);

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('id, rating, title, content, author_name, is_anonymous, user_id, date, likes, dislikes, owner_reply, owner_reply_date')
        .eq('business_id', businessId)
        .order('date', { ascending: false });

      setReviews(reviewsData || []);
      setLoading(false);
    }

    fetchData();
  }, [businessId, profileLoading, profileError]);

  const handleReplySubmit = async (reviewId: number) => {
    if (!replyText.trim()) return;
    const supabase = createClient();

    const { error } = await supabase
      .from('reviews')
      .update({
        owner_reply: replyText.trim(),
        owner_reply_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', reviewId);

    if (error) {
      toast({
        title: t('dashboardReviewsPage.errorTitle', 'Error'),
        description: t('dashboardReviewsPage.replyError', 'Unable to send reply.'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('dashboardReviewsPage.replySentTitle', 'Reply sent'),
        description: t('dashboardReviewsPage.replySentDesc', 'Your reply is now visible on your page.'),
      });
      setReviews((prev) =>
        prev.map((review) => (review.id === reviewId ? { ...review, owner_reply: replyText.trim(), owner_reply_date: new Date().toISOString().split('T')[0] } : review))
      );
      setReplyingTo(null);
      setReplyText('');
    }
  };

  const totalReviews = reviews.length;
  const repliedReviews = reviews.filter((review) => Boolean(review.owner_reply)).length;
  const pendingReviews = totalReviews - repliedReviews;
  const responseRate = totalReviews > 0 ? Math.round((repliedReviews / totalReviews) * 100) : 0;

  if (profileLoading || loading) {
    return (
      <div className="space-y-6">{Array.from({ length: 3 }).map((_, index) => <ReviewCardSkeleton key={index} />)}</div>
    );
  }

  if (profileError || !business) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
        <div className="rounded-full bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold font-headline">{t('dashboardReviewsPage.accessDenied', 'Access denied')}</h1>
        <p className="text-muted-foreground">{profileError || t('dashboardReviewsPage.unknownError', 'Unknown error')}</p>
        <Button asChild>
          <Link href="/pour-les-pros">{t('dashboardReviewsPage.claimBusiness', 'Claim a business')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <section>
        <h1 className="text-3xl font-bold tracking-tight font-headline">{t('dashboardReviewsPage.pageTitle', 'Review management')}</h1>
        <p className="text-lg text-muted-foreground">
          {tf('dashboardReviewsPage.pageSubtitle', 'View and reply to reviews for {name}.', { name: business.name })}
        </p>
        {totalReviews > 0 && (
          <Card className="mt-6 border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-sky-500/5">
            <CardContent className="p-4 md:p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{t('dashboardReviewsPage.totalReviews', 'Total reviews')}</p>
                  <p className="text-xl font-bold">{totalReviews}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{t('dashboardReviewsPage.pendingReviews', 'Pending reviews')}</p>
                  <p className="text-xl font-bold">{pendingReviews}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Percent className="h-3.5 w-3.5 text-primary" />
                    {t('dashboardReviewsPage.responseRate', 'Response rate')}
                  </p>
                  <p className="text-xl font-bold text-primary">{responseRate}%</p>
                </div>
              </div>
              {pendingReviews > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{t('dashboardReviewsPage.priorityHint', 'Priority: respond to pending reviews to strengthen trust.')}</p>
                  <Button size="sm" variant="outline" onClick={() => setReplyFilter('pending')}>
                    {t('dashboardReviewsPage.viewPending', 'View pending reviews')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-6">
        {totalReviews > 0 && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="text-xl font-bold">{tf('dashboardReviewsPage.reviewsCount', 'Reviews ({count})', { count: filteredReviews.length })}</h3>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex rounded-lg border border-border/60 p-1">
                <Button type="button" size="sm" variant={replyFilter === 'all' ? 'default' : 'ghost'} className="h-8" onClick={() => setReplyFilter('all')}>
                  {t('dashboardReviewsPage.filter.all', 'All')}
                </Button>
                <Button type="button" size="sm" variant={replyFilter === 'pending' ? 'default' : 'ghost'} className="h-8" onClick={() => setReplyFilter('pending')}>
                  {t('dashboardReviewsPage.filter.pending', 'Pending')}
                </Button>
                <Button type="button" size="sm" variant={replyFilter === 'replied' ? 'default' : 'ghost'} className="h-8" onClick={() => setReplyFilter('replied')}>
                  {t('dashboardReviewsPage.filter.replied', 'Replied')}
                </Button>
              </div>

              <Select value={sortOption} onValueChange={(value: any) => setSortOption(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t('dashboardReviewsPage.sort.newest', 'Newest')}</SelectItem>
                  <SelectItem value="oldest">{t('dashboardReviewsPage.sort.oldest', 'Oldest')}</SelectItem>
                  <SelectItem value="rating">{t('dashboardReviewsPage.sort.rating', 'Best rating')}</SelectItem>
                  <SelectItem value="helpful">{t('dashboardReviewsPage.sort.helpful', 'Most helpful')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {totalReviews === 0 ? (
          <Card className="border-dashed bg-card/40 p-12 text-center">
            <div className="mb-4 inline-flex rounded-full bg-muted p-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="mb-2 font-headline text-xl">{t('dashboardReviewsPage.emptyTitle', 'No reviews yet')}</CardTitle>
            <CardDescription>{t('dashboardReviewsPage.emptyDesc', 'Your customer reviews will appear here.')}</CardDescription>
          </Card>
        ) : filteredReviews.length === 0 ? (
          <Card className="border-dashed bg-card/40 p-10 text-center">
            <CardTitle className="mb-2 font-headline text-lg">{t('dashboardReviewsPage.noFilterResult', 'No result for this filter')}</CardTitle>
            <CardDescription className="mb-4">{t('dashboardReviewsPage.noFilterResultDesc', 'Change filter to display other reviews.')}</CardDescription>
            <Button variant="outline" onClick={() => setReplyFilter('all')}>
              {t('dashboardReviewsPage.backAll', 'Back to all reviews')}
            </Button>
          </Card>
        ) : (
          filteredReviews.map((review) => (
            <Card key={review.id} className="border-border/60 bg-card/70 backdrop-blur-sm shadow-sm">
              <CardHeader>
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold font-headline leading-tight">{review.title || t('dashboardReviewsPage.untitled', 'Untitled review')}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{getAuthorDisplayName(review, 'pro', null, null)}</span>
                      <span>•</span>
                      <span>{new Date(review.date).toLocaleDateString(dateLocale)}</span>
                    </div>
                  </div>
                  <StarRating rating={review.rating} readOnly />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-foreground/90 lg:text-base">"{review.content || t('dashboardReviewsPage.noComment', 'No comment.')}"</p>

                {review.owner_reply && (
                  <div className="ml-2 rounded-xl border-l-2 border-primary bg-primary/5 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <CornerDownRight className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold text-primary">{t('dashboardReviewsPage.yourReply', 'Your reply')}</h4>
                    </div>
                    <p className="text-sm italic text-foreground/80">{review.owner_reply}</p>
                    <p className="mt-2 text-right text-xs text-muted-foreground/70">{review.owner_reply_date ? new Date(review.owner_reply_date).toLocaleDateString(dateLocale) : ''}</p>
                  </div>
                )}
              </CardContent>

              <CardContent className="rounded-b-xl border-t border-border/40 bg-secondary/10 py-2">
                <div className="flex items-center justify-between">
                  <VoteButtons reviewId={review.id} initialLikes={review.likes} initialDislikes={review.dislikes} />
                  <ReviewReportDialog reviewId={review.id} businessId={businessId || ''} />
                </div>
              </CardContent>

              {!review.owner_reply && (
                <CardFooter className="bg-black/5 p-4 dark:bg-white/5">
                  {replyingTo === review.id ? (
                    <div className="w-full space-y-3">
                      <Label htmlFor={`reply-${review.id}`} className="flex items-center gap-2 font-semibold text-primary">
                        <MessageSquare className="h-4 w-4" />
                        {t('dashboardReviewsPage.yourReply', 'Your reply')}
                      </Label>
                      <Textarea
                        id={`reply-${review.id}`}
                        placeholder={t('dashboardReviewsPage.replyPlaceholder', 'Thank the author for their review...')}
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        className="min-h-[100px] bg-background/80"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setReplyingTo(null)}>
                          {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button onClick={() => handleReplySubmit(review.id)} className="font-bold">
                          {t('dashboardReviewsPage.publish', 'Publish')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full border-primary/20 transition-colors hover:bg-primary/10 hover:text-primary sm:w-auto" onClick={() => setReplyingTo(review.id)}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      {t('dashboardReviewsPage.reply', 'Reply')}
                    </Button>
                  )}
                </CardFooter>
              )}
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
