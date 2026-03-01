'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin';
import { REQUIRED_CLUSTER_LINKS } from '@/lib/blog-playbooks';

export type BlogAdminActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
};

const DEFAULT_LINK_LABELS: Record<string, string> = {
  '/referral-demand': 'Referral Demand Dashboard',
  '/salary': 'Salary Intelligence Hub',
  '/companies': 'Company Insights Hub',
  '/reports': 'Monthly Reports',
};

function slugifyValue(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function parseClusterLinks(raw: string) {
  const links = new Map<string, { href: string; label: string }>();

  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    // format: label|/path
    const [labelRaw, hrefRaw] = line.split('|').map((part) => (part || '').trim());
    if (!hrefRaw || !hrefRaw.startsWith('/')) continue;
    const label = labelRaw || hrefRaw;
    links.set(hrefRaw, { href: hrefRaw, label });
  }

  for (const href of REQUIRED_CLUSTER_LINKS) {
    if (!links.has(href)) {
      links.set(href, { href, label: DEFAULT_LINK_LABELS[href] || href });
    }
  }

  return [...links.values()];
}

function normalizeClusterLinksFromUnknown(raw: unknown): { href: string; label: string }[] {
  if (typeof raw === 'string') {
    return parseClusterLinks(raw);
  }

  const links = new Map<string, { href: string; label: string }>();
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') continue;
      const href = String((entry as Record<string, unknown>).href || '').trim();
      if (!href.startsWith('/')) continue;
      const label = String((entry as Record<string, unknown>).label || href).trim() || href;
      links.set(href, { href, label });
    }
  }

  for (const href of REQUIRED_CLUSTER_LINKS) {
    if (!links.has(href)) {
      links.set(href, { href, label: DEFAULT_LINK_LABELS[href] || href });
    }
  }

  return [...links.values()];
}

function coerceReadTime(raw: string | null) {
  const value = Number(raw || '0');
  if (!Number.isFinite(value)) return 6;
  return Math.max(1, Math.min(60, Math.round(value)));
}

function normalizeStatus(raw: string | null): 'draft' | 'published' | 'archived' {
  const value = (raw || '').trim().toLowerCase();
  if (value === 'published' || value === 'archived') return value;
  return 'draft';
}

function normalizeCategory(raw: string | null): 'pillar' | 'how_to' | 'analysis' | 'report' {
  const value = (raw || '').trim().toLowerCase();
  if (value === 'pillar' || value === 'analysis' || value === 'report') return value;
  return 'how_to';
}

