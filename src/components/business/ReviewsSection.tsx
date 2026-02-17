'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import SharedReviewsSection from '@/components/shared/ReviewsSection';
import { Business } from '@/lib/types';

interface ReviewsSectionProps {
    business: Business;
}

export function ReviewsSection({ business }: ReviewsSectionProps) {
    return (
        <section id="reviews" className="glass-card p-6 md:p-8 rounded-2xl border border-border/50 shadow-sm">
            <SharedReviewsSection business={business} />

            {business.reviews && business.reviews.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border/50 text-center">
                    <Button variant="outline" asChild className="rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/5 group">
                        <Link href={`/businesses/${business.id}/reviews`}>
                            Voir tous les {business.reviews.length} avis sur {business.name}
                            <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </Button>
                </div>
            )}
        </section>
    );
}
