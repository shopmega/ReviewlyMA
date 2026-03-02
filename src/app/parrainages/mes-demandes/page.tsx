import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { blockReferralUserForm, sendReferralMessageForm, updateReferralRequestStatusForm } from '@/app/actions/referrals';
import { getServerTranslator } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

type MyRequest = {
  id: string;
  offer_id: string;
  message: string | null;
  status: string;
  created_at: string;
  cv_url: string | null;
  offer: {
    id: string;
    company_name: string;
    job_title: string;
    status: string;
    user_id: string;
  } | null;
};

type ReferralMessage = {
  id: string;
  request_id: string;
  sender_user_id: string;
  message: string;
  created_at: string;
};

type MyRequestRow = Omit<MyRequest, 'offer'> & {
  offer:
    | {
        id: string;
        company_name: string;
        job_title: string;
        status: string;
        user_id: string;
      }
    | {
        id: string;
        company_name: string;
        job_title: string;
        status: string;
        user_id: string;
      }[]
    | null;
};

export default async function MyReferralRequestsPage() {
  const { t, tf, locale } = await getServerTranslator();
  const dateLocale = locale === 'fr' ? 'fr-MA' : locale === 'ar' ? 'ar-MA' : 'en-US';

  const REQUEST_STATUS_LABELS: Record<string, string> = {
    pending: t('referralMyRequestsPage.status.pending', 'Sent'),
    in_review: t('referralMyRequestsPage.status.inReview', 'In review'),
    referred: t('referralMyRequestsPage.status.referred', 'Referred'),
    interview: t('referralMyRequestsPage.status.interview', 'Interview'),
    hired: t('referralMyRequestsPage.status.hired', 'Hired'),
    rejected: t('referralMyRequestsPage.status.rejected', 'Rejected'),
    withdrawn: t('referralMyRequestsPage.status.withdrawn', 'Withdrawn'),
  };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect('/login?next=/parrainages/mes-demandes');
  }

  const { data } = await supabase
    .from('job_referral_requests')
    .select(`
      id,
      offer_id,
      message,
      status,
      created_at,
      cv_url,
      offer:job_referral_offers!offer_id (
        id,
        company_name,
        job_title,
        status,
        user_id
      )
    `)
    .eq('candidate_user_id', auth.user.id)
    .order('created_at', { ascending: false });

  const requests = ((data || []) as MyRequestRow[]).map((request) => ({
    ...request,
    offer: Array.isArray(request.offer) ? (request.offer[0] ?? null) : request.offer,
  }));

  let messages: ReferralMessage[] = [];
  if (requests.length > 0) {
    const requestIds = requests.map((r) => r.id);
    const { data: messageData } = await supabase
      .from('job_referral_messages')
      .select('id, request_id, sender_user_id, message, created_at')
      .in('request_id', requestIds)
      .order('created_at', { ascending: true });
    messages = (messageData || []) as ReferralMessage[];
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">{t('referralMyRequestsPage.title', 'My referral requests')}</h1>
        <p className="text-sm text-muted-foreground">{t('referralMyRequestsPage.subtitle', 'Track your request status and withdraw if needed.')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">{t('referralMyRequestsPage.kpis.total', 'Total')}</p>
            <p className="text-2xl font-semibold">{requests.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">{t('referralMyRequestsPage.kpis.pending', 'Pending')}</p>
            <p className="text-2xl font-semibold">{requests.filter((r) => ['pending', 'in_review'].includes(r.status)).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">{t('referralMyRequestsPage.kpis.activeReferrals', 'Active referrals')}</p>
            <p className="text-2xl font-semibold">{requests.filter((r) => ['referred', 'interview'].includes(r.status)).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">{t('referralMyRequestsPage.kpis.hires', 'Hires')}</p>
            <p className="text-2xl font-semibold">{requests.filter((r) => r.status === 'hired').length}</p>
          </CardContent>
        </Card>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">{t('referralMyRequestsPage.empty', 'No requests yet.')}</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-xl">{request.offer?.job_title || t('referralMyRequestsPage.fallback.offer', 'Offer')}</CardTitle>
                  <Badge variant="outline">{request.offer?.company_name || t('referralMyRequestsPage.fallback.company', 'Company')}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{REQUEST_STATUS_LABELS[request.status] || request.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {tf('referralMyRequestsPage.submittedOn', 'Submitted on {date}', {
                      date: new Date(request.created_at).toLocaleDateString(dateLocale),
                    })}
                  </span>
                  {['pending', 'in_review'].includes(request.status) ? (
                    <span className="text-xs text-amber-700">{t('referralMyRequestsPage.responseEta', 'Expected response within 72h')}</span>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {request.message ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.message}</p> : null}
                <div className="flex flex-wrap gap-2">
                  {request.offer ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/parrainages/${request.offer.id}`}>{t('referralMyRequestsPage.actions.viewOffer', 'View offer')}</Link>
                    </Button>
                  ) : null}
                  {request.cv_url ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={request.cv_url} target="_blank">{t('referralMyRequestsPage.actions.viewCv', 'View my CV')}</Link>
                    </Button>
                  ) : null}
                  {!['withdrawn', 'hired', 'rejected'].includes(request.status) && (
                    <form action={updateReferralRequestStatusForm}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="status" value="withdrawn" />
                      <Button type="submit" size="sm" variant="destructive">
                        {t('referralMyRequestsPage.actions.withdraw', 'Withdraw my request')}
                      </Button>
                    </form>
                  )}
                  {request.offer?.user_id ? (
                    <form action={blockReferralUserForm}>
                      <input type="hidden" name="offerId" value={request.offer.id} />
                      <input type="hidden" name="blockedUserId" value={request.offer.user_id} />
                      <input type="hidden" name="reason" value="blocked_by_candidate" />
                      <Button type="submit" size="sm" variant="destructive">
                        {t('referralMyRequestsPage.actions.blockRecruiter', 'Block recruiter')}
                      </Button>
                    </form>
                  ) : null}
                </div>

                <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('referralMyRequestsPage.conversation.title', 'Conversation')}</p>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {messages.filter((m) => m.request_id === request.id).length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t('referralMyRequestsPage.conversation.empty', 'No messages yet.')}</p>
                    ) : (
                      messages
                        .filter((m) => m.request_id === request.id)
                        .map((m) => {
                          const isMe = m.sender_user_id === auth.user.id;
                          return (
                            <div key={m.id} className={`rounded-md px-3 py-2 text-sm ${isMe ? 'bg-primary/10 ml-6' : 'bg-background mr-6 border'}`}>
                              <p className="text-xs text-muted-foreground mb-1">
                                {isMe ? t('referralMyRequestsPage.conversation.you', 'You') : t('referralMyRequestsPage.conversation.recruiter', 'Recruiter')} - {new Date(m.created_at).toLocaleDateString(dateLocale)}
                              </p>
                              <p className="whitespace-pre-wrap">{m.message}</p>
                            </div>
                          );
                        })
                    )}
                  </div>
                  {!['withdrawn', 'hired', 'rejected'].includes(request.status) ? (
                    <form action={sendReferralMessageForm} className="space-y-2">
                      <input type="hidden" name="requestId" value={request.id} />
                      <textarea
                        name="message"
                        required
                        minLength={2}
                        className="min-h-[72px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder={t('referralMyRequestsPage.conversation.placeholder', 'Send a message to the recruiter...')}
                      />
                      <div className="flex justify-end">
                        <Button type="submit" size="sm">{t('referralMyRequestsPage.conversation.send', 'Send')}</Button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
