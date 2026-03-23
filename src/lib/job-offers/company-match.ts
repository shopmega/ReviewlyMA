import { slugify } from '@/lib/utils';

const COMPANY_NOISE_TOKENS = new Set([
  'sa',
  'sarl',
  'sas',
  'ltd',
  'llc',
  'inc',
  'group',
  'groupe',
  'holding',
  'company',
  'societe',
  'societe-anonyme',
]);

export type BusinessMatchCandidate = {
  id: string;
  slug?: string | null;
  name?: string | null;
  website?: string | null;
  city?: string | null;
};

export type BusinessMatchMethod = 'slug' | 'id' | 'name' | 'website' | 'scored' | 'none';
export type BusinessMatchConfidence = 'high' | 'medium' | 'low' | 'none';

export type BusinessMatchResult = {
  businessId: string | null;
  confidence: BusinessMatchConfidence;
  method: BusinessMatchMethod;
  normalizedCompanySlug: string;
  candidates: Array<{ businessId: string; score: number; reason: string }>;
};

function normalizeCompanyText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()]/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/['".,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCompanyName(value: string) {
  const base = normalizeCompanyText(value);
  if (!base) return '';

  const filtered = base
    .split(' ')
    .filter((token) => token && !COMPANY_NOISE_TOKENS.has(token));

  return filtered.join(' ').trim();
}

function toComparableSlug(value: string | null | undefined) {
  if (!value) return '';
  const normalized = normalizeCompanyName(value);
  return normalized ? slugify(normalized) : '';
}

function extractHostname(value: string | null | undefined) {
  if (!value) return '';

  try {
    return new URL(value).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return value
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .trim()
      .toLowerCase();
  }
}

function hostsMatch(left: string, right: string) {
  if (!left || !right) return false;
  return left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`);
}

function cityMatches(inputCity: string | null | undefined, candidateCity: string | null | undefined) {
  return Boolean(inputCity && candidateCity && slugify(inputCity) === slugify(candidateCity));
}

export function resolveBusinessMatch(
  companyName: string,
  candidates: BusinessMatchCandidate[],
  options?: {
    sourceUrl?: string | null;
    city?: string | null;
  }
): BusinessMatchResult {
  const normalizedCompanySlug = toComparableSlug(companyName);
  if (!normalizedCompanySlug || candidates.length === 0) {
    return {
      businessId: null,
      confidence: 'none',
      method: 'none',
      normalizedCompanySlug,
      candidates: [],
    };
  }

  const sourceHost = extractHostname(options?.sourceUrl);

  for (const candidate of candidates) {
    const candidateRouteKey = (candidate.slug || candidate.id || '').toLowerCase();
    if (candidateRouteKey && candidateRouteKey === normalizedCompanySlug) {
      return {
        businessId: candidate.id,
        confidence: 'high',
        method: candidate.slug ? 'slug' : 'id',
        normalizedCompanySlug,
        candidates: [{ businessId: candidate.id, score: 100, reason: candidate.slug ? 'exact_slug' : 'exact_id' }],
      };
    }
  }

  for (const candidate of candidates) {
    if (toComparableSlug(candidate.name) === normalizedCompanySlug) {
      return {
        businessId: candidate.id,
        confidence: 'high',
        method: 'name',
        normalizedCompanySlug,
        candidates: [{ businessId: candidate.id, score: 92, reason: 'exact_name' }],
      };
    }
  }

  for (const candidate of candidates) {
    if (hostsMatch(sourceHost, extractHostname(candidate.website))) {
      return {
        businessId: candidate.id,
        confidence: 'high',
        method: 'website',
        normalizedCompanySlug,
        candidates: [{ businessId: candidate.id, score: 90, reason: 'website_domain' }],
      };
    }
  }

  const scored = candidates
    .map((candidate) => {
      let score = 0;
      const reasons: string[] = [];
      const candidateRouteKey = (candidate.slug || candidate.id || '').toLowerCase();
      const candidateNameSlug = toComparableSlug(candidate.name);

      if (candidateRouteKey && (candidateRouteKey.includes(normalizedCompanySlug) || normalizedCompanySlug.includes(candidateRouteKey))) {
        score += 45;
        reasons.push('route_key_partial');
      }

      if (candidateNameSlug && (candidateNameSlug.includes(normalizedCompanySlug) || normalizedCompanySlug.includes(candidateNameSlug))) {
        score += 40;
        reasons.push('name_partial');
      }

      if (hostsMatch(sourceHost, extractHostname(candidate.website))) {
        score += 30;
        reasons.push('website_related');
      }

      if (cityMatches(options?.city, candidate.city)) {
        score += 20;
        reasons.push('city_match');
      }

      return {
        businessId: candidate.id,
        score,
        reason: reasons.join('+') || 'weak_match',
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);

  const best = scored[0];
  const second = scored[1];
  const clearlyAhead = best && (!second || best.score - second.score >= 15);

  if (best && best.score >= 90 && clearlyAhead) {
    return {
      businessId: best.businessId,
      confidence: 'high',
      method: 'scored',
      normalizedCompanySlug,
      candidates: scored.slice(0, 5),
    };
  }

  if (best && best.score >= 70) {
    return {
      businessId: null,
      confidence: 'medium',
      method: 'none',
      normalizedCompanySlug,
      candidates: scored.slice(0, 5),
    };
  }

  return {
    businessId: null,
    confidence: best ? 'low' : 'none',
    method: 'none',
    normalizedCompanySlug,
    candidates: scored.slice(0, 5),
  };
}
