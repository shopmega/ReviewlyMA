'use client';

import MultiBusinessDashboard from '@/components/dashboard/MultiBusinessDashboard';
import ConsolidatedAnalytics from '@/components/dashboard/ConsolidatedAnalytics';
import { useBusiness } from '@/contexts/BusinessContext';

export default function CompaniesPage() {
    const { allBusinesses } = useBusiness();
    const businessIds = allBusinesses.map(b => b.id);

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Mes Établissements</h1>
                    <p className="text-muted-foreground">
                        Gérez toutes vos entreprises et vos abonnements.
                    </p>
                </div>
            </div>

            {/* Show consolidated analytics if user has more than 1 business */}
            {allBusinesses.length > 1 && (
                <ConsolidatedAnalytics businessIds={businessIds} />
            )}

            <MultiBusinessDashboard />
        </div>
    );
}
