import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Building2, Star, Users2 } from 'lucide-react';
import { getServerSiteUrl } from '@/lib/site-config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getServerSiteUrl();
  return {
    title: 'Company Insights | Reviewly',
    description: 'Research employers through reviews, referral activity, and salary context.',
    alternates: { canonical: `${siteUrl}/companies` },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default function CompanyHubPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4">
        <Badge variant="outline" className="w-fit">Company Insights</Badge>
        <h1 className="text-3xl md:text-4xl font-bold font-headline">Research a company from trust, salary, and referral signals</h1>
        <p className="text-muted-foreground max-w-3xl">
          Reviewly helps you evaluate employers from multiple angles: employee reviews, referral activity, and market context
          before you target a company.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="rounded-xl">
            <Link href="/businesses">
              Explore company pages
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/parrainages">Explore referrals</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader>
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Employer reputation</CardTitle>
            <CardDescription>Read reviews, ratings, and business details to understand the employer experience.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/businesses">Browse companies</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <Users2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Referral activity</CardTitle>
            <CardDescription>Find active referral offers and demand boards tied to real company targeting.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/parrainages">Open referral marketplace</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <Star className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Salary context</CardTitle>
            <CardDescription>Pair company research with salary guides and market reports before you commit.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/salaires">Open salary insights</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
