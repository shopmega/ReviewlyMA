'use client';

import { useEffect, useState, useTransition, useActionState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { StarRating } from '@/components/shared/StarRating';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Edit,
  Star,
  ThumbsUp,
  Medal,
  MessageSquare,
  Loader2,
  LogIn,
  Link as LinkIcon,
  Sparkles,
  Heart,
  Settings as SettingsIcon,
  BriefcaseBusiness,
  SendHorizontal,
  Mail,
  User as UserIcon,
  Calendar,
  AlertCircle,
  Download,
  Trash2,
  Undo
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { VoteButtons } from '@/components/shared/VoteButtons';
import { ReviewReportDialog } from '@/components/shared/ReviewReportDialog';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { BusinessCard } from '@/components/shared/BusinessCard';
import { getSavedBusinesses, updateUserProfile, exportUserData, requestAccountDeletion } from '@/app/actions/user';
import { submitReviewAppeal } from '@/app/actions/review';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userProfileUpdateSchema, type UserProfileUpdateData, type ActionState, type SubscriptionTier } from '@/lib/types';
import { isPaidTier } from '@/lib/tier-utils';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useI18n } from '@/components/providers/i18n-provider';

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role?: string;
  business_id?: string;
  tier?: SubscriptionTier;
  email_preferences?: {
    marketing: boolean;
    system: boolean;
    review_replies: boolean;
    claim_updates: boolean;
  };
  deletion_scheduled_at?: string | null;
};

type UserReview = {
  id: number;
  business_id: string;
  business_name: string;
  rating: number;
  title: string | null;
  content: string | null;
  date: string;
  likes: number;
  dislikes: number;
  owner_reply: string | null;
  owner_reply_date: string | null;
  status?: string | null;
  moderation_reason_code?: string | null;
};

type ReviewAppeal = {
  review_id: number;
  status: 'open' | 'in_review' | 'accepted' | 'rejected';
  created_at: string;
  resolved_at: string | null;
};

type ProfileTab = 'reviews' | 'saved' | 'referrals' | 'account';

function ProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <Skeleton className="w-32 h-32 rounded-full" />
          <div className="space-y-2 flex-1 text-center md:text-left">
            <Skeleton className="h-10 w-64 mx-auto md:mx-0" />
            <Skeleton className="h-4 w-48 mx-auto md:mx-0" />
            <Skeleton className="h-4 w-32 mx-auto md:mx-0" />
          </div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const REVIEWS_PAGE_SIZE = 20;
  const SAVED_BUSINESSES_PAGE_SIZE = 12;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [reviewsPage, setReviewsPage] = useState(0);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'helpful' | 'rating'>('newest');
  const [activeTab, setActiveTab] = useState<ProfileTab>('reviews');
  const [savedBusinesses, setSavedBusinesses] = useState<any[]>([]);
  const [savedVisibleCount, setSavedVisibleCount] = useState(SAVED_BUSINESSES_PAGE_SIZE);
  const [referralStats, setReferralStats] = useState({ offers: 0, requests: 0 });
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [appealsByReview, setAppealsByReview] = useState<Record<number, ReviewAppeal>>({});
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { t, tf, locale } = useI18n();
  const dateLocale = locale === 'fr' ? 'fr-FR' : locale === 'ar' ? 'ar-MA' : 'en-US';

  // Sort reviews based on selected option
  const sortedReviews = useMemo(() => {
    if (!reviews.length) return [];

    const sorted = [...reviews];

    switch (sortOption) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case 'helpful':
        return sorted.sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      default:
        return sorted;
    }
  }, [reviews, sortOption]);

  const visibleSavedBusinesses = useMemo(
    () => savedBusinesses.slice(0, savedVisibleCount),
    [savedBusinesses, savedVisibleCount]
  );

  const mapReviewRow = (r: any): UserReview => ({
    id: r.id,
    business_id: r.business_id,
    business_name: r.businesses?.name || r.business_id,
    rating: r.rating,
    title: r.title,
    content: r.content,
    date: r.date,
    likes: r.likes || 0,
    dislikes: r.dislikes || 0,
    owner_reply: r.owner_reply,
    owner_reply_date: r.owner_reply_date,
    status: r.status || null,
    moderation_reason_code: r.moderation_reason_code || null,
  });

  const fetchReviewsPage = async (userId: string, page: number, append: boolean) => {
    const supabase = createClient();
    const from = page * REVIEWS_PAGE_SIZE;
    const to = from + REVIEWS_PAGE_SIZE - 1;

    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id, business_id, rating, title, content, date, likes, dislikes, status, moderation_reason_code,
        owner_reply, owner_reply_date, businesses!inner (name)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .range(from, to);

    if (!reviewsError && reviewsData) {
      const mapped = reviewsData.map(mapReviewRow);
      let nextReviews: UserReview[] = mapped;
      setReviews((prev) => {
        nextReviews = append ? [...prev, ...mapped] : mapped;
        return nextReviews;
      });
      await fetchAppealsForReviews(nextReviews.map((review) => review.id));
      setReviewsPage(page);
      setHasMoreReviews(reviewsData.length === REVIEWS_PAGE_SIZE);
    } else if (!append) {
      setReviews([]);
      setHasMoreReviews(false);
      setAppealsByReview({});
    }
  };

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

    const byReview: Record<number, ReviewAppeal> = {};
    for (const appeal of data as ReviewAppeal[]) {
      if (!byReview[appeal.review_id]) {
        byReview[appeal.review_id] = appeal;
      }
    }
    setAppealsByReview(byReview);
  };

  const initialState: ActionState = { status: 'idle', message: '' };
  const [state, formAction] = useActionState(updateUserProfile, initialState);

  const form = useForm<UserProfileUpdateData>({
    resolver: zodResolver(userProfileUpdateSchema),
    defaultValues: {
      full_name: '',
      email: '',
      email_preferences: {
        marketing: true,
        system: true,
        review_replies: true,
        claim_updates: true,
      },
    },
  });

  useEffect(() => {
    async function fetchUserData() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);
      setCurrentUserId(user.id);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profileError && profileData) {
        const userData = {
          ...profileData,
          email: user.email || profileData.email,
        };
        setProfile(userData);
        form.reset({
          full_name: userData.full_name || '',
          email: userData.email || '',
          email_preferences: userData.email_preferences || {
            marketing: true,
            system: true,
            review_replies: true,
            claim_updates: true,
          },
        });
      }

      await fetchReviewsPage(user.id, 0, false);

      // Fetch saved businesses with minimal data
      try {
        const saved = await getSavedBusinesses();
        setSavedBusinesses(saved);
        setSavedVisibleCount(Math.min(SAVED_BUSINESSES_PAGE_SIZE, saved.length));
      } catch (e) {
        console.error('Failed to fetch saved businesses', e);
      }

      try {
        const [{ count: offersCount }, { count: requestsCount }] = await Promise.all([
          supabase
            .from('job_referral_offers')
            .select('id', { head: true, count: 'exact' })
            .eq('user_id', user.id),
          supabase
            .from('job_referral_requests')
            .select('id', { head: true, count: 'exact' })
            .eq('candidate_user_id', user.id),
        ]);

        setReferralStats({
          offers: offersCount || 0,
          requests: requestsCount || 0,
        });
      } catch (e) {
        console.error('Failed to fetch referral stats', e);
      }

      setLoading(false);
    }

    fetchUserData();
  }, [form]);

  useEffect(() => {
    if (state?.status === 'success') {
      toast({ title: t('profilePage.toasts.profileUpdated', 'Profile updated'), description: state.message });
      // Update local profile state
      if (profile) {
        setProfile({
          ...profile,
          full_name: form.getValues('full_name'),
          email: form.getValues('email')
        });
      }
    } else if (state?.status === 'error') {
      toast({ title: t('profilePage.toasts.errorTitle', 'Error'), description: state.message, variant: 'destructive' });
    }
  }, [state, toast, form, profile, t]);

  const onSubmit = (data: UserProfileUpdateData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'email_preferences') {
        formData.append(key, JSON.stringify(value));
      } else if (value) {
        formData.append(key, String(value));
      }
    });
    startTransition(() => {
      formAction(formData);
    });
  };

  const handleExportData = async () => {
    startTransition(async () => {
      const result = await exportUserData();
      if (result.status === 'success' && result.data) {
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `avis_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({
          title: t('profilePage.toasts.exportSuccessTitle', 'Export successful'),
          description: t('profilePage.toasts.exportSuccessDesc', 'Your data has been downloaded.'),
        });
      } else {
        toast({ title: t('profilePage.toasts.errorTitle', 'Error'), description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleDeleteAccount = async () => {
    if (!confirm(t('profilePage.confirmDelete', 'Are you sure you want to request account deletion? This action will be effective in 30 days.'))) return;

    startTransition(async () => {
      const result = await requestAccountDeletion();
      if (result.status === 'success') {
        toast({ title: t('profilePage.toasts.deletionRequested', 'Request recorded'), description: result.message });
        // Refresh profile to show scheduled deletion
        const supabase = createClient();
        const { data } = await supabase.from('profiles').select('deletion_scheduled_at').eq('id', profile?.id).single();
        if (data && profile) {
          setProfile({ ...profile, deletion_scheduled_at: data.deletion_scheduled_at });
        }
      } else {
        toast({ title: t('profilePage.toasts.errorTitle', 'Error'), description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleLoadMoreReviews = async () => {
    if (!currentUserId || !hasMoreReviews || loadingMoreReviews) return;
    setLoadingMoreReviews(true);
    await fetchReviewsPage(currentUserId, reviewsPage + 1, true);
    setLoadingMoreReviews(false);
  };

  const handleReviewAppeal = async (reviewId: number) => {
    const existing = appealsByReview[reviewId];
    if (existing && (existing.status === 'open' || existing.status === 'in_review')) {
      toast({
        title: t('profilePage.toasts.errorTitle', 'Error'),
        description: t('profilePage.reviews.appealAlreadyActive', 'An appeal is already active for this review.'),
        variant: 'destructive',
      });
      return;
    }

    const message = window.prompt(t('profilePage.reviews.appealPrompt', 'Explain your appeal (minimum 10 characters):'));
    if (message === null) return;
    const cleaned = message.trim();
    if (cleaned.length < 10) {
      toast({
        title: t('profilePage.toasts.errorTitle', 'Error'),
        description: t('profilePage.reviews.appealTooShort', 'Message is too short.'),
        variant: 'destructive',
      });
      return;
    }

    const result = await submitReviewAppeal({ review_id: reviewId, message: cleaned });
    if (result.status === 'success') {
      toast({ title: t('profilePage.toasts.appealSubmitted', 'Appeal submitted'), description: result.message });
      await fetchAppealsForReviews(reviews.map((review) => review.id));
    } else {
      toast({ title: t('profilePage.toasts.errorTitle', 'Error'), description: result.message, variant: 'destructive' });
    }
  };

  const getAppealBadge = (reviewId: number) => {
    const appeal = appealsByReview[reviewId];
    if (!appeal) return null;
    if (appeal.status === 'open') return <Badge variant="outline">{t('profilePage.reviews.appealStatusOpen', 'Appeal open')}</Badge>;
    if (appeal.status === 'in_review') return <Badge variant="outline" className="border-orange-500 text-orange-600">{t('profilePage.reviews.appealStatusInReview', 'Appeal in review')}</Badge>;
    if (appeal.status === 'accepted') return <Badge className="bg-emerald-600 text-white">{t('profilePage.reviews.appealStatusAccepted', 'Appeal accepted')}</Badge>;
    return <Badge variant="secondary">{t('profilePage.reviews.appealStatusRejected', 'Appeal rejected')}</Badge>;
  };

  const handleLoadMoreSaved = () => {
    setSavedVisibleCount((prev) => Math.min(prev + SAVED_BUSINESSES_PAGE_SIZE, savedBusinesses.length));
  };

  if (loading) return <ProfileSkeleton />;

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-24 flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center shadow-2xl border-none bg-card/50 backdrop-blur-sm">
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">{t('profilePage.authRequired.title', 'Login required')}</h1>
          <p className="text-muted-foreground mb-8">
            {t('profilePage.authRequired.description', 'Join the community to manage your profile, reviews and favorites.')}
          </p>
          <Button asChild size="lg" className="w-full rounded-full shadow-lg">
            <Link href="/login?next=/profile">{t('profilePage.authRequired.cta', 'Log in')}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const userName = profile?.full_name || t('profilePage.fallbackUserName', 'User');
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const reviewCount = reviews.length;
  const helpfulVotes = reviews.reduce((acc, review) => acc + (review.likes || 0), 0);
  const contributorLevel = reviewCount >= 10 ? t('profilePage.levels.expert', 'Expert') : reviewCount >= 5 ? t('profilePage.levels.confirmed', 'Confirmed') : t('profilePage.levels.beginner', 'Beginner');

  const userStats = [
    { label: t('profilePage.stats.reviewsWritten', 'Reviews written'), value: reviewCount, icon: Star, color: 'text-amber-500' },
    { label: t('profilePage.stats.helpfulVotes', 'Helpful votes'), value: helpfulVotes, icon: ThumbsUp, color: 'text-blue-500' },
    { label: t('profilePage.stats.level', 'Level'), value: contributorLevel, icon: Medal, color: 'text-emerald-500' },
  ];

  return (
    <div className="bg-background min-h-screen">
      <div className="relative w-full h-64 bg-gradient-to-br from-primary via-blue-900 to-accent overflow-hidden">
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-[url('/patterns/moroccan-pattern.svg')] opacity-10 animate-pulse" />
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-32 relative z-10 pb-20">
        <div className="max-w-5xl mx-auto">
          {/* Enhanced Profile Header */}
          <Card className="border-none shadow-2xl bg-card/90 backdrop-blur-md overflow-hidden mb-8">
            <CardContent className="p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
              <div className="relative group">
                <Avatar className="w-36 h-36 border-4 border-background shadow-2xl text-4xl transform group-hover:scale-105 transition-transform duration-300">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={userName} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                {profile?.tier && isPaidTier(profile.tier) && (
                  <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white rounded-full p-2 shadow-lg border-2 border-background">
                    <Sparkles className="w-6 h-6 fill-current" />
                  </div>
                )}
              </div>

              <div className="flex-1 text-center md:text-left space-y-3">
                <div className="flex flex-col md:flex-row items-center gap-3">
                  <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tight">{userName}</h1>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                    {contributorLevel}
                  </Badge>
                </div>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1.5 bg-secondary/30 px-3 py-1 rounded-full text-sm">
                    <Mail className="w-4 h-4" />
                    {profile?.email}
                  </div>
                  <div className="flex items-center gap-1.5 bg-secondary/30 px-3 py-1 rounded-full text-sm">
                    <Calendar className="w-4 h-4" />
                    {tf('profilePage.memberSince', 'Since {date}', { date: new Date(profile?.created_at || Date.now()).toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' }) })}
                  </div>
                </div>
              </div>

              {profile?.business_id && (
                <Button size="lg" className="rounded-full shadow-lg bg-gradient-to-r from-primary to-accent hover:shadow-xl transition-all" asChild>
                  <Link href="/dashboard">
                    <SettingsIcon className="mr-2 h-5 w-5" />
                    {t('profilePage.businessConsole', 'My Business Console')}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            {userStats.map((stat) => (
              <Card key={stat.label} className="border-none shadow-lg bg-card/80 hover:bg-card transition-colors">
                <CardContent className="p-6 flex items-center gap-5">
                  <div className={`p-4 rounded-2xl bg-background shadow-inner ${stat.color}`}>
                    <stat.icon className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-3xl font-black font-headline leading-none mb-1">{stat.value}</div>
                    <div className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">{stat.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-sky-500/5 shadow-sm mb-10">
            <CardContent className="p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('profilePage.recommended.title', 'Recommended next action')}</p>
                <p className="text-lg font-bold">{t('profilePage.recommended.subtitle', 'Share a new review to increase your impact')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild className="rounded-full">
                  <Link href="/review">
                    <Star className="mr-2 h-4 w-4" />
                    {t('profilePage.recommended.writeReview', 'Write a review')}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/profile/saved-businesses">
                    <Heart className="mr-2 h-4 w-4" />
                    {t('profilePage.recommended.viewFavorites', 'View my favorites')}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProfileTab)} className="space-y-8">
            <div className="flex justify-start overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
              <TabsList className="bg-muted/50 p-1.5 rounded-full border border-border/50 backdrop-blur-sm h-14 w-max min-w-full md:min-w-0">
                <TabsTrigger value="reviews" className="rounded-full px-6 py-2.5 flex gap-2 h-full data-[state=active]:bg-background data-[state=active]:shadow-md">
                  <Star className="w-4 h-4" />
                  {t('profilePage.tabs.reviews', 'My Reviews')}
                </TabsTrigger>
                <TabsTrigger value="saved" className="rounded-full px-6 py-2.5 flex gap-2 h-full data-[state=active]:bg-background data-[state=active]:shadow-md">
                  <Heart className="w-4 h-4" />
                  {t('profilePage.tabs.saved', 'Favorites')}
                </TabsTrigger>
                <TabsTrigger value="referrals" className="rounded-full px-6 py-2.5 flex gap-2 h-full data-[state=active]:bg-background data-[state=active]:shadow-md">
                  <BriefcaseBusiness className="w-4 h-4" />
                  {t('profilePage.tabs.referrals', 'Referrals')}
                </TabsTrigger>
                <TabsTrigger value="account" className="rounded-full px-6 py-2.5 flex gap-2 h-full data-[state=active]:bg-background data-[state=active]:shadow-md">
                  <Edit className="w-4 h-4" />
                  {t('profilePage.tabs.account', 'Account')}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB: REVIEWS */}
            <TabsContent value="reviews" className="space-y-6">
              {/* Sorting Controls */}
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-bold">{tf('profilePage.reviews.title', 'My Reviews ({count})', { count: sortedReviews.length })}</h3>
                  {(hasMoreReviews || reviewsPage > 0) && (
                    <p className="text-xs text-muted-foreground">
                      {tf('profilePage.reviews.loadedCount', 'Showing {count} loaded reviews.', { count: sortedReviews.length })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-sm text-muted-foreground">{t('profilePage.reviews.sortBy', 'Sort by:')}</span>
                  <Select value={sortOption} onValueChange={(value: any) => setSortOption(value)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">{t('profilePage.reviews.sortNewest', 'Newest')}</SelectItem>
                      <SelectItem value="oldest">{t('profilePage.reviews.sortOldest', 'Oldest')}</SelectItem>
                      <SelectItem value="helpful">{t('profilePage.reviews.sortHelpful', 'Most helpful')}</SelectItem>
                      <SelectItem value="rating">{t('profilePage.reviews.sortRating', 'Best rating')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {sortedReviews.length === 0 ? (
                <Card className="border-2 border-dashed border-muted bg-transparent p-12 text-center">
                  <div className="bg-muted p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Star className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{t('profilePage.reviews.emptyTitle', 'No reviews yet')}</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-8 text-lg">
                    {t('profilePage.reviews.emptyDescription', 'Share your experience and help others find the best places in Morocco!')}
                  </p>
                  <Button asChild size="lg" className="rounded-full shadow-lg">
                    <Link href="/">{t('profilePage.reviews.emptyCta', 'Start my first search')}</Link>
                  </Button>
                </Card>
              ) : (
                <>
                <div className="grid gap-6">
                  {sortedReviews.map((review) => (
                    <Card key={review.id} className="border-none shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                      <div className="flex flex-col md:flex-row h-full">
                        <div className="w-full md:w-3 bg-gradient-to-b from-primary/60 to-accent/60 group-hover:from-primary group-hover:to-accent transition-all duration-500" />
                        <div className="flex-1 p-8">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div>
                              <h3 className="text-2xl font-bold mb-1 text-foreground">{review.title || t('profilePage.reviews.untitled', 'Company review')}</h3>
                              <div className="flex items-center flex-wrap gap-2 text-sm">
                                <span className="text-muted-foreground">{t('profilePage.reviews.businessLabel', 'Business:')}</span>
                                <Link
                                  href={`/businesses/${review.business_id}`}
                                  className="font-bold text-primary hover:text-accent transition-colors underline decoration-primary/20 underline-offset-4"
                                >
                                  {review.business_name}
                                </Link>
                                <span className="text-muted-foreground">? {new Date(review.date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </div>
                            </div>
                            <div className="bg-secondary/50 p-2 rounded-xl border border-border/50">
                              <StarRating rating={review.rating} readOnly size={22} />
                            </div>
                          </div>

                          <p className="text-muted-foreground leading-relaxed text-lg mb-8 italic">
                            "{review.content}"
                          </p>

                          {review.owner_reply && (
                            <div className="bg-primary/5 p-6 rounded-2xl border-l-4 border-primary/40 relative mb-8">
                              <MessageSquare className="absolute -top-3 -right-3 w-10 h-10 text-primary/10" />
                              <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-primary/10 rounded-lg">
                                  <Badge className="bg-primary hover:bg-primary border-none">{t('profilePage.reviews.proReply', 'Pro reply')}</Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">{tf('profilePage.reviews.replyDate', 'on {date}', { date: new Date(review.owner_reply_date!).toLocaleDateString(dateLocale) })}</span>
                              </div>
                              <p className="text-foreground/80 font-medium">
                                {review.owner_reply}
                              </p>
                            </div>
                          )}

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-6 border-t border-border/50">
                            <div className="flex flex-wrap gap-4 items-center">
                              <Button asChild variant="outline" size="sm" className="rounded-full">
                                <Link href={`/reviews/${review.id}/edit`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  {t('profilePage.reviews.edit', 'Edit')}
                                </Link>
                              </Button>
                              {(review.status === 'rejected' || review.status === 'hidden' || review.status === 'deleted') && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full"
                                  disabled={appealsByReview[review.id]?.status === 'open' || appealsByReview[review.id]?.status === 'in_review'}
                                  onClick={() => handleReviewAppeal(review.id)}
                                >
                                  <Undo className="mr-2 h-4 w-4" />
                                  {appealsByReview[review.id]?.status === 'open' || appealsByReview[review.id]?.status === 'in_review'
                                    ? t('profilePage.reviews.appealInProgress', 'Appeal in progress')
                                    : t('profilePage.reviews.appeal', 'Appeal')}
                                </Button>
                              )}
                              {getAppealBadge(review.id)}
                              <VoteButtons
                                reviewId={review.id}
                                initialLikes={review.likes}
                                initialDislikes={review.dislikes}
                              />
                            </div>
                            <div className="self-start sm:self-auto">
                              <ReviewReportDialog reviewId={review.id} businessId={review.business_id} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                {hasMoreReviews && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={handleLoadMoreReviews}
                      disabled={loadingMoreReviews}
                    >
                      {loadingMoreReviews ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('profilePage.reviews.loadingMore', 'Loading...')}
                        </>
                      ) : (
                        t('profilePage.reviews.loadMore', 'Load more reviews')
                      )}
                    </Button>
                  </div>
                )}
                </>
              )}
            </TabsContent>

            {/* TAB: SAVED */}
            <TabsContent value="saved" className="space-y-6">
              {savedBusinesses.length > 0 && (
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {tf('profilePage.saved.count', 'Showing {visible} favorites out of {total}.', { visible: savedVisibleCount, total: savedBusinesses.length })}
                  </p>
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link href="/profile/saved-businesses">{t('profilePage.saved.viewAll', 'View all my favorites')}</Link>
                  </Button>
                </div>
              )}
              {savedBusinesses.length === 0 ? (
                <Card className="border-2 border-dashed border-muted bg-transparent p-12 text-center">
                  <div className="bg-muted p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Heart className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{t('profilePage.saved.emptyTitle', 'Your favorites are empty')}</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-8 text-lg">
                    {t('profilePage.saved.emptyDescription', 'Keep track of places you love or plan to visit in Morocco.')}
                  </p>
                  <Button asChild size="lg" className="rounded-full shadow-lg">
                    <Link href="/">{t('profilePage.saved.emptyCta', 'Explore places')}</Link>
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {visibleSavedBusinesses.map((business) => (
                    <BusinessCard key={business.id} business={business} />
                  ))}
                </div>
              )}
              {savedBusinesses.length > savedVisibleCount && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" className="rounded-full" onClick={handleLoadMoreSaved}>
                    {t('profilePage.saved.loadMore', 'Load more favorites')}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* TAB: REFERRALS */}
            <TabsContent value="referrals" className="space-y-6">
              <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm">
                <CardHeader className="border-b border-border/50 p-8">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <BriefcaseBusiness className="w-6 h-6 text-primary" />
                    {t('profilePage.referrals.title', 'My referrals')}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {t('profilePage.referrals.description', 'Manage your published offers and track your referral requests.')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Card className="bg-background/70 border-border/60">
                      <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground mb-2">{t('profilePage.referrals.offers', 'Published offers')}</p>
                        <p className="text-3xl font-black">{referralStats.offers}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-background/70 border-border/60">
                      <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground mb-2">{t('profilePage.referrals.requests', 'Sent requests')}</p>
                        <p className="text-3xl font-black">{referralStats.requests}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button asChild className="rounded-full">
                      <Link href="/parrainages/mes-offres">
                        <BriefcaseBusiness className="mr-2 h-4 w-4" />
                        {t('profilePage.referrals.myOffers', 'My referral offers')}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full">
                      <Link href="/parrainages/mes-demandes">
                        <SendHorizontal className="mr-2 h-4 w-4" />
                        {t('profilePage.referrals.myRequests', 'My referral requests')}
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="rounded-full">
                      <Link href="/parrainages/new">
                        {t('profilePage.referrals.publishNew', 'Publish a new offer')}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: ACCOUNT */}
            <TabsContent value="account" className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm">
                    <CardHeader className="border-b border-border/50 p-8">
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <UserIcon className="w-6 h-6 text-primary" />
                        {t('profilePage.account.personalTitle', 'Personal Information')}
                      </CardTitle>
                      <CardDescription className="text-base">
                        {t('profilePage.account.personalDescription', 'Manage your account information and your public profile display.')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="space-y-8 max-w-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormField
                            control={form.control}
                            name="full_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-bold">{t('profilePage.account.displayName', 'Display name')}</FormLabel>
                                <FormControl>
                                  <Input {...field} className="h-12 border-muted-foreground/20 focus:border-primary focus:ring-primary/20 rounded-xl" placeholder={t('profilePage.account.displayNamePlaceholder', 'Your full name')} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-bold">{t('profilePage.account.emailLabel', 'Email address')}</FormLabel>
                                <FormControl>
                                  <Input type="email" {...field} className="h-12 border-muted-foreground/20 focus:border-primary focus:ring-primary/20 rounded-xl" placeholder={t('profilePage.account.emailPlaceholder', 'you@email.com')} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex justify-end pt-6 border-t border-border/50 gap-4">
                          <Button variant="outline" type="button" onClick={() => form.reset()} disabled={isPending} className="rounded-full h-12 px-6">
                            {t('profilePage.account.reset', 'Reset')}
                          </Button>
                          <Button type="submit" disabled={isPending} className="rounded-full h-12 px-8 shadow-lg bg-primary hover:scale-[1.02] transition-transform">
                            {isPending ? (
                              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t('profilePage.account.saving', 'Saving...')}</>
                            ) : (
                              t('profilePage.account.saveChanges', 'Save changes')
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg bg-card/60 backdrop-blur-sm">
                    <CardHeader className="p-8 pb-4">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        {t('profilePage.account.preferencesTitle', 'Communication preferences')}
                      </CardTitle>
                      <CardDescription>{t('profilePage.account.preferencesDescription', 'Choose which emails you want to receive.')}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                      <div className="space-y-6">
                        <FormField
                          control={form.control}
                          name="email_preferences.marketing"
                          render={({ field }) => (
                            <div className="flex items-center justify-between py-4 border-b border-border/50">
                              <div className="space-y-0.5">
                                <Label className="text-base">{t('profilePage.account.prefMarketingTitle', 'News & Offers')}</Label>
                                <p className="text-sm text-muted-foreground">{t('profilePage.account.prefMarketingDescription', 'Receive our latest updates and special offers.')}</p>
                              </div>
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </div>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email_preferences.review_replies"
                          render={({ field }) => (
                            <div className="flex items-center justify-between py-4 border-b border-border/50">
                              <div className="space-y-0.5">
                                <Label className="text-base">{t('profilePage.account.prefRepliesTitle', 'Review replies')}</Label>
                                <p className="text-sm text-muted-foreground">{t('profilePage.account.prefRepliesDescription', 'Get notified when a business replies to your review.')}</p>
                              </div>
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </div>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email_preferences.system"
                          render={({ field }) => (
                            <div className="flex items-center justify-between py-4 border-b border-border/50">
                              <div className="space-y-0.5">
                                <Label className="text-base">{t('profilePage.account.prefSystemTitle', 'System notifications')}</Label>
                                <p className="text-sm text-muted-foreground">{t('profilePage.account.prefSystemDescription', 'Alerts about account security and system activity.')}</p>
                              </div>
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled />
                              </FormControl>
                            </div>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email_preferences.claim_updates"
                          render={({ field }) => (
                            <div className="flex items-center justify-between py-4">
                              <div className="space-y-0.5">
                                <Label className="text-base">{t('profilePage.account.prefClaimsTitle', 'Claim updates')}</Label>
                                <p className="text-sm text-muted-foreground">{t('profilePage.account.prefClaimsDescription', 'Track the status of your business management claims.')}</p>
                              </div>
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </div>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </form>
              </Form>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="w-5 h-5 text-blue-500" />
                      {t('profilePage.account.exportTitle', 'Data export')}
                    </CardTitle>
                    <CardDescription>{t('profilePage.account.exportDescription', 'Download a copy of your personal data')}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground mb-6 text-sm">
                      {t('profilePage.account.exportHint', 'You will receive a JSON file containing your profile, reviews, and favorite businesses.')}
                    </p>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl py-6 h-auto border-blue-200 hover:bg-blue-50 transition-colors"
                      onClick={handleExportData}
                      disabled={isPending}
                    >
                      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                      {t('profilePage.account.exportAction', 'Export my data')}
                    </Button>
                  </CardContent>
                </Card>

                <Card className={`border-none shadow-xl ${profile?.deletion_scheduled_at ? 'bg-amber-50 border border-amber-200' : 'bg-destructive/5 border border-destructive/10'}`}>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${profile?.deletion_scheduled_at ? 'text-amber-600' : 'text-destructive'}`}>
                      <AlertCircle className="w-5 h-5" />
                      {profile?.deletion_scheduled_at ? t('profilePage.account.deletionScheduledTitle', 'Deletion scheduled') : t('profilePage.account.dangerTitle', 'Danger zone')}
                    </CardTitle>
                    <CardDescription>
                      {profile?.deletion_scheduled_at
                        ? tf('profilePage.account.deletionScheduledDescription', 'Your account will be deleted on {date}', { date: new Date(profile.deletion_scheduled_at).toLocaleDateString(dateLocale) })
                        : t('profilePage.account.deletionPermanentDescription', 'Permanent account deletion')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {profile?.deletion_scheduled_at ? (
                      <div className="space-y-4">
                        <p className="text-amber-700 text-sm">
                          {t('profilePage.account.deletionScheduledHint', 'Your account is currently pending deletion. You can cancel this request by contacting support or updating your settings (coming soon).')}
                        </p>
                        <Button variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-100" disabled>
                          <Undo className="mr-2 h-4 w-4" />
                          {t('profilePage.account.cancelDeletion', 'Cancel deletion')}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-muted-foreground mb-6 text-sm">
                          {t('profilePage.account.deleteWarning', 'This action will delete all your reviews, favorites, and personal data. A 30-day delay is applied before permanent deletion.')}
                        </p>
                        <Button
                          variant="destructive"
                          className="w-full rounded-xl py-6 h-auto font-bold"
                          onClick={handleDeleteAccount}
                          disabled={isPending}
                        >
                          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          {t('profilePage.account.deleteAction', 'Delete my account')}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}


