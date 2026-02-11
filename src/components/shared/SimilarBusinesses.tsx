import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin } from 'lucide-react';
import { Business } from '@/lib/types';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SimilarBusinessesProps {
    similarBusinesses: Business[];
    city: string;
}

export function SimilarBusinesses({ similarBusinesses, city }: SimilarBusinessesProps) {
    if (similarBusinesses.length === 0) return null;

    return (
        <section className="mt-12">
            <h2 className="text-2xl font-bold font-headline mb-6">Établissements similaires à {city}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {similarBusinesses.map((business) => (
                    <Link key={business.id} href={`/businesses/${business.id}`} className="group">
                        <Card className="h-full overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300">
                            <div className="relative h-48 w-full overflow-hidden">
                                {business.cover_url || (business.photos && business.photos.length > 0) ? (
                                    <Image
                                        src={business.cover_url || business.photos?.[0]?.imageUrl || ''}
                                        alt={business.name}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                                        <span className="text-2xl font-bold opacity-20">{business.name[0]}</span>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <Badge className="bg-white/90 text-black backdrop-blur-sm shadow-sm hover:bg-white">
                                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                                        {business.overallRating.toFixed(1)}
                                    </Badge>
                                </div>
                            </div>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {business.quartier || business.city}
                                    </span>
                                    <span>•</span>
                                    <span>{business.category}</span>
                                </div>
                                <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                                    {business.name}
                                </h3>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </section>
    );
}
