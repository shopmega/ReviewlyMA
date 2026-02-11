'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/shared/StarRating";
import { Skeleton } from "@/components/ui/skeleton";
import { VoteButtons } from "@/components/shared/VoteButtons";
import { ReviewReportDialog } from "@/components/shared/ReviewReportDialog";
import { ReviewSubRatings } from "@/components/shared/ReviewSubRatings";
import { MessageSquare, CornerDownRight, Percent, AlertCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import Link from 'next/link';
import { getAuthorDisplayName } from '@/lib/utils/anonymous-reviews';

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
    sub_ratings?: {
        service?: number;
        quality?: number;
        value?: number;
        ambiance?: number;
    };
};

type Business = {
    id: string;
    name: string;
};

function ReviewCardSkeleton() {
    return (
        <Card className="border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-28" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            </CardContent>
        </Card>
    );
}

export default function ReviewsPage() {
    const { businessId, loading: profileLoading, error: profileError } = useBusinessProfile();
    const [business, setBusiness] = useState<Business | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'rating' | 'helpful'>('newest');
    const [loading, setLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyText, setReplyText] = useState('');

    // Sort reviews based on selected option
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
            return sorted.sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));
        default:
            return sorted;
        }
    }, [reviews, sortOption]);
    const { toast } = useToast();

    useEffect(() => {
        if (profileLoading || !businessId) return;
        if (profileError) {
            setLoading(false);
            return;
        }

        async function fetchData() {
            const supabase = createClient();

            // Fetch business info
            const { data: businessData, error: businessError } = await supabase
                .from('businesses')
                .select('id, name')
                .eq('id', businessId)
                .single();

            if (businessError || !businessData) {
                setLoading(false);
                return;
            }

            setBusiness(businessData);

            // Fetch reviews for this business
            const { data: reviewsData, error: reviewsError } = await supabase
                .from('reviews')
                .select('id, rating, title, content, author_name, is_anonymous, user_id, date, likes, dislikes, owner_reply, owner_reply_date, sub_ratings')
                .eq('business_id', businessId)
                .order('date', { ascending: false });

            if (reviewsError) {
                console.error('Error fetching reviews:', reviewsError?.message || reviewsError || 'Unknown error');
            } else {
                setReviews(reviewsData || []);
            }

            setLoading(false);
        }

        fetchData();
    }, [businessId, profileLoading, profileError]);

    const handleReplySubmit = async (reviewId: number) => {
        const supabase = createClient();

        const { error } = await supabase
            .from('reviews')
            .update({
                owner_reply: replyText,
                owner_reply_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', reviewId);

        if (error) {
            toast({
                title: "Erreur",
                description: "Impossible d'envoyer la réponse.",
                variant: "destructive"
            });
        } else {
            toast({
                title: "Réponse envoyée!",
                description: "Votre réponse est maintenant visible sur votre page."
            });
            // Update local state
            setReviews(prev => prev.map(r =>
                r.id === reviewId
                    ? { ...r, owner_reply: replyText, owner_reply_date: new Date().toISOString().split('T')[0] }
                    : r
            ));
        }
        setReplyingTo(null);
        setReplyText('');
    };

    const repliedReviews = reviews.filter(r => r.owner_reply).length;
    const totalReviews = reviews.length;
    const responseRate = totalReviews > 0 ? Math.round((repliedReviews / totalReviews) * 100) : 0;

    if (profileLoading || loading) {
        return <div className="space-y-6">{Array.from({ length: 3 }).map((_, i) => <ReviewCardSkeleton key={i} />)}</div>;
    }

    if (profileError || !business) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="p-4 bg-destructive/10 rounded-full text-destructive">
                    <AlertCircle className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold font-headline">Accès refusé</h1>
                <p className="text-muted-foreground">{profileError || "Erreur inconnue"}</p>
                <Button asChild>
                    <Link href="/pour-les-pros">Revendiquer une entreprise</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Gestion des Avis</h1>
                <p className="text-muted-foreground text-lg">
                    Consultez et répondez aux avis pour <span className="font-semibold text-foreground">{business.name}</span>.
                </p>
                {totalReviews > 0 && (
                    <Card className="mt-6 border-none bg-gradient-to-r from-primary/10 to-transparent">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="bg-primary/20 p-2 rounded-full">
                                <Percent className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-sm font-medium">
                                Taux de réponse : <span className="font-bold text-primary text-lg">{responseRate}%</span>
                                <span className="text-muted-foreground ml-1">({repliedReviews}/{totalReviews} avis traités)</span>
                            </span>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="space-y-6">
                {/* Sorting Controls */}
                {totalReviews > 0 && (
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold">Avis clients ({sortedReviews.length})</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Trier par:</span>
                            <Select value={sortOption} onValueChange={(value: any) => setSortOption(value)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Plus récents</SelectItem>
                                    <SelectItem value="oldest">Plus anciens</SelectItem>
                                    <SelectItem value="rating">Meilleure note</SelectItem>
                                    <SelectItem value="helpful">Plus utiles</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
                {totalReviews === 0 ? (
                    <Card className="flex flex-col items-center justify-center text-center p-12 border-dashed bg-card/40">
                        <div className="bg-muted p-4 rounded-full mb-4">
                            <MessageSquare className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-xl mb-2 font-headline">Aucun avis pour le moment</CardTitle>
                        <CardDescription>Les avis de vos clients apparaîtront ici.</CardDescription>
                    </Card>
                ) : (
                    sortedReviews.map((review) => (
                        <Card key={review.id} className="border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-md transition-all hover:shadow-lg">
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg font-bold font-headline leading-tight">
                                            {review.title || 'Avis sans titre'}
                                        </CardTitle>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span className="font-medium text-foreground">
                                                {getAuthorDisplayName(
                                                    review, 
                                                    'pro', // Business owner role
                                                    null, // No current user context in this component
                                                    null  // No business owner ID context
                                                )}
                                            </span>
                                            <span>•</span>
                                            <span>{new Date(review.date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <StarRating rating={review.rating} readOnly />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-foreground/90 leading-relaxed text-sm lg:text-base">
                                    "{review.content || 'Pas de commentaire.'}"
                                </p>



                                {review.owner_reply && (
                                    <div className="bg-primary/5 p-4 rounded-xl ml-4 border-l-2 border-primary">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CornerDownRight className="w-4 h-4 text-primary" />
                                            <h4 className="font-bold text-sm text-primary">Votre réponse</h4>
                                        </div>
                                        <p className="text-sm text-foreground/80 italic">{review.owner_reply}</p>
                                        <p className="text-xs text-right text-muted-foreground/60 mt-2">
                                            {review.owner_reply_date ? new Date(review.owner_reply_date).toLocaleDateString() : ''}
                                        </p>
                                    </div>
                                )}
                            </CardContent>

                            <CardContent className="pt-2 pb-2 bg-secondary/10 rounded-b-xl border-t border-border/20">
                              <div className="flex justify-between items-center">
                                <VoteButtons 
                                  reviewId={review.id} 
                                  initialLikes={review.likes} 
                                  initialDislikes={review.dislikes} 
                                />
                                <ReviewReportDialog reviewId={review.id} businessId={businessId || ''} />
                              </div>
                            </CardContent>

                            {!review.owner_reply && (
                                <CardFooter className="bg-black/5 dark:bg-white/5 p-4">
                                    {replyingTo === review.id ? (
                                        <div className="w-full space-y-3 animate-in slide-in-from-top-2 duration-200">
                                            <Label htmlFor={`reply-${review.id}`} className="font-semibold flex items-center gap-2 text-primary">
                                                <MessageSquare className="w-4 h-4" />
                                                Votre réponse
                                            </Label>
                                            <Textarea
                                                id={`reply-${review.id}`}
                                                placeholder="Remerciez l'auteur pour son avis..."
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                className="bg-background/80 min-h-[100px]"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" onClick={() => setReplyingTo(null)}>Annuler</Button>
                                                <Button onClick={() => handleReplySubmit(review.id)} className="font-bold">Publier</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button variant="outline" className="w-full sm:w-auto border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => setReplyingTo(review.id)}>
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                            Répondre
                                        </Button>
                                    )}
                                </CardFooter>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
