import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { AlertTriangle, Eye, Globe2, Link2, SearchCheck, ShieldAlert } from 'lucide-react';
import {
  backfillJobOfferCompanyMatches,
  getAdminJobOfferMappingQueue,
  getAdminJobOfferReviewQueue,
  moderateJobOffer,
  relinkJobOfferBusiness,
} from '@/app/actions/admin-job-offers';
import { verifyAdminPermission } from '@/lib/supabase/admin';
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

function formatJobOfferStatus(value: 'pending' | 'approved' | 'rejected' | 'flagged') {
  if (value === 'approved') return <Badge className="border-emerald-200 bg-emerald-500/10 text-emerald-700">Approved</Badge>;
  if (value === 'rejected') return <Badge className="border-rose-200 bg-rose-500/10 text-rose-700">Rejected</Badge>;
  if (value === 'flagged') return <Badge className="border-amber-200 bg-amber-500/10 text-amber-700">Flagged</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

function formatJobOfferVisibility(value: 'private' | 'aggregate_only' | 'public') {
  if (value === 'public') return <Badge className="border-sky-200 bg-sky-500/10 text-sky-700">Public</Badge>;
  if (value === 'aggregate_only') return <Badge className="border-violet-200 bg-violet-500/10 text-violet-700">Aggregate only</Badge>;
  return <Badge variant="outline">Private</Badge>;
}

function formatConfidence(value: 'high' | 'medium' | 'low' | 'none') {
  if (value === 'high') return <Badge className="border-emerald-200 bg-emerald-500/10 text-emerald-700">High</Badge>;
  if (value === 'medium') return <Badge className="border-amber-200 bg-amber-500/10 text-amber-700">Medium</Badge>;
  if (value === 'low') return <Badge className="border-rose-200 bg-rose-500/10 text-rose-700">Low</Badge>;
  return <Badge variant="secondary">None</Badge>;
}

export default async function AdminJobOffersPage() {
  await verifyAdminPermission('moderation.job_offer.review');

  async function moderateAction(formData: FormData) {
    'use server';
    await moderateJobOffer(formData);
    revalidatePath('/admin/job-offers');
  }

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

  const [reviewQueue, mappingQueue] = await Promise.all([
    getAdminJobOfferReviewQueue(60),
    getAdminJobOfferMappingQueue(60),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Job Offer Moderation Console</h1>
        <p className="mt-2 text-muted-foreground">
          Review publication state, public visibility, and employer mapping before job-offer analyses feed live business signals.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending review</CardDescription>
            <CardTitle className="text-3xl">{reviewQueue.summary.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Public</CardDescription>
            <CardTitle className="text-3xl text-sky-600">{reviewQueue.summary.approvedPublic}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aggregate only</CardDescription>
            <CardTitle className="text-3xl text-violet-600">{reviewQueue.summary.approvedAggregateOnly}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved but hidden</CardDescription>
            <CardTitle className="text-3xl text-slate-700">{reviewQueue.summary.approvedPrivate}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rejected</CardDescription>
            <CardTitle className="text-3xl text-rose-600">{reviewQueue.summary.rejected}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-sky-200 bg-sky-50/50">
        <CardContent className="flex items-start gap-3 pt-6">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-sky-600" />
          <div className="text-sm text-sky-900">
            <span className="font-semibold">Aggregate only</span> feeds employer-level hiring signals without exposing an individual public offer.
            <span className="font-semibold"> Public</span> is safe only when the source is clean and the employer mapping is trustworthy.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Moderation queue
          </CardTitle>
          <CardDescription>Recent job offers with live publication controls.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Offer</TableHead>
                <TableHead>Moderation</TableHead>
                <TableHead>Employer mapping</TableHead>
                <TableHead>Analysis</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewQueue.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No job offers available for moderation right now.
                  </TableCell>
                </TableRow>
              ) : (
                reviewQueue.rows.map((row) => (
                  <TableRow key={row.job_offer_id}>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <div className="font-semibold">{row.company_name}</div>
                        <div className="text-sm text-muted-foreground">{row.job_title}</div>
                        <div className="text-xs text-muted-foreground">
                          {[row.city, new Date(row.submitted_at).toLocaleDateString('fr-MA')].filter(Boolean).join(' - ')}
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
                        <div className="flex flex-wrap gap-2">
                          {formatJobOfferStatus(row.status)}
                          {formatJobOfferVisibility(row.visibility)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          approved: <span className="font-medium">{row.approved_at ? new Date(row.approved_at).toLocaleDateString('fr-MA') : 'no'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          rejected: <span className="font-medium">{row.rejected_at ? new Date(row.rejected_at).toLocaleDateString('fr-MA') : 'no'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-2">
                        {formatConfidence(row.company_match_confidence)}
                        <div className="text-xs text-muted-foreground">
                          method: <span className="font-medium">{row.company_match_method}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          business: <span className="font-medium">{row.business_id || 'unlinked'}</span>
                        </div>
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
                      <div className="space-y-2">
                        <form action={moderateAction}>
                          <input type="hidden" name="job_offer_id" value={row.job_offer_id} />
                          <input type="hidden" name="decision" value="approve_aggregate_only" />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="w-full"
                            disabled={row.status === 'approved' && row.visibility === 'aggregate_only'}
                          >
                            Aggregate only
                          </Button>
                        </form>
                        <form action={moderateAction}>
                          <input type="hidden" name="job_offer_id" value={row.job_offer_id} />
                          <input type="hidden" name="decision" value="approve_public" />
                          <Button
                            type="submit"
                            size="sm"
                            className="w-full"
                            disabled={row.status === 'approved' && row.visibility === 'public'}
                          >
                            <Globe2 className="mr-2 h-3.5 w-3.5" />
                            Publish public
                          </Button>
                        </form>
                        <form action={moderateAction}>
                          <input type="hidden" name="job_offer_id" value={row.job_offer_id} />
                          <input type="hidden" name="decision" value="unpublish_private" />
                          <Button
                            type="submit"
                            size="sm"
                            variant="secondary"
                            className="w-full"
                            disabled={row.status === 'approved' && row.visibility === 'private'}
                          >
                            Unpublish to private
                          </Button>
                        </form>
                        <form action={moderateAction}>
                          <input type="hidden" name="job_offer_id" value={row.job_offer_id} />
                          <input type="hidden" name="decision" value="reject" />
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            className="w-full text-rose-600"
                            disabled={row.status === 'rejected'}
                          >
                            Reject
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
              {mappingQueue.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No mapping queue items right now.
                  </TableCell>
                </TableRow>
              ) : (
                mappingQueue.rows.map((row) => (
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
        <CardContent className="flex items-start gap-3 pt-6 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          Manual relinks should be reserved for clear employer matches. If the source company is still uncertain, keep the offer
          unlinked and prefer aggregate-only publication until confidence is corrected.
        </CardContent>
      </Card>
    </div>
  );
}
