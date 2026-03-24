'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getSiteSettings } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Search, Plus, ArrowRight, CheckCircle2, Loader2, AlertTriangle, Info, Store, Crown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getStoragePublicUrl } from '@/lib/data';
import { isValidImageUrl } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/providers/i18n-provider';
import { getSiteName } from '@/lib/site-config';

type SearchBusiness = {
  id: string;
  name: string;
  location?: string | null;
  logo_url?: string | null;
  category?: string | null;
  is_claimed?: boolean;
};

export default function ClaimPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchBusiness[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<SearchBusiness | null>(null);
  const [siteName, setSiteName] = useState('Reviewly');
  const [userClaimStatus, setUserClaimStatus] = useState<'none' | 'pending' | 'approved'>('none');
  const [existingClaim, setExistingClaim] = useState<any>(null);
  const router = useRouter();
  const { t, tf, locale } = useI18n();
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US';

  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const settings = await getSiteSettings();
        setSiteName(getSiteName(settings));
      } catch (error) {
        console.error('Error fetching site settings:', error);
      }
    };
    fetchSiteSettings();
  }, [t]);

  useEffect(() => {
    const checkUserClaimStatus = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setUserClaimStatus('none');
          return;
        }

        const { data: claims, error } = await supabase
          .from('business_claims')
          .select('*, business:businesses(name, logo_url)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error checking claim status:', error);
          setUserClaimStatus('none');
          return;
        }

        if (claims && claims.length > 0) {
          const claim = claims[0];
          setExistingClaim(claim);
          const isVerified = claim.status === 'approved' || claim.claim_state === 'verified';
          const isPending = claim.status === 'pending' || claim.claim_state === 'verification_pending';

          if (isVerified) {
            setUserClaimStatus('approved');
            router.push('/dashboard');
            return;
          }
          if (isPending) {
            setUserClaimStatus('pending');
          }
        } else {
          setUserClaimStatus('none');
        }
      } catch (error) {
        console.error('Error checking user claim status:', error);
        setUserClaimStatus('none');
      }
    };

    checkUserClaimStatus();
  }, [router]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/businesses/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        setSearchResults((data.results || []) as SearchBusiness[]);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (userClaimStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-50 py-12">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <Store className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-3">{t('claimPage.pending.title', 'Claim in progress')}</h1>
            <p className="text-lg text-muted-foreground">
              {t('claimPage.pending.subtitle', 'Your claim request is currently being processed')}
            </p>
          </div>

          <Card className="border-2 border-amber-200 bg-amber-50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
                {t('claimPage.pending.cardTitle', 'Claim awaiting validation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg border">
                <p className="font-medium mb-2">{t('claimPage.pending.businessLabel', 'Business:')}</p>
                <p className="text-lg font-semibold">{existingClaim?.business?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {tf('claimPage.pending.submittedOn', 'Submitted on {date}', {
                    date: existingClaim?.created_at
                      ? new Date(existingClaim.created_at).toLocaleDateString(dateLocale)
                      : '-',
                  })}
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  {t('claimPage.pending.nextSteps.title', 'Next steps')}
                </h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>{t('claimPage.pending.nextSteps.step1', '- Our team verifies your request (24-48h)')}</li>
                  <li>{t('claimPage.pending.nextSteps.step2', '- You will receive an email after validation')}</li>
                  <li>{t('claimPage.pending.nextSteps.step3', '- Full dashboard access after approval')}</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-600" />
                  {t('claimPage.pending.limitTitle', 'Current limitation')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'claimPage.pending.limitDescription',
                    'Growth supports one business. Gold supports up to 5 businesses after approval.'
                  )}
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button asChild>
                  <Link href="/dashboard/pending">{t('claimPage.pending.actions.track', 'Track my request')}</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">{t('claimPage.pending.actions.backHome', 'Back to home')}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-50 py-12">
      <div className="container max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">{t('claimPage.header.title', 'Manage your business')}</h1>
          <p className="text-lg text-muted-foreground">
            {tf('claimPage.header.subtitle', 'Claim your {siteName} page and start managing customer reviews', {
              siteName,
            })}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <div className="bg-white rounded-lg p-6 border">
            <CheckCircle2 className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-semibold mb-2">{t('claimPage.benefits.reviewsTitle', 'Manage reviews')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('claimPage.benefits.reviewsDescription', 'Reply to customers and improve your reputation')}
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 border">
            <CheckCircle2 className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-semibold mb-2">{t('claimPage.benefits.updatesTitle', 'Share updates')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('claimPage.benefits.updatesDescription', 'Publish company news and events')}
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 border">
            <CheckCircle2 className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-semibold mb-2">{t('claimPage.benefits.widgetTitle', 'Embed widget')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('claimPage.benefits.widgetDescription', 'Show your reviews on your website')}
            </p>
          </div>
        </div>

        <Card className="border-2 border-blue-200 bg-blue-50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Info className="h-5 w-5" />
              {t('claimPage.notice.title', 'Important information')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Store className="h-4 w-4" />
                {t('claimPage.notice.oneBusinessTitle', 'One business per user')}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {t(
                  'claimPage.notice.oneBusinessDescription',
                  'Each user can currently claim one business to keep management quality high.'
                )}
              </p>
              <div className="bg-amber-50 p-3 rounded border border-amber-200">
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  <strong>{t('claimPage.notice.importantLabel', 'Important:')}</strong>
                  {t(
                    'claimPage.notice.importantText',
                    ' If you need to manage multiple businesses on one account, use a Gold plan.'
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">{t('claimPage.step1.title', 'Step 1: Find your business')}</CardTitle>
            <CardDescription>{t('claimPage.step1.description', 'Search for your existing business or create a new one')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">{t('claimPage.search.label', 'Search your business')}</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder={t('claimPage.search.placeholder', 'Enter business name or address...')}
                  className="pl-10 py-6 text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={selectedBusiness !== null}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('claimPage.search.hint', 'Type at least 2 characters to search')}
              </p>
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y bg-white">
                {searchResults.map((business) => (
                  <div
                    key={business.id}
                    className={`p-4 transition-all duration-200 border-b last:border-0 ${business.is_claimed ? 'bg-gray-50/50 opacity-80' : 'hover:bg-primary/5 cursor-pointer group'}`}
                    onClick={() => !business.is_claimed && setSelectedBusiness(business)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative w-12 h-12 flex-shrink-0">
                        {(() => {
                          const logoUrl = getStoragePublicUrl(business.logo_url ?? null);
                          if (logoUrl && isValidImageUrl(logoUrl)) {
                            return (
                              <Image src={logoUrl} alt={business.name} fill className="object-cover rounded" />
                            );
                          }
                          return (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 rounded text-xs font-bold">
                              {business.name && business.name.split(' ').length > 1
                                ? (business.name.split(' ')[0][0] + business.name.split(' ')[1][0]).toUpperCase()
                                : business.name
                                  ? business.name[0].toUpperCase()
                                  : 'B'}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate text-foreground group-hover:text-primary transition-colors">{business.name}</p>
                          {business.is_claimed && (
                            <Badge variant="secondary" className="flex items-center gap-1 text-[10px] py-0 h-5 border-orange-200 bg-orange-50 text-orange-700">
                              <CheckCircle2 className="h-3 w-3" />
                              {t('claimPage.search.claimedBadge', 'Claimed')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{business.location}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 italic">
                            {business.category}
                          </span>
                        </div>
                      </div>
                      {!business.is_claimed ? (
                        <div className="flex flex-col items-center justify-center p-2 rounded-full group-hover:bg-primary group-hover:text-white transition-all">
                          <Plus className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="text-orange-500 opacity-60">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {loading && searchQuery.length > 0 && (
              <div className="border rounded-lg p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t('claimPage.search.loading', 'Searching...')}</p>
              </div>
            )}

            {searchQuery.length > 0 && !loading && searchResults.length === 0 && (
              <div className="border rounded-lg p-8 text-center bg-blue-50">
                <p className="text-sm text-muted-foreground mb-4">
                  {tf('claimPage.search.emptyTitle', 'No business found for "{query}"', { query: searchQuery })}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {t('claimPage.search.emptyHint', 'That is normal, create a new business below')}
                </p>
              </div>
            )}

            {selectedBusiness && !selectedBusiness.is_claimed && (
              <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                <p className="text-sm text-muted-foreground mb-2">{t('claimPage.selection.label', 'Selected business:')}</p>
                <p className="font-semibold text-lg mb-3">{selectedBusiness.name}</p>
                <div className="flex gap-2">
                  <Button asChild size="sm">
                    <Link href={`/claim/new?businessId=${selectedBusiness.id}`}>
                      {t('claimPage.selection.ctaMine', "This is mine")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedBusiness(null);
                      setSearchQuery('');
                    }}
                  >
                    {t('claimPage.selection.change', 'Change')}
                  </Button>
                </div>
              </div>
            )}

            {selectedBusiness && selectedBusiness.is_claimed && (
              <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-orange-800 mb-1">
                      {t('claimPage.selection.claimedTitle', 'Business already claimed')}
                    </p>
                    <p className="text-sm text-orange-700">
                      {t(
                        'claimPage.selection.claimedDescription',
                        'This business has already been claimed by another user. If you are the rightful owner, contact our team.'
                      )}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBusiness(null);
                          setSearchQuery('');
                        }}
                      >
                        {t('claimPage.selection.chooseAnother', 'Choose another')}
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/contact">{t('claimPage.selection.contactTeam', 'Contact team')}</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-muted-foreground">{t('claimPage.divider.or', 'or')}</span>
              </div>
            </div>

            <Button asChild size="lg" className="w-full">
              <Link href="/claim/new">
                <Plus className="mr-2 h-5 w-5" />
                {t('claimPage.createNew', 'Create a new business')}
                <ArrowRight className="ml-auto h-5 w-5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">{t('claimPage.process.title', 'Quick process')}</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>{t('claimPage.process.step1', '- Fill your information (5 min)')}</li>
            <li>{t('claimPage.process.step2', '- Verify identity (email, phone, or document)')}</li>
            <li>{t('claimPage.process.step3', '- Our team approves your request (24-48h)')}</li>
            <li>{t('claimPage.process.step4', '- Access your pro dashboard')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
