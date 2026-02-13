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
  ShieldCheck,
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
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userProfileUpdateSchema, type UserProfileUpdateData, type ActionState } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role?: string;
  business_id?: string;
  tier?: 'none' | 'growth' | 'gold';
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
};

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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'helpful' | 'rating'>('newest');
  const [savedBusinesses, setSavedBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

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

      // Fetch user's reviews with pagination for better performance
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id, business_id, rating, title, content, date, likes, dislikes,
          owner_reply, owner_reply_date, businesses!inner (name)
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(20); // Limit initial load

      if (!reviewsError && reviewsData) {
        setReviews(reviewsData.map((r: any) => ({
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
        })));
      }

      // Fetch saved businesses with minimal data
      try {
        const { getSavedBusinesses } = await import('@/app/actions/user');
        const saved = await getSavedBusinesses();
        // Limit to first 12 for initial load
        setSavedBusinesses(saved.slice(0, 12));
      } catch (e) {
        console.error('Failed to fetch saved businesses', e);
      }

      setLoading(false);
    }

    fetchUserData();
  }, [form]);

  useEffect(() => {
    if (state?.status === 'success') {
      toast({ title: 'Profil mis à jour', description: state.message });
      // Update local profile state
      if (profile) {
        setProfile({
          ...profile,
          full_name: form.getValues('full_name'),
          email: form.getValues('email')
        });
      }
    } else if (state?.status === 'error') {
      toast({ title: 'Erreur', description: state.message, variant: 'destructive' });
    }
  }, [state, toast, form, profile]);

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
        toast({ title: 'Export réussi', description: 'Vos données ont été téléchargées.' });
      } else {
        toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Êtes-vous sûr de vouloir demander la suppression de votre compte ? Cette action sera effective dans 30 jours.')) return;

    startTransition(async () => {
      const result = await requestAccountDeletion();
      if (result.status === 'success') {
        toast({ title: 'Demande enregistrée', description: result.message });
        // Refresh profile to show scheduled deletion
        const supabase = createClient();
        const { data } = await supabase.from('profiles').select('deletion_scheduled_at').eq('id', profile?.id).single();
        if (data && profile) {
          setProfile({ ...profile, deletion_scheduled_at: data.deletion_scheduled_at });
        }
      } else {
        toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
      }
    });
  };

  if (loading) return <ProfileSkeleton />;

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-24 flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center shadow-2xl border-none bg-card/50 backdrop-blur-sm">
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Connexion requise</h1>
          <p className="text-muted-foreground mb-8">
            Rejoignez la communauté pour gérer votre profil, vos avis et vos favoris.
          </p>
          <Button asChild size="lg" className="w-full rounded-full shadow-lg">
            <Link href="/login">Se connecter</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const userName = profile?.full_name || 'Utilisateur';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const reviewCount = reviews.length;
  const helpfulVotes = reviews.reduce((acc, review) => acc + (review.likes || 0), 0);
  const contributorLevel = reviewCount >= 10 ? 'Expert' : reviewCount >= 5 ? 'Confirmé' : 'Débutant';

  const userStats = [
    { label: 'Avis écrits', value: reviewCount, icon: Star, color: 'text-amber-500' },
    { label: 'Votes utiles', value: helpfulVotes, icon: ThumbsUp, color: 'text-blue-500' },
    { label: 'Niveau', value: contributorLevel, icon: Medal, color: 'text-emerald-500' },
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
                {profile?.tier && profile.tier !== 'none' && (
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
                    Depuis {new Date(profile?.created_at || Date.now()).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {profile?.business_id && (
                <Button size="lg" className="rounded-full shadow-lg bg-gradient-to-r from-primary to-accent hover:shadow-xl transition-all" asChild>
                  <Link href="/dashboard">
                    <SettingsIcon className="mr-2 h-5 w-5" />
                    Ma Console Pro
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

          {/* Main Content Tabs */}
          <Tabs defaultValue="reviews" className="space-y-8">
            <div className="flex justify-center md:justify-start overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
              <TabsList className="bg-muted/50 p-1.5 rounded-full border border-border/50 backdrop-blur-sm h-14 w-full md:w-auto">
                <TabsTrigger value="reviews" className="rounded-full px-6 py-2.5 flex gap-2 h-full data-[state=active]:bg-background data-[state=active]:shadow-md">
                  <Star className="w-4 h-4" />
                  Mes Avis
                </TabsTrigger>
                <TabsTrigger value="saved" className="rounded-full px-6 py-2.5 flex gap-2 h-full data-[state=active]:bg-background data-[state=active]:shadow-md">
                  <Heart className="w-4 h-4" />
                  Favoris
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-full px-6 py-2.5 flex gap-2 h-full data-[state=active]:bg-background data-[state=active]:shadow-md">
                  <Edit className="w-4 h-4" />
                  Profil
                </TabsTrigger>
                <TabsTrigger value="security" className="rounded-full px-6 py-2.5 flex gap-2 h-full data-[state=active]:bg-background data-[state=active]:shadow-md">
                  <ShieldCheck className="w-4 h-4" />
                  Sécurité
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB: REVIEWS */}
            <TabsContent value="reviews" className="space-y-6">
              {/* Sorting Controls */}
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Mes Avis ({sortedReviews.length})</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Trier par:</span>
                  <Select value={sortOption} onValueChange={(value: any) => setSortOption(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Plus récents</SelectItem>
                      <SelectItem value="oldest">Plus anciens</SelectItem>
                      <SelectItem value="helpful">Plus utiles</SelectItem>
                      <SelectItem value="rating">Meilleure note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {sortedReviews.length === 0 ? (
                <Card className="border-2 border-dashed border-muted bg-transparent p-12 text-center">
                  <div className="bg-muted p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Star className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Zéro avis pour l'instant</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-8 text-lg">
                    Partagez votre expérience et aidez les autres à trouver les meilleures adresses du Maroc !
                  </p>
                  <Button asChild size="lg" className="rounded-full shadow-lg">
                    <Link href="/">Lancer ma première recherche</Link>
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {sortedReviews.map((review) => (
                    <Card key={review.id} className="border-none shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                      <div className="flex flex-col md:flex-row h-full">
                        <div className="w-full md:w-3 bg-gradient-to-b from-primary/60 to-accent/60 group-hover:from-primary group-hover:to-accent transition-all duration-500" />
                        <div className="flex-1 p-8">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div>
                              <h3 className="text-2xl font-bold mb-1 text-foreground">{review.title || 'Avis sur entreprise'}</h3>
                              <div className="flex items-center flex-wrap gap-2 text-sm">
                                <span className="text-muted-foreground">Établissement:</span>
                                <Link
                                  href={`/businesses/${review.business_id}`}
                                  className="font-bold text-primary hover:text-accent transition-colors underline decoration-primary/20 underline-offset-4"
                                >
                                  {review.business_name}
                                </Link>
                                <span className="text-muted-foreground">• {new Date(review.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
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
                                  <Badge className="bg-primary hover:bg-primary border-none">Réponse Pro</Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">le {new Date(review.owner_reply_date!).toLocaleDateString()}</span>
                              </div>
                              <p className="text-foreground/80 font-medium">
                                {review.owner_reply}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-6 border-t border-border/50">
                            <div className="flex gap-4">
                              <VoteButtons
                                reviewId={review.id}
                                initialLikes={review.likes}
                                initialDislikes={review.dislikes}
                              />
                            </div>
                            <ReviewReportDialog reviewId={review.id} businessId={review.business_id} />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB: SAVED */}
            <TabsContent value="saved" className="space-y-6">
              {savedBusinesses.length === 0 ? (
                <Card className="border-2 border-dashed border-muted bg-transparent p-12 text-center">
                  <div className="bg-muted p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Heart className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Vos favoris sont vides</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-8 text-lg">
                    Gardez une trace des lieux que vous adorez ou que vous projetez de visiter au Maroc.
                  </p>
                  <Button asChild size="lg" className="rounded-full shadow-lg">
                    <Link href="/">Explorer les adresses</Link>
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {savedBusinesses.map((business) => (
                    <BusinessCard key={business.id} business={business} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB: SETTINGS */}
            <TabsContent value="settings">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm">
                    <CardHeader className="border-b border-border/50 p-8">
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <UserIcon className="w-6 h-6 text-primary" />
                        Informations Personnelles
                      </CardTitle>
                      <CardDescription className="text-base">
                        Gérez vos informations de compte et l'affichage de votre profil public.
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
                                <FormLabel className="text-base font-bold">Nom d'affichage</FormLabel>
                                <FormControl>
                                  <Input {...field} className="h-12 border-muted-foreground/20 focus:border-primary focus:ring-primary/20 rounded-xl" placeholder="Votre nom complet" />
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
                                <FormLabel className="text-base font-bold">Adresse Email</FormLabel>
                                <FormControl>
                                  <Input type="email" {...field} className="h-12 border-muted-foreground/20 focus:border-primary focus:ring-primary/20 rounded-xl" placeholder="votre@email.com" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex justify-end pt-6 border-t border-border/50 gap-4">
                          <Button variant="outline" type="button" onClick={() => form.reset()} disabled={isPending} className="rounded-full h-12 px-6">
                            Réinitialiser
                          </Button>
                          <Button type="submit" disabled={isPending} className="rounded-full h-12 px-8 shadow-lg bg-primary hover:scale-[1.02] transition-transform">
                            {isPending ? (
                              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Enregistrement...</>
                            ) : (
                              'Sauvegarder les changements'
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
                        Préférences de communication
                      </CardTitle>
                      <CardDescription>Choisissez les emails que vous souhaitez recevoir.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                      <div className="space-y-6">
                        <FormField
                          control={form.control}
                          name="email_preferences.marketing"
                          render={({ field }) => (
                            <div className="flex items-center justify-between py-4 border-b border-border/50">
                              <div className="space-y-0.5">
                                <Label className="text-base">Actualités & Offres</Label>
                                <p className="text-sm text-muted-foreground">Recevez nos dernières nouveautés et offres spéciales.</p>
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
                                <Label className="text-base">Réponses aux avis</Label>
                                <p className="text-sm text-muted-foreground">Soyez notifié quand une entreprise répond à votre avis.</p>
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
                                <Label className="text-base">Notifications Système</Label>
                                <p className="text-sm text-muted-foreground">Alertes sur la sécurité et le fonctionnement de votre compte.</p>
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
                                <Label className="text-base">Mises à jour des revendications</Label>
                                <p className="text-sm text-muted-foreground">Suivez l'état de vos demandes de gestion d'entreprises.</p>
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
            </TabsContent>

            {/* TAB: SECURITY */}
            <TabsContent value="security" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="w-5 h-5 text-blue-500" />
                      Export des données
                    </CardTitle>
                    <CardDescription>Téléchargez une copie de vos données personnelles</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground mb-6 text-sm">
                      Vous recevrez un fichier JSON contenant votre profil, vos avis et vos entreprises favorites.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl py-6 h-auto border-blue-200 hover:bg-blue-50 transition-colors"
                      onClick={handleExportData}
                      disabled={isPending}
                    >
                      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                      Exporter mes données
                    </Button>
                  </CardContent>
                </Card>

                <Card className={`border-none shadow-xl ${profile?.deletion_scheduled_at ? 'bg-amber-50 border border-amber-200' : 'bg-destructive/5 border border-destructive/10'}`}>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${profile?.deletion_scheduled_at ? 'text-amber-600' : 'text-destructive'}`}>
                      <AlertCircle className="w-5 h-5" />
                      {profile?.deletion_scheduled_at ? 'Suppression planifiée' : 'Zone de danger'}
                    </CardTitle>
                    <CardDescription>
                      {profile?.deletion_scheduled_at
                        ? `Votre compte sera supprimé le ${new Date(profile.deletion_scheduled_at).toLocaleDateString('fr-FR')}`
                        : 'Suppression définitive du compte'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {profile?.deletion_scheduled_at ? (
                      <div className="space-y-4">
                        <p className="text-amber-700 text-sm">
                          Votre compte est actuellement en attente de suppression. Vous pouvez annuler cette demande en contactant le support ou en changeant vos paramètres (bientôt disponible).
                        </p>
                        <Button variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-100" disabled>
                          <Undo className="mr-2 h-4 w-4" />
                          Annuler la suppression
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-muted-foreground mb-6 text-sm">
                          Cette action supprimera tous vos avis, favoris et données personnelles. Un délai de 30 jours est appliqué avant la suppression effective.
                        </p>
                        <Button
                          variant="destructive"
                          className="w-full rounded-xl py-6 h-auto font-bold"
                          onClick={handleDeleteAccount}
                          disabled={isPending}
                        >
                          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          Supprimer mon compte
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
