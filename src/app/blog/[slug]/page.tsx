import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Link2 } from 'lucide-react';
import { getServerSiteUrl } from '@/lib/site-config';
import { getMergedBlogPostBySlug, getMergedBlogPostSlugs, getMergedBlogPosts } from '@/lib/data';
import { InternalAdsSlot } from '@/components/shared/InternalAdsSlot';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Params = { slug: string };
type MarkdownBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; text: string };

function parseSimpleMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.split('\n').map((line) => line.trim());
  const blocks: MarkdownBlock[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: 'list', items: listItems });
      listItems = [];
    }
  };

  for (const line of lines) {
    if (!line) {
      flushList();
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      blocks.push({ type: 'heading', level: 2, text: line.slice(3).trim() });
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      blocks.push({ type: 'heading', level: 3, text: line.slice(4).trim() });
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(line.slice(2).trim());
      continue;
    }

    flushList();
    blocks.push({ type: 'paragraph', text: line });
  }

  flushList();
  return blocks;
}

export async function generateStaticParams() {
  const slugs = await getMergedBlogPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getMergedBlogPostBySlug(slug);
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
  const post = await getMergedBlogPostBySlug(slug);
  if (!post) {
    notFound();
  }

  const related = (await getMergedBlogPosts()).filter((item) => item.slug !== post.slug).slice(0, 3);
  const markdownBlocks = post.contentMd ? parseSimpleMarkdown(post.contentMd) : [];
  const isPillar = post.category === 'pillar';
  const categoryLabelMap: Record<string, string> = {
    pillar: 'Pillar guide',
    how_to: 'How-to guide',
    analysis: 'Analysis',
    report: 'Report',
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4">
        <Badge variant={isPillar ? 'secondary' : 'outline'} className="w-fit">
          {categoryLabelMap[post.category] || 'Article'}
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
          {post.source === 'static' && post.staticPost ? (
            <p className="text-base leading-7">{post.staticPost.intro}</p>
          ) : (
            <p className="text-base leading-7">Article publie depuis le CMS blog.</p>
          )}
        </CardContent>
      </Card>

      <InternalAdsSlot placement="referrals_top_banner" />

      {post.source === 'static' && post.staticPost ? (
        post.staticPost.sections.map((section, sectionIndex) => (
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
        ))
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="pt-6 space-y-4">
            {markdownBlocks.map((block, index) => {
              if (block.type === 'heading') {
                if (block.level === 2) {
                  return <h2 key={`h2-${index}`} className="text-2xl font-semibold">{block.text}</h2>;
                }
                return <h3 key={`h3-${index}`} className="text-xl font-semibold">{block.text}</h3>;
              }

              if (block.type === 'list') {
                return (
                  <ul key={`list-${index}`} className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {block.items.map((item, itemIndex) => (
                      <li key={`li-${index}-${itemIndex}`}>{item}</li>
                    ))}
                  </ul>
                );
              }

              return (
                <p key={`p-${index}`} className="text-sm text-muted-foreground leading-7">
                  {block.text}
                </p>
              );
            })}
          </CardContent>
        </Card>
      )}

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
