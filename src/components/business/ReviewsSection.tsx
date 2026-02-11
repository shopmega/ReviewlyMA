'use client';

import SharedReviewsSection from '@/components/shared/ReviewsSection';
import { Business } from '@/lib/types';

interface ReviewsSectionProps {
    business: Business;
}

export function ReviewsSection({ business }: ReviewsSectionProps) {
    return (
        <section id="reviews" className="glass-card p-6 md:p-8 rounded-2xl border border-border/50 shadow-sm">
            <SharedReviewsSection business={business} />
        </section>
    );
}
