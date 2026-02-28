import { getPublicClient } from './client';
import {
  BlogLink,
  BlogPost,
  getAllBlogPosts,
  getBlogPostBySlug,
  getBlogPostSlugs,
} from '@/lib/blog-playbooks';

export type BlogCategory = 'pillar' | 'how_to' | 'analysis' | 'report';

export type CmsBlogArticle = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: BlogCategory;
  content_md: string;
  cluster_links: unknown;
  read_time_minutes: number;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UnifiedBlogPost = {
  slug: string;
  title: string;
  description: string;
  category: BlogCategory;
  publishedAt: string;
  updatedAt: string;
  readTimeMinutes: number;
  clusterLinks: BlogLink[];
  source: 'static' | 'cms';
  staticPost?: BlogPost;
  contentMd?: string;
};

function normalizeClusterLinks(raw: unknown): BlogLink[] {
  if (!Array.isArray(raw)) return [];

  const links: BlogLink[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const href = String((entry as any).href || '').trim();
    if (!href.startsWith('/')) continue;
    const label = String((entry as any).label || href).trim() || href;
    links.push({ href, label });
  }
  return links;
}

function normalizeCmsCategory(raw: string): BlogCategory {
  if (raw === 'pillar' || raw === 'analysis' || raw === 'report') return raw;
  return 'how_to';
}

export async function getPublishedCmsBlogArticles(limit = 200): Promise<CmsBlogArticle[]> {
  try {
    const supabase = getPublicClient();
    const { data, error } = await supabase
      .from('blog_articles')
      .select('id, slug, title, description, category, content_md, cluster_links, read_time_minutes, status, published_at, created_at, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return (data as CmsBlogArticle[]).filter((article) => article.slug && article.title);
  } catch {
    return [];
  }
}

export async function getMergedBlogPosts(): Promise<UnifiedBlogPost[]> {
  const staticPosts = getAllBlogPosts();
  const cmsPosts = await getPublishedCmsBlogArticles();

  const bySlug = new Map<string, UnifiedBlogPost>();

  for (const post of staticPosts) {
    bySlug.set(post.slug, {
      slug: post.slug,
      title: post.title,
      description: post.description,
      category: post.category,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      readTimeMinutes: post.readTimeMinutes,
      clusterLinks: post.clusterLinks,
      source: 'static',
      staticPost: post,
    });
  }

  for (const article of cmsPosts) {
    bySlug.set(article.slug, {
      slug: article.slug,
      title: article.title,
      description: article.description,
      category: normalizeCmsCategory(article.category),
      publishedAt: article.published_at || article.created_at,
      updatedAt: article.updated_at || article.created_at,
      readTimeMinutes: article.read_time_minutes,
      clusterLinks: normalizeClusterLinks(article.cluster_links),
      source: 'cms',
      contentMd: article.content_md,
    });
  }

  return [...bySlug.values()].sort(
    (a, b) => Date.parse(b.publishedAt || b.updatedAt) - Date.parse(a.publishedAt || a.updatedAt)
  );
}

export async function getMergedBlogPostBySlug(slug: string): Promise<UnifiedBlogPost | null> {
  if (!slug) return null;

  const cmsPosts = await getPublishedCmsBlogArticles();
  const cmsMatch = cmsPosts.find((article) => article.slug === slug);
  if (cmsMatch) {
    return {
      slug: cmsMatch.slug,
      title: cmsMatch.title,
      description: cmsMatch.description,
      category: normalizeCmsCategory(cmsMatch.category),
      publishedAt: cmsMatch.published_at || cmsMatch.created_at,
      updatedAt: cmsMatch.updated_at || cmsMatch.created_at,
      readTimeMinutes: cmsMatch.read_time_minutes,
      clusterLinks: normalizeClusterLinks(cmsMatch.cluster_links),
      source: 'cms',
      contentMd: cmsMatch.content_md,
    };
  }

  const staticMatch = getBlogPostBySlug(slug);
  if (!staticMatch) return null;

  return {
    slug: staticMatch.slug,
    title: staticMatch.title,
    description: staticMatch.description,
    category: staticMatch.category,
    publishedAt: staticMatch.publishedAt,
    updatedAt: staticMatch.updatedAt,
    readTimeMinutes: staticMatch.readTimeMinutes,
    clusterLinks: staticMatch.clusterLinks,
    source: 'static',
    staticPost: staticMatch,
  };
}

export async function getMergedBlogPostSlugs(): Promise<string[]> {
  const staticSlugs = new Set(getBlogPostSlugs());
  const cmsPosts = await getPublishedCmsBlogArticles();

  for (const article of cmsPosts) {
    if (article.slug) staticSlugs.add(article.slug);
  }

  return [...staticSlugs];
}
