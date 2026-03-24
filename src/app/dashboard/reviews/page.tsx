'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AlertCircle, CornerDownRight, Loader2, MessageSquare, Percent, Undo } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/shared/StarRating';
import { VoteButtons } from '@/components/shared/VoteButtons';
import { ReviewReportDialog } from '@/components/shared/ReviewReportDialog';
import { AppEmptyState } from '@/components/shared/AppEmptyState';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { ReviewAppealStatusBadge, ReviewModerationStatusBadge } from '@/components/reviews/ReviewStatusBadges';
import { ReviewSortSelect } from '@/components/reviews/ReviewSortSelect';
import { useToast } from '@/hooks/use-toast';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { createClient } from '@/lib/supabase/client';
import { getAuthorDisplayName } from '@/lib/utils/anonymous-reviews';
import { useI18n } from '@/components/providers/i18n-provider';
import { submitReviewAppeal } from '@/app/actions/review';
import { isModeratedReviewStatus, isReviewAppealActive, mapLatestAppealsByReview, sortReviews, type ReviewSortOption } from '@/lib/reviews/review-helpers';

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
  status?: string | null;
};

type Business = {
  id: string;
  name: string;
};

type ReviewAppeal = {
  review_id: number;
  status: 'open' | 'in_review' | 'accepted' | 'rejected';
  created_at: string;
  resolved_at: string | null;
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
  const [sortOption, setSortOption] = useState<ReviewSortOption>('newest');
  const [replyFilter, setReplyFilter] = useState<'all' | 'pending' | 'replied'>('all');
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [appealsByReview, setAppealsByReview] = useState<Record<number, ReviewAppeal>>({});
  const { toast } = useToast();
  const { t, tf, locale } = useI18n();

  const dateLocale = locale === 'fr' ? 'fr-FR' : locale === 'ar' ? 'ar-MA' : 'en-US';

  const sortedReviews = useMemo(() => {
    if (!reviews.length) return [];
    return sortReviews(reviews, sortOption);
  }, [reviews, sortOption]);

  const filteredReviews = useMemo(() => {
    if (replyFilter === 'pending') return sortedReviews.filter((review) => !review.owner_reply);
    if (replyFilter === 'replied') return sortedReviews.filter((review) => Boolean(review.owner_reply));
    return sortedReviews;
  }, [sortedReviews, replyFilter]);

  const fetchAppealsForReviews = async (reviewIds: number[]) => {
    if (!reviewIds.length) {
      setAppealsByReview({});
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('review_appeals')
      .select('review_id,status,created_at,resolved_at')
      .in('review_id', reviewIds)
      .order('created_at', { ascending: false });

    if (error || !data) return;

    setAppealsByReview(mapLatestAppealsByReview(data as ReviewAppeal[]));
  };

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
        .select('id, rating, title, content, author_name, is_anonymous, user_id, date, likes, dislikes, owner_reply, owner_reply_date, status')
        .eq('business_id', businessId)
        .order('date', { ascending: false });

      setReviews(reviewsData || []);
      await fetchAppealsForReviews((reviewsData || []).map((review) => review.id));
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

  const handleReviewAppeal = async (reviewId: number) => {
    const existing = appealsByReview[reviewId];
    if (existing && isReviewAppealActive(existing.status)) {
      toast({
        title: t('dashboardReviewsPage.errorTitle', 'Error'),
        description: t('dashboardReviewsPage.appealAlreadyActive', 'An appeal is already active for this review.'),
        variant: 'destructive',
      });
      return;
    }

    const message = window.prompt(t('dashboardReviewsPage.appealPrompt', 'Explain your appeal (minimum 10 characters):'));
    if (message === null) return;
    const cleaned = message.trim();
    if (cleaned.length < 10) {
      toast({
        title: t('dashboardReviewsPage.errorTitle', 'Error'),
        description: t('dashboardReviewsPage.appealTooShort', 'Message is too short.'),
        variant: 'destructive',
      });
      return;
    }

    const result = await submitReviewAppeal({ review_id: reviewId, message: cleaned });
    if (result.status === 'success') {
      toast({
        title: t('dashboardReviewsPage.appealSubmittedTitle', 'Appeal submitted'),
        description: result.message,
      });
      await fetchAppealsForReviews(reviews.map((review) => review.id));
    } else {
      toast({
        title: t('dashboardReviewsPage.errorTitle', 'Error'),
        description: result.message,
        variant: 'destructive',
      });
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
          <Link href="/pro">{t('dashboardReviewsPage.claimBusiness', 'Claim a business')}</Link>
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
              <SegmentedControl
                items={[
                  { key: 'all', label: t('dashboardReviewsPage.filter.all', 'All'), active: replyFilter === 'all', onClick: () => setReplyFilter('all') },
                  { key: 'pending', label: t('dashboardReviewsPage.filter.pending', 'Pending'), active: replyFilter === 'pending', onClick: () => setReplyFilter('pending') },
                  { key: 'replied', label: t('dashboardReviewsPage.filter.replied', 'Replied'), active: replyFilter === 'replied', onClick: () => setReplyFilter('replied') },
                ]}
              />

              <ReviewSortSelect
                value={sortOption}
                onChange={setSortOption}
                labels={{
                  newest: t('dashboardReviewsPage.sort.newest', 'Newest'),
                  oldest: t('dashboardReviewsPage.sort.oldest', 'Oldest'),
                  rating: t('dashboardReviewsPage.sort.rating', 'Best rating'),
                  helpful: t('dashboardReviewsPage.sort.helpful', 'Most helpful'),
                }}
              />
            </div>
          </div>
        )}

        {totalReviews === 0 ? (
          <AppEmptyState
            icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
            title={t('dashboardReviewsPage.emptyTitle', 'No reviews yet')}
            description={t('dashboardReviewsPage.emptyDesc', 'Your customer reviews will appear here.')}
            className="p-6"
          />
        ) : filteredReviews.length === 0 ? (
          <AppEmptyState
            title={t('dashboardReviewsPage.noFilterResult', 'No result for this filter')}
            description={t('dashboardReviewsPage.noFilterResultDesc', 'Change filter to display other reviews.')}
            className="p-4"
            action={
              <Button variant="outline" onClick={() => setReplyFilter('all')}>
                {t('dashboardReviewsPage.backAll', 'Back to all reviews')}
              </Button>
            }
          />
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
                      <ReviewModerationStatusBadge
                        status={isModeratedReviewStatus(review.status) ? (review.status as 'rejected' | 'hidden' | 'deleted') : null}
                        labels={{
                          rejected: t('dashboardReviewsPage.reviewStatusRejected', 'Rejected'),
                          hidden: t('dashboardReviewsPage.reviewStatusHidden', 'Hidden'),
                          deleted: t('dashboardReviewsPage.reviewStatusDeleted', 'Deleted'),
                        }}
                      />
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
                  <div className="flex items-center gap-2">
                    <VoteButtons reviewId={review.id} initialLikes={review.likes} initialDislikes={review.dislikes} />
                    <ReviewAppealStatusBadge
                      status={appealsByReview[review.id]?.status}
                      labels={{
                        open: t('dashboardReviewsPage.appealStatusOpen', 'Appeal open'),
                        in_review: t('dashboardReviewsPage.appealStatusInReview', 'Appeal in review'),
                        accepted: t('dashboardReviewsPage.appealStatusAccepted', 'Appeal accepted'),
                        rejected: t('dashboardReviewsPage.appealStatusRejected', 'Appeal rejected'),
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {isModeratedReviewStatus(review.status) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isReviewAppealActive(appealsByReview[review.id]?.status)}
                        onClick={() => handleReviewAppeal(review.id)}
                      >
                        <Undo className="mr-2 h-4 w-4" />
                        {isReviewAppealActive(appealsByReview[review.id]?.status)
                          ? t('dashboardReviewsPage.appealInProgress', 'Appeal in progress')
                          : t('dashboardReviewsPage.appeal', 'Appeal')}
                      </Button>
                    )}
                    <ReviewReportDialog reviewId={review.id} businessId={businessId || ''} />
                  </div>
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
