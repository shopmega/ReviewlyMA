'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewsSection } from '@/components/business/ReviewsSection';
import { SalarySection } from '@/components/business/SalarySection';
import type { Business, SalaryEntry, SalaryStats } from '@/lib/types';

type BusinessInsightsTabsProps = {
  business: Business;
  enableSalaries: boolean;
  salaryStats: SalaryStats;
  salaryEntries: SalaryEntry[];
  salaryRoles?: string[];
  salaryDepartments?: string[];
  salaryIntervals?: Array<{ id: string; label: string; min: number; max: number }>;
};

export function BusinessInsightsTabs({
  business,
  enableSalaries,
  salaryStats,
  salaryEntries,
  salaryRoles = [],
  salaryDepartments = [],
  salaryIntervals = [],
}: BusinessInsightsTabsProps) {
  return (
    <section className="space-y-4" id="insights">
      <Tabs defaultValue="reviews" className="space-y-6">
        <TabsList className="h-12 rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="reviews" className="rounded-lg px-5 font-semibold">
            Avis
          </TabsTrigger>
          {enableSalaries && (
            <TabsTrigger value="salaries" className="rounded-lg px-5 font-semibold">
              Salaires
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="reviews" className="mt-0">
          <ReviewsSection business={business} />
        </TabsContent>

        {enableSalaries && (
          <TabsContent value="salaries" className="mt-0">
            <SalarySection
              businessId={business.id}
              businessCity={business.city}
              stats={salaryStats}
              salaries={salaryEntries}
              roles={salaryRoles}
              departments={salaryDepartments}
              intervals={salaryIntervals}
            />
          </TabsContent>
        )}
      </Tabs>
    </section>
  );
}
