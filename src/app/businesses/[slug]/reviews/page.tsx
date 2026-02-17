import { notFound } from "next/navigation";
import { getBusinessBySlug } from "@/lib/data/businesses";
import { ReviewsPageClient } from "@/components/business/ReviewsPageClient";
import { Metadata } from "next";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const business = await getBusinessBySlug(slug);

    if (!business) return {};

    return {
        title: `Avis ${business.name} - Tous les commentaires employés | Reviewly`,
        description: `Découvrez tous les avis anonymes des employés de ${business.name} à ${business.city}. Salaires, management et ambiance de travail.`,
    };
}

export default async function BusinessReviewsPage({ params }: PageProps) {
    const { slug } = await params;

    // 1. Fetch Data
    const business = await getBusinessBySlug(slug);

    if (!business) {
        notFound();
    }

    return <ReviewsPageClient business={business} />;
}
