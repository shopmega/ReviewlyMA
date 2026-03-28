import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, FileText, LineChart, NotebookPen } from 'lucide-react';
import { getServerSiteUrl } from '@/lib/site-config';
import { ENABLE_BLOG_HUB_INDEXING } from '@/lib/seo-ia';
import { getMergedBlogPosts } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getServerTranslator } from '@/lib/i18n/server';
import { ContentShareButton } from '@/components/shared/ContentShareButton';
import { PageIntro } from '@/components/shared/PageIntro';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  const siteUrl = getServerSiteUrl();

  return {
    title: t('blogPage.metaTitle', 'Blog | Reviewly'),
    description: 'Guides and analysis to evaluate employers through reviews, salaries, and company signals.',
    alternates: { canonical: `${siteUrl}/blog` },
    robots: {
      index: ENABLE_BLOG_HUB_INDEXING,
      follow: true,
    },
  };
}

export default async function BlogHubPage() {
  const { t, tf, locale } = await getServerTranslator();
  const posts = await getMergedBlogPosts();
  const dateLocale = locale === 'fr' ? 'fr-MA' : 'en-US';

  if (posts.length === 0) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
        <PageIntro
          badge={<Badge variant="outline" className="w-fit">{t('blogPage.badge', 'Editorial Hub')}</Badge>}
          title={t('blogPage.title', 'Blog and playbooks')}
          description={t('blogPage.empty', 'No article has been published yet.')}
        />
      </div>
    );
  }

  const pillar = posts.find((post) => post.category === 'pillar') || posts[0];
  const guides = posts.filter((post) => post.slug !== pillar.slug);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-8">
      <PageIntro
        badge={<Badge variant="outline" className="w-fit">{t('blogPage.badge', 'Editorial Hub')}</Badge>}
        title={t('blogPage.title', 'Blog and playbooks')}
        description="Guides and analysis connecting reviews, salaries, company research, and operational insights."
      />

      <Card className="rounded-2xl border-border">
        <CardHeader className="space-y-3">
          <Badge className="w-fit" variant="secondary">{t('blogPage.pillarBadge', 'Pillar guide')}</Badge>
          <CardTitle className="text-2xl">{pillar.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{pillar.description}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>
              {tf('blogPage.published', 'Published: {date}', {
                date: new Date(pillar.publishedAt).toLocaleDateString(dateLocale),
              })}
            </span>
            <span>{tf('blogPage.readTime', 'Read time: {minutes} min', { minutes: pillar.readTimeMinutes })}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href={`/blog/${pillar.slug}`} className="inline-flex items-center gap-2">
                {t('blogPage.readPillarCta', 'Read pillar guide')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <ContentShareButton
              url={`${getServerSiteUrl()}/blog/${pillar.slug}`}
              title={`${pillar.title} | Reviewly`}
              text={pillar.description}
              contentType="blog_post"
              contentId={pillar.slug}
              cardType="blog_hub_pillar"
              label={t('blogPage.shareLabel', 'Share')}
            />
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <NotebookPen className="h-4 w-4" />
              {t('blogPage.cards.howToTitle', 'How-to guides')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Practical playbooks for company research, applications, and product usage.</CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <LineChart className="h-4 w-4" />
              {t('blogPage.cards.dataTitle', 'Data insights')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Analysis built from review, salary, and employer signals.</CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              {t('blogPage.cards.reportsTitle', 'Reports linking')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{t('blogPage.cards.reportsDesc', 'Monthly reports and sector snapshots to strengthen your research.')}</CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold font-headline">{t('blogPage.guidesTitle', 'How-to guides')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guides.map((post) => (
            <Card key={post.slug} className="rounded-2xl">
              <CardHeader className="space-y-2">
                <CardTitle className="text-xl">{post.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{post.description}</p>
                <p className="text-xs text-muted-foreground">
                  {tf('blogPage.guideMeta', '{date} | {minutes} min', {
                    date: new Date(post.publishedAt).toLocaleDateString(dateLocale),
                    minutes: post.readTimeMinutes,
                  })}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/blog/${post.slug}`} className="inline-flex items-center gap-2">
                      {t('blogPage.readGuideCta', 'Read guide')}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <ContentShareButton
                    url={`${getServerSiteUrl()}/blog/${post.slug}`}
                    title={`${post.title} | Reviewly`}
                    text={post.description}
                    contentType="blog_post"
                    contentId={post.slug}
                    cardType="blog_hub_card"
                    label={t('blogPage.shareLabel', 'Share')}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/companies">Open company hub</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/companies">Browse companies</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/salaires">Explore salaries</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/job-offers">Open job-offer analysis</Link>
        </Button>
      </div>
    </div>
  );
}
