import Link from 'next/link';
import { verifyAdminSession, createAdminClient } from '@/lib/supabase/admin';
import { submitBlogArticleAction, setBlogArticleStatusAction, deleteBlogArticleAction } from '@/app/actions/blog-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Rocket, Trash2 } from 'lucide-react';

type AdminBlogArticleRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: 'pillar' | 'how_to' | 'analysis' | 'report';
  content_md: string;
  cluster_links: unknown;
  read_time_minutes: number;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  updated_at: string;
  created_at: string;
};

function clusterLinksToText(raw: unknown): string {
  if (!Array.isArray(raw)) return '';
  return raw
    .map((entry: any) => {
      const label = String(entry?.label || '').trim();
      const href = String(entry?.href || '').trim();
      if (!href) return '';
      return `${label || href}|${href}`;
    })
    .filter(Boolean)
    .join('\n');
}

export default async function AdminBlogPage() {
  await verifyAdminSession();
  const admin = await createAdminClient();

  const { data } = await admin
    .from('blog_articles')
    .select('id, slug, title, description, category, content_md, cluster_links, read_time_minutes, status, published_at, updated_at, created_at')
    .order('created_at', { ascending: false })
    .limit(120);

  const rows = (data || []) as AdminBlogArticleRow[];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Badge variant="outline" className="w-fit">Blog CMS</Badge>
        <h1 className="text-3xl font-black tracking-tight">Gestion des articles blog</h1>
        <p className="text-muted-foreground">
          Creez, mettez a jour et publiez des articles sans modifier le code.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Nouvel article
          </CardTitle>
          <CardDescription>
            Format cluster links: une ligne par lien, sous la forme <code>Label|/path</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={submitBlogArticleAction} className="grid grid-cols-1 gap-3">
            <Input name="title" placeholder="Titre" required />
            <Input name="slug" placeholder="slug-article (optionnel, auto-genere depuis le titre)" />
            <Input name="description" placeholder="Description SEO (40-320 caracteres)" required />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select name="category" className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue="how_to">
                <option value="pillar">pillar</option>
                <option value="how_to">how_to</option>
                <option value="analysis">analysis</option>
                <option value="report">report</option>
              </select>
              <select name="status" className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue="draft">
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
              <Input name="read_time_minutes" type="number" min={1} max={60} defaultValue={6} />
            </div>
            <Textarea
              name="cluster_links"
              placeholder={'Referral Demand Dashboard|/referral-demand\nSalary Intelligence Hub|/salary'}
              rows={4}
            />
            <Textarea name="content_md" placeholder="Contenu markdown..." rows={12} required />
            <Button type="submit" className="w-fit">
              Enregistrer l&apos;article
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {rows.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-10 text-center text-muted-foreground">
              Aucun article CMS pour le moment.
            </CardContent>
          </Card>
        ) : (
          rows.map((row) => (
            <Card key={row.id} className="rounded-2xl">
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{row.status}</Badge>
                  <Badge variant="outline">{row.category}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(row.updated_at).toLocaleString('fr-MA')}
                  </span>
                </div>
                <CardTitle className="text-xl">{row.title}</CardTitle>
                <CardDescription>{row.slug}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <form action={submitBlogArticleAction} className="grid grid-cols-1 gap-3">
                  <input type="hidden" name="id" value={row.id} />
                  <Input name="title" defaultValue={row.title} required />
                  <Input name="slug" defaultValue={row.slug} required />
                  <Input name="description" defaultValue={row.description} required />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select name="category" className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={row.category}>
                      <option value="pillar">pillar</option>
                      <option value="how_to">how_to</option>
                      <option value="analysis">analysis</option>
                      <option value="report">report</option>
                    </select>
                    <select name="status" className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={row.status}>
                      <option value="draft">draft</option>
                      <option value="published">published</option>
                      <option value="archived">archived</option>
                    </select>
                    <Input name="read_time_minutes" type="number" min={1} max={60} defaultValue={row.read_time_minutes} />
                  </div>
                  <Textarea name="cluster_links" rows={4} defaultValue={clusterLinksToText(row.cluster_links)} />
                  <Textarea name="content_md" rows={10} defaultValue={row.content_md} required />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" variant="outline">Mettre a jour</Button>
                    <Button type="button" asChild variant="secondary">
                      <Link href={`/blog/${row.slug}`} target="_blank">
                        Voir public
                      </Link>
                    </Button>
                  </div>
                </form>

                <div className="flex flex-wrap gap-2 pt-2">
                  <form action={setBlogArticleStatusAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="slug" value={row.slug} />
                    <input type="hidden" name="status" value="published" />
                    <Button type="submit" size="sm">
                      <Rocket className="h-4 w-4 mr-1" />
                      Publier
                    </Button>
                  </form>
                  <form action={setBlogArticleStatusAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="slug" value={row.slug} />
                    <input type="hidden" name="status" value="draft" />
                    <Button type="submit" size="sm" variant="outline">Passer en draft</Button>
                  </form>
                  <form action={deleteBlogArticleAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="slug" value={row.slug} />
                    <Button type="submit" size="sm" variant="destructive">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Supprimer
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
