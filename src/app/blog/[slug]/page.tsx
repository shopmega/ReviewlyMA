import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Link2 } from 'lucide-react';
import { getServerSiteUrl } from '@/lib/site-config';
import { getAllBlogPosts, getBlogPostBySlug, getBlogPostSlugs } from '@/lib/blog-playbooks';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams() {
  return getBlogPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) {
    return {
      title: 'Blog article | Reviewly MA',
    };
  }

  const siteUrl = getServerSiteUrl();
  return {
    title: `${post.title} | Reviewly MA`,
    description: post.description,
    alternates: {
      canonical: `${siteUrl}/blog/${post.slug}`,
    },
  };
}

export default async function BlogArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) {
    notFound();
  }

  const related = getAllBlogPosts().filter((item) => item.slug !== post.slug).slice(0, 3);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4">
        <Badge variant={post.category === 'pillar' ? 'secondary' : 'outline'} className="w-fit">
          {post.category === 'pillar' ? 'Pillar guide' : 'How-to guide'}
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold font-headline">{post.title}</h1>
        <p className="text-muted-foreground max-w-3xl">{post.description}</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Published: {new Date(post.publishedAt).toLocaleDateString('fr-MA')}</span>
          <span>Updated: {new Date(post.updatedAt).toLocaleDateString('fr-MA')}</span>
          <span>Read time: {post.readTimeMinutes} min</span>
        </div>
        <Button asChild variant="outline">
          <Link href="/blog" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to blog
          </Link>
        </Button>
      </section>

      <Card className="rounded-2xl">
        <CardContent className="pt-6 space-y-4">
          <p className="text-base leading-7">{post.intro}</p>
        </CardContent>
      </Card>

      <InternalAdsSlot placement="referrals_top_banner" />

      {post.sections.map((section, sectionIndex) => (
        <div key={section.heading} className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">{section.heading}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.paragraphs.map((paragraph, index) => (
                <p key={`${section.heading}-${index}`} className="text-sm text-muted-foreground leading-7">
                  {paragraph}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
          {sectionIndex === 1 ? <InternalAdsSlot placement="referrals_inline" /> : null}
        </div>
      ))}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-xl">
            <Link2 className="h-5 w-5" />
            Required cluster links
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {post.clusterLinks.map((link) => (
            <Button key={`${post.slug}-${link.href}`} asChild variant="outline">
              <Link href={link.href} className="inline-flex items-center gap-2">
                {link.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl">Related guides</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {related.map((item) => (
            <Link key={item.slug} href={`/blog/${item.slug}`} className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-2">{item.readTimeMinutes} min read</p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <InternalAdsSlot placement="referrals_inline" />
    </div>
  );
}
