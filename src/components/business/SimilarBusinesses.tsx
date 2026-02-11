import { SimilarBusinessesServer } from './SimilarBusinessesServer';
import { Business } from '@/lib/types';

interface SimilarBusinessesProps {
    business: Business;
}

export function SimilarBusinesses({ business }: SimilarBusinessesProps) {
    if (!business.category || !business.city) return null;

    return (
        <SimilarBusinessesServer
            category={business.category}
            subcategory={business.subcategory}
            city={business.city}
            currentBusinessId={business.id}
        />
    );
}
