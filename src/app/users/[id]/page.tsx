
import { getUserProfile, getUserReviews, getStoragePublicUrl } from '@/lib/data';
import { notFound } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, MessageSquare, Star } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function UserProfilePage({ params }: PageProps) {
    const resolvedParams = await params;
    const user = await getUserProfile(resolvedParams.id);

    if (!user) {
        notFound();
    }

    const reviews = await getUserReviews(resolvedParams.id);

    // Formatting date safely
    const joinDate = user.created_at
        ? format(new Date(user.created_at), 'MMMM yyyy', { locale: fr })
        : 'Date inconnue';

    // Stats
    const reviewCount = reviews.length;
    // Calculate helpful votes (likes) if available, otherwise just count reviews
    const totalLikes = reviews.reduce((acc: number, review: any) => acc + (review.likes || 0), 0);

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="container max-w-4xl mx-auto px-4">

                {/* Profile Header */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border mb-8 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                    <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                        <AvatarImage src={user.avatar_url || ''} alt={user.full_name} />
                        <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-blue-600 text-white">
                            {user.full_name?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                        <div className="flex flex-col md:flex-row items-center gap-3">
                            <h1 className="text-3xl font-bold font-headline">{user.full_name}</h1>
                            {user.is_premium && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                                    Membre Premium
                                </Badge>
                            )}
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground mt-2">
                            <div className="flex items-center gap-1">
                                <CalendarDays className="h-4 w-4" />
                                Membre depuis {joinDate}
                            </div>
                        </div>

                        <div className="flex justify-center md:justify-start gap-6 mt-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold">{reviewCount}</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wide">Avis</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold">{totalLikes}</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wide">J'aime reçus</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reviews Section */}
                <h2 className="text-2xl font-bold font-headline mb-6 flex items-center gap-2">
                    <MessageSquare className="h-6 w-6 text-primary" />
                    Avis publiés ({reviewCount})
                </h2>

                <div className="space-y-4">
                    {reviews.length > 0 ? (
                        reviews.map((review: any) => (
                            <Card key={review.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-start mb-4">
                                        <Link href={`/businesses/${review.business.slug}`} className="group">
                                            <div className="flex items-center gap-3">
                                                {review.business.logo_url && (
                                                    <img
                                                        src={getStoragePublicUrl(review.business.logo_url) || ''}
                                                        alt={review.business.name}
                                                        className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                                                    />
                                                )}
                                                <div>
                                                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                                                        {review.business.name}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {review.business.city} • {review.business.category}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                        <div className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-full text-amber-700 border border-amber-100 shrink-0 self-start">
                                            <span className="font-bold">{review.rating}</span>
                                            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                                        </div>
                                    </div>

                                    <p className="text-gray-700 leading-relaxed max-w-none prose-sm">
                                        {review.content}
                                    </p>

                                    <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm text-muted-foreground">
                                        <span>Publié le {format(new Date(review.created_at), 'd MMMM yyyy', { locale: fr })}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <MessageSquare className="h-8 w-8" />
                            </div>
                            <h3 className="font-semibold text-lg">Aucun avis publié</h3>
                            <p className="text-muted-foreground">Cet utilisateur n'a pas encore partagé d'avis.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
