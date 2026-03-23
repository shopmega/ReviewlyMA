import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { AlertTriangle, Link2, SearchCheck, ShieldAlert } from 'lucide-react';
import {
  backfillJobOfferCompanyMatches,
  getAdminJobOfferMappingQueue,
  relinkJobOfferBusiness,
} from '@/app/actions/admin-job-offers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatConfidence(value: 'high' | 'medium' | 'low' | 'none') {
  if (value === 'high') return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200">High</Badge>;
  if (value === 'medium') return <Badge className="bg-amber-500/10 text-amber-700 border-amber-200">Medium</Badge>;
  if (value === 'low') return <Badge className="bg-rose-500/10 text-rose-700 border-rose-200">Low</Badge>;
  return <Badge variant="secondary">None</Badge>;
}

export default async function AdminJobOffersPage() {
  async function relinkAction(formData: FormData) {
    'use server';
    await relinkJobOfferBusiness(formData);
    revalidatePath('/admin/job-offers');
  }

  async function backfillAction(formData: FormData) {
    'use server';
    await backfillJobOfferCompanyMatches(formData);
    revalidatePath('/admin/job-offers');
  }

  const result = await getAdminJobOfferMappingQueue(60);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Job Offer Mapping Queue</h1>
        <p className="text-muted-foreground mt-2">
          Review unresolved or low-confidence employer mappings before they affect business-level analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rows in queue</CardDescription>
            <CardTitle className="text-3xl">{result.summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unresolved</CardDescription>
            <CardTitle className="text-3xl text-rose-600">{result.summary.unresolved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Medium confidence</CardDescription>
            <CardTitle className="text-3xl text-amber-600">{result.summary.mediumConfidence}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Low or none</CardDescription>
            <CardTitle className="text-3xl text-slate-700">{result.summary.lowConfidence}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-6 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-900">
            Only high-confidence mappings should feed public business-page hiring signals. Manual relinks here set the job offer
            mapping method to <span className="font-semibold">manual</span> and record a moderation event.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automated backfill</CardTitle>
          <CardDescription>
            Re-run company matching for older unlinked offers. This only auto-links high-confidence matches and refreshes queue diagnostics.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Safe for maintenance: it reviews unlinked offers only, records moderation events, and leaves ambiguous matches in the queue.
          </p>
          <form action={backfillAction} className="flex items-center gap-3">
            <input type="hidden" name="limit" value="75" />
            <Button type="submit">Backfill 75 unlinked offers</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SearchCheck className="h-5 w-5" />
            Mapping review queue
          </CardTitle>
          <CardDescription>Recent unresolved or ambiguous job offers.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Offer</TableHead>
                <TableHead>Mapping</TableHead>
                <TableHead>Suggested businesses</TableHead>
                <TableHead>Scores</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No mapping queue items right now.
                  </TableCell>
                </TableRow>
              ) : (
                result.rows.map((row) => (
                  <TableRow key={row.job_offer_id}>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <div className="font-semibold">{row.company_name}</div>
                        <div className="text-sm text-muted-foreground">{row.job_title}</div>
                        <div className="text-xs text-muted-foreground">
                          {[row.city, row.status].filter(Boolean).join(' - ')}
                        </div>
                        {row.source_url ? (
                          <Link href={row.source_url} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <Link2 className="h-3.5 w-3.5" />
                            Source
                          </Link>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-2">
                        {formatConfidence(row.company_match_confidence)}
                        <div className="text-xs text-muted-foreground">
                          method: <span className="font-medium">{row.company_match_method}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          current business: <span className="font-medium">{row.business_id || 'unlinked'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-2">
                        {row.candidate_businesses.length > 0 ? row.candidate_businesses.map((candidate) => (
                          <div key={`${row.job_offer_id}-${candidate.businessId}`} className="rounded-xl border bg-muted/30 p-3">
                            <div className="font-medium">{candidate.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {candidate.businessId} - score {candidate.score} - {candidate.reason}
                            </div>
                            <form action={relinkAction} className="mt-2">
                              <input type="hidden" name="job_offer_id" value={row.job_offer_id} />
                              <input type="hidden" name="business_id" value={candidate.businessId} />
                              <Button type="submit" size="sm" variant="outline">
                                Link candidate
                              </Button>
                            </form>
                          </div>
                        )) : (
                          <div className="text-sm text-muted-foreground">No candidates stored.</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1 text-sm">
                        <div>Offer score: {row.overall_offer_score != null ? Math.round(row.overall_offer_score) : 'N/A'}</div>
                        <div>Clarity: {row.transparency_score != null ? Math.round(row.transparency_score) : 'N/A'}</div>
                        <div>Verdict: {row.market_position_label || 'N/A'}</div>
                        <div>Analysis confidence: {row.confidence_level || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-3">
                        <form action={relinkAction} className="space-y-2">
                          <input type="hidden" name="job_offer_id" value={row.job_offer_id} />
                          <input
                            type="text"
                            name="business_id"
                            placeholder="business id"
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                          />
                          <Button type="submit" size="sm" className="w-full">
                            Link manual id
                          </Button>
                        </form>
                        <form action={relinkAction}>
                          <input type="hidden" name="job_offer_id" value={row.job_offer_id} />
                          <input type="hidden" name="business_id" value="" />
                          <Button type="submit" size="sm" variant="ghost" className="w-full text-rose-600">
                            Unlink
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="pt-6 flex items-start gap-3 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          Manual relinks should be reserved for clear employer matches. If the source company is still uncertain, keep the offer
          unlinked so it does not contaminate employer-level analytics.
        </CardContent>
      </Card>
    </div>
  );
}