function requiredField(value: FormDataEntryValue | null, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

export async function upsertBlogArticleAction(
  _prevState: BlogAdminActionState,
  formData: FormData
): Promise<BlogAdminActionState> {
  try {
    const adminId = await verifyAdminSession();
    const admin = await createAdminClient();

    const articleId = requiredField(formData.get('id'));
    const title = requiredField(formData.get('title'));
    const description = requiredField(formData.get('description'));
    const contentMd = requiredField(formData.get('content_md'));
    const slugInput = requiredField(formData.get('slug'));
    const slug = slugifyValue(slugInput || title);
    const category = normalizeCategory(requiredField(formData.get('category')));
    const status = normalizeStatus(requiredField(formData.get('status')));
    const readTimeMinutes = coerceReadTime(requiredField(formData.get('read_time_minutes')));
    const clusterLinks = parseClusterLinks(requiredField(formData.get('cluster_links')));

    if (!title || !description || !contentMd || !slug) {
      return { status: 'error', message: 'Titre, description, contenu et slug sont obligatoires.' };
    }

    if (contentMd.length < 80) {
      return { status: 'error', message: 'Le contenu est trop court (minimum 80 caracteres).' };
    }

    const payload = {
      slug,
      title,
      description,
      category,
      content_md: contentMd,
      cluster_links: clusterLinks,
      read_time_minutes: readTimeMinutes,
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
      updated_by: adminId,
    };

    if (articleId) {
      const { error } = await admin
        .from('blog_articles')
        .update(payload)
        .eq('id', articleId);

      if (error) {
        return { status: 'error', message: `Erreur mise a jour: ${error.message}` };
      }
    } else {
      const { error } = await admin
        .from('blog_articles')
        .insert({
          ...payload,
          created_by: adminId,
        });

      if (error) {
        return { status: 'error', message: `Erreur creation: ${error.message}` };
      }
    }

    revalidatePath('/admin/blog');
    revalidatePath('/blog');
    revalidatePath(`/blog/${slug}`);
    revalidatePath('/sitemap.xml');

    return { status: 'success', message: articleId ? 'Article mis a jour.' : 'Article cree.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inattendue';
    return { status: 'error', message };
  }
}

export async function submitBlogArticleAction(formData: FormData): Promise<void> {
  await upsertBlogArticleAction({ status: 'idle', message: '' }, formData);
}

export async function setBlogArticleStatusAction(formData: FormData): Promise<void> {
  await verifyAdminSession();
  const admin = await createAdminClient();

  const id = requiredField(formData.get('id'));
  const slug = requiredField(formData.get('slug'));
  const status = normalizeStatus(requiredField(formData.get('status')));

  if (!id) {
    throw new Error('ID article manquant.');
  }

  const { error } = await admin
    .from('blog_articles')
    .update({
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Erreur statut: ${error.message}`);
  }

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath('/sitemap.xml');
}

export async function deleteBlogArticleAction(formData: FormData): Promise<void> {
  await verifyAdminSession();
  const admin = await createAdminClient();

  const id = requiredField(formData.get('id'));
  const slug = requiredField(formData.get('slug'));
  if (!id) {
    throw new Error('ID article manquant.');
  }

  const { error } = await admin
    .from('blog_articles')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Erreur suppression: ${error.message}`);
  }

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath('/sitemap.xml');
}

export async function bulkImportBlogArticlesAction(formData: FormData): Promise<void> {
  await verifyAdminSession();
  const admin = await createAdminClient();

  const rawJson = requiredField(formData.get('articles_json'));
  if (!rawJson) {
    throw new Error('Le JSON des articles est vide.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('JSON invalide. Verifiez la syntaxe.');
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Le JSON doit etre un tableau non vide d articles.');
  }

  const payload = parsed.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Article #${index + 1}: format invalide.`);
    }

    const row = item as Record<string, unknown>;
    const title = requiredField(String(row.title || ''));
    const description = requiredField(String(row.description || ''));
    const contentMd = requiredField(String(row.content_md || row.contentMd || ''));
    const slugInput = requiredField(String(row.slug || title));
    const slug = slugifyValue(slugInput);
    const category = normalizeCategory(requiredField(String(row.category || 'how_to')));
    const status = normalizeStatus(requiredField(String(row.status || 'draft')));
    const readTimeMinutes = coerceReadTime(String(row.read_time_minutes || row.readTimeMinutes || '6'));
    const clusterLinks = normalizeClusterLinksFromUnknown(row.cluster_links ?? row.clusterLinks ?? []);

    if (!title || !description || !contentMd || !slug) {
      throw new Error(`Article #${index + 1}: titre, description, contenu et slug sont obligatoires.`);
    }

    if (contentMd.length < 80) {
      throw new Error(`Article #${index + 1}: contenu trop court (minimum 80 caracteres).`);
    }

    return {
      slug,
      title,
      description,
      category,
      content_md: contentMd,
      cluster_links: clusterLinks,
      read_time_minutes: readTimeMinutes,
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
    };
  });

  const { error } = await admin
    .from('blog_articles')
    .upsert(payload, { onConflict: 'slug' });

  if (error) {
    throw new Error(`Import echoue: ${error.message}`);
  }

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
  revalidatePath('/sitemap.xml');
}
