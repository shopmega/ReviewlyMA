import { slugify } from '@/lib/utils';
import {
  normalizeCompanyName,
  resolveBusinessMatch,
  type BusinessMatchCandidate,
  type BusinessMatchResult,
} from './company-match';

type BusinessesLookupQuery = {
  ilike: (column: string, pattern: string) => BusinessesLookupQuery;
  or: (filters: string) => BusinessesLookupQuery;
  limit: (count: number) => PromiseLike<{ data: BusinessMatchCandidate[] | null; error: unknown }>;
};

type BusinessesLookupClient = {
  from: (table: 'businesses') => {
    select: (columns: string) => BusinessesLookupQuery;
  };
};

function extractSourceHost(sourceUrl?: string | null) {
  if (!sourceUrl) return '';

  try {
    return new URL(sourceUrl).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

export async function resolveBusinessMatchForCompany(
  client: BusinessesLookupClient,
  companyName: string,
  options?: {
    sourceUrl?: string | null;
    city?: string | null;
  }
): Promise<BusinessMatchResult> {
  if (!companyName) {
    return {
      businessId: null,
      confidence: 'none',
      method: 'none',
      normalizedCompanySlug: '',
      candidates: [],
    };
  }

  const companySlug = slugify(normalizeCompanyName(companyName));
  if (!companySlug) {
    return {
      businessId: null,
      confidence: 'none',
      method: 'none',
      normalizedCompanySlug: '',
      candidates: [],
    };
  }

  const sourceHost = extractSourceHost(options?.sourceUrl);
  const [byName, byRouteKey, byWebsite] = await Promise.all([
    client
      .from('businesses')
      .select('id, slug, name, website, city')
      .ilike('name', `%${companyName}%`)
      .limit(20),
    client
      .from('businesses')
      .select('id, slug, name, website, city')
      .or(`id.eq.${companySlug},slug.eq.${companySlug}`)
      .limit(10),
    sourceHost
      ? client
          .from('businesses')
          .select('id, slug, name, website, city')
          .ilike('website', `%${sourceHost}%`)
          .limit(10)
      : Promise.resolve({ data: [] as BusinessMatchCandidate[], error: null }),
  ]);

  const rows = [
    ...(byName.data || []),
    ...(byRouteKey.data || []),
    ...(((byWebsite.data as BusinessMatchCandidate[] | null) || [])),
  ];

  if (byName.error && byRouteKey.error && byWebsite.error) {
    return {
      businessId: null,
      confidence: 'none',
      method: 'none',
      normalizedCompanySlug: companySlug,
      candidates: [],
    };
  }

  const uniqueCandidates = Array.from(new Map(rows.map((row) => [row.id, row])).values());

  return resolveBusinessMatch(companyName, uniqueCandidates, options);
}
