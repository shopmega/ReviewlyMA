import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, ArrowUpRight, Target } from 'lucide-react';
import { createOutreachLead, getAdminBusinessOpportunities } from '@/app/actions/admin-opportunities';
import { revalidatePath } from 'next/cache';

function formatActionBadge(action: 'outreach' | 'upgrade' | 'monitor') {
  if (action === 'outreach') {
    return <Badge className="bg-blue-500/10 text-blue-700 border-blue-200">Outreach</Badge>;
  }

  if (action === 'upgrade') {
    return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200">Upgrade</Badge>;
  }

  return <Badge variant="secondary">Monitor</Badge>;
}

export default async function AdminOpportunitesPage() {
  async function createLeadAction(formData: FormData) {
    'use server';
    const businessId = String(formData.get('business_id') || '');
    if (!businessId) return;
    await createOutreachLead({ businessId });
    revalidatePath('/admin/opportunites');
  }

  const result = await getAdminBusinessOpportunities({ limit: 30, page: 1 });

  const outreachCount = result.data.filter((row) => row.recommended_action === 'outreach').length;
  const upgradeCount = result.data.filter((row) => row.recommended_action === 'upgrade').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Opportunites Business</h1>
        <p className="text-muted-foreground mt-2">
          Classement des entreprises a fort potentiel pour conversion premium ou outreach de claim.
        </p>
      </div>

      {result.warning ? (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Schema non deploye</p>
              <p className="text-sm text-amber-800 mt-1">{result.warning}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total opportunities</CardDescription>
            <CardTitle className="text-3xl">{result.count}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outreach target</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{outreachCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upgrade target</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">{upgradeCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Prioritized Businesses
          </CardTitle>
          <CardDescription>Top 30 by acquisition and upgrade score.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views 30d</TableHead>
                <TableHead>Leads 30d</TableHead>
                <TableHead>Rating 30d</TableHead>
                <TableHead>Acquisition</TableHead>
                <TableHead>Upgrade</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Workflow</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                    No opportunity data yet.
                  </TableCell>
                </TableRow>
              ) : (
                result.data.map((row) => (
                  <TableRow key={row.business_id}>
                    <TableCell>
                      <div className="font-semibold">{row.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[row.city, row.category].filter(Boolean).join(' • ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={row.is_claimed ? 'default' : 'outline'}>
                          {row.is_claimed ? 'Claimed' : 'Unclaimed'}
                        </Badge>
                        <Badge variant={row.is_premium ? 'default' : 'secondary'}>
                          {row.is_premium ? 'Premium' : 'Non premium'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{row.views_30d}</TableCell>
                    <TableCell>{row.leads_30d}</TableCell>
                    <TableCell>{Number(row.avg_rating_30d || 0).toFixed(1)}</TableCell>
                    <TableCell>{Number(row.acquisition_score || 0).toFixed(1)}</TableCell>
                    <TableCell>{Number(row.upgrade_score || 0).toFixed(1)}</TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-2">
                        {formatActionBadge(row.recommended_action)}
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.recommended_action === 'outreach' ? (
                        <form action={createLeadAction}>
                          <input type="hidden" name="business_id" value={row.business_id} />
                          <Button type="submit" size="sm" variant="outline">
                            Create Lead
                          </Button>
                        </form>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
