import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, FileText, LineChart, NotebookPen } from 'lucide-react';
import { getServerSiteUrl } from '@/lib/site-config';
import { getAllBlogPosts } from '@/lib/blog-playbooks';
import { ENABLE_BLOG_HUB_INDEXING } from '@/lib/seo-ia';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getServerSiteUrl();
  return {
    title: 'Blog | Reviewly MA',
    description: 'Editorial guides and referral execution playbooks.',
    alternates: { canonical: `${siteUrl}/blog` },
    robots: {
      index: ENABLE_BLOG_HUB_INDEXING,
      follow: true,
    },
  };
}

export default function BlogHubPage() {
  const posts = getAllBlogPosts();
  const pillar = posts.find((post) => post.category === 'pillar') || posts[0];
  const guides = posts.filter((post) => post.slug !== pillar.slug);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-3">
        <Badge variant="outline" className="w-fit">Editorial Hub</Badge>
        <h1 className="text-3xl md:text-4xl font-bold font-headline">Blog and playbooks</h1>
        <p className="text-muted-foreground max-w-3xl">
          Guides and playbooks that connect referral-demand signals, salary intelligence, company targeting, and monthly reports.
        </p>
      </section>

      <Card className="rounded-2xl border-border">
        <CardHeader className="space-y-3">
          <Badge className="w-fit" variant="secondary">Pillar guide</Badge>
          <CardTitle className="text-2xl">{pillar.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{pillar.description}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Published: {new Date(pillar.publishedAt).toLocaleDateString('fr-MA')}</span>
            <span>Read time: {pillar.readTimeMinutes} min</span>
          </div>
          <Button asChild>
            <Link href={`/blog/${pillar.slug}`} className="inline-flex items-center gap-2">
              Read pillar guide
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <NotebookPen className="h-4 w-4" />
              How-to guides
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Tactiques de demande de parrainage et templates actionnables.
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <LineChart className="h-4 w-4" />
              Data insights
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Analyses interpretees a partir des signaux de demande et de salaires.
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Reports linking
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Connexions directes avec les rapports mensuels pour renforcer l&apos;autorite topique.
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold font-headline">How-to guides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guides.map((post) => (
            <Card key={post.slug} className="rounded-2xl">
              <CardHeader className="space-y-2">
                <CardTitle className="text-xl">{post.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{post.description}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(post.publishedAt).toLocaleDateString('fr-MA')} | {post.readTimeMinutes} min
                </p>
                <Button asChild variant="outline">
                  <Link href={`/blog/${post.slug}`} className="inline-flex items-center gap-2">
                    Read guide
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/reports">Voir les rapports</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/referral-demand/roles">Top demand roles</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/referral-demand/cities">Top demand cities</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/referral-demand">Voir le dashboard referral demand</Link>
        </Button>
      </div>
    </div>
  );
}
