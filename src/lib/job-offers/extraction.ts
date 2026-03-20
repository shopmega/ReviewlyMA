import type {
  JobOfferContractType,
  JobOfferExtractionConfidence,
  JobOfferExtractionDiagnostics,
  JobOfferExtractionFieldDiagnostic,
  JobOfferExtractionFieldName,
  JobOfferExtractionPipelineResult,
  JobOfferExtractionResult,
  JobOfferIngestionInput,
  JobOfferPayPeriod,
  JobOfferSeniorityLevel,
  JobOfferWorkModel,
} from '@/lib/types';
import { extractJobOffer } from '@/ai/flows/extract-job-offer';
import { getConfiguredAiProviders, hasConfiguredAiModel } from '@/ai/genkit';

const BENEFIT_KEYWORDS = [
  'bonus',
  'prime',
  'assurance',
  'insurance',
  'transport',
  'tickets repas',
  'meal',
  'mutuelle',
  'formation',
  'stock',
  'remote',
  'hybrid',
];

const NOISE_LINE_PATTERNS = [
  /^(apply|postuler|share|sign in|login|see who|easy apply)\b/i,
  /^(linkedin|indeed|rekrute|emploi\.ma)\b/i,
  /^(privacy|terms|conditions|cookies)\b/i,
  /^(show more|voir plus|read more)\b/i,
];

type HeuristicExtraction = Partial<JobOfferExtractionResult>;
type PartialDiagnostics = Partial<Record<JobOfferExtractionFieldName, JobOfferExtractionFieldDiagnostic>>;

function truncate(value: string, max = 220) {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

function extractHostnameLabel(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const root = hostname.split('.')[0] || hostname;
    return root
      .split(/[-_]/g)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } catch {
    return '';
  }
}

function extractHtmlTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, ' ').trim() || '';
}

async function fetchUrlContent(url: string) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; AVisJobOfferBot/1.0)',
      accept: 'text/html,application/xhtml+xml',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status})`);
  }

  const html = await response.text();
  const title = extractHtmlTitle(html);
  const body = htmlToText(html);
  return `${title}\n${body}`.trim().slice(0, 40000);
}

function cleanSourceContent(rawContent: string) {
  const lines = rawContent
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((line) => !NOISE_LINE_PATTERNS.some((pattern) => pattern.test(line)));

  return lines.join('\n').slice(0, 20000);
}

function cleanCandidate(value: string | null | undefined, max = 120) {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.slice(0, max);
}

function fieldDiagnostic(
  value: string | number | string[] | null,
  confidence: JobOfferExtractionConfidence,
  source: JobOfferExtractionFieldDiagnostic['source'],
  evidence?: string | null
): JobOfferExtractionFieldDiagnostic {
  return { value, confidence, source, evidence: evidence || null };
}

function extractSalaryNumbers(text: string) {
  const matches = [...text.matchAll(/(\d[\d\s.,]{2,})(?:\s*)(mad|dh|dhs|eur|€)?/gi)]
    .map((match) => {
      const raw = match[1].replace(/[^\d]/g, '');
      const value = Number(raw);
      return Number.isFinite(value) ? value : null;
    })
    .filter((value): value is number => value != null && value >= 1000);

  if (matches.length === 0) return { salaryMin: null, salaryMax: null };
  if (matches.length === 1) return { salaryMin: matches[0], salaryMax: null };
  return { salaryMin: Math.min(...matches), salaryMax: Math.max(...matches) };
}

function extractBenefits(text: string) {
  const lower = text.toLowerCase();
  return BENEFIT_KEYWORDS.filter((keyword) => lower.includes(keyword)).slice(0, 8);
}

function detectJobTitle(text: string, lines: string[]) {
  const patterns = [
    /(?:job title|position|role|poste|intitul[eé] du poste)\s*[:\-]\s*([^\n|]+)/i,
    /we are hiring(?: an?| for)?\s+([^\n.,|]+)/i,
    /we're hiring(?: an?| for)?\s+([^\n.,|]+)/i,
    /looking for(?: an?| a)?\s+([^\n.,|]+)/i,
    /recherche(?: un| une)?\s+([^\n.,|]+)/i,
    /hiring(?: an?| for)?\s+([^\n.,|]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return {
        value: cleanCandidate(match[1], 90),
        evidence: truncate(match[0]),
        confidence: 'high' as const,
      };
    }
  }

  const lineCandidate = lines.find((line) =>
    line.length > 4
    && line.length < 90
    && !/apply|postuler|salary|salaire|company|entreprise|about|description/i.test(line)
  );
  if (lineCandidate) {
    return {
      value: cleanCandidate(lineCandidate, 90),
      evidence: truncate(lineCandidate),
      confidence: 'medium' as const,
    };
  }

  return {
    value: '',
    evidence: null,
    confidence: 'none' as const,
  };
}

function detectCompany(text: string, lines: string[], sourceUrl?: string) {
  const patterns = [
    /(?:company|entreprise|employer|soci[eé]t[eé])\s*[:\-]\s*([^\n|]+)/i,
    /join\s+([A-Z][A-Za-z0-9&.' -]{2,60})/i,
    /about\s+([A-Z][A-Za-z0-9&.' -]{2,60})/i,
    /(?:chez|at)\s+([A-Z][A-Za-z0-9&.' -]{2,60})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return {
        value: cleanCandidate(match[1], 80),
        evidence: truncate(match[0]),
        confidence: 'high' as const,
      };
    }
  }

  const lineCandidate = lines.slice(0, 8).find((line) =>
    line.length > 2
    && line.length < 80
    && /[A-Za-z]/.test(line)
    && !/remote|hybrid|full time|temps plein|casablanca|rabat|marrakech|salary|salaire/i.test(line)
  );
  if (lineCandidate) {
    return {
      value: cleanCandidate(lineCandidate, 80),
      evidence: truncate(lineCandidate),
      confidence: 'low' as const,
    };
  }

  const hostnameFallback = cleanCandidate(sourceUrl ? extractHostnameLabel(sourceUrl) : '', 80);
  if (hostnameFallback) {
    return {
      value: hostnameFallback,
      evidence: sourceUrl || null,
      confidence: 'low' as const,
    };
  }

  return {
    value: '',
    evidence: null,
    confidence: 'none' as const,
  };
}

function heuristicExtract(
  cleanedContent: string,
  sourceType: 'paste' | 'url',
  sourceUrl?: string
): { result: HeuristicExtraction; diagnostics: PartialDiagnostics } {
  const lines = cleanedContent.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const title = detectJobTitle(cleanedContent, lines);
  const company = detectCompany(cleanedContent, lines, sourceUrl);
  const cityMatch = cleanedContent.match(/\b(Casablanca|Rabat|Marrakech|Tanger|Tangier|Agadir|Fes|Riyadh|Dubai|Paris|Lyon)\b/i);
  const workModel: JobOfferWorkModel | null = /hybrid/i.test(cleanedContent)
    ? 'hybrid'
    : /remote/i.test(cleanedContent)
      ? 'remote'
      : /onsite|on-site|presentiel/i.test(cleanedContent)
        ? 'onsite'
        : null;
  const contractType: JobOfferContractType | null = /freelance/i.test(cleanedContent)
    ? 'freelance'
    : /intern(ship)?|stage/i.test(cleanedContent)
      ? 'internship'
      : /\bcdd\b/i.test(cleanedContent)
        ? 'cdd'
        : /\bcdi\b/i.test(cleanedContent)
          ? 'cdi'
          : null;
  const seniorityLevel: JobOfferSeniorityLevel | null = /junior/i.test(cleanedContent)
    ? 'junior'
    : /\bmid\b|intermediate|confirm[eé]/i.test(cleanedContent)
      ? 'mid'
      : /senior/i.test(cleanedContent)
        ? 'senior'
        : /lead/i.test(cleanedContent)
          ? 'lead'
          : /manager/i.test(cleanedContent)
            ? 'manager'
            : null;
  const yearsMatch = cleanedContent.match(/(\d{1,2})\+?\s+(?:years|ans)/i);
  const salaries = extractSalaryNumbers(cleanedContent);
  const benefits = extractBenefits(cleanedContent);
  const city = cityMatch?.[1] || null;
  const payPeriod: JobOfferPayPeriod = /year|annuel|annual/i.test(cleanedContent) ? 'yearly' : 'monthly';

  return {
    result: {
      companyName: company.value || '',
      jobTitle: title.value || '',
      city,
      salaryMin: salaries.salaryMin,
      salaryMax: salaries.salaryMax,
      payPeriod,
      contractType,
      workModel,
      seniorityLevel,
      yearsExperienceRequired: yearsMatch ? Number(yearsMatch[1]) : null,
      benefits,
      sourceSummary: sourceType === 'url'
        ? 'Extraction heuristique depuis le contenu du lien.'
        : 'Extraction heuristique depuis le texte colle.',
    },
    diagnostics: {
      companyName: fieldDiagnostic(company.value || null, company.confidence, company.value ? 'heuristic' : 'none', company.evidence),
      jobTitle: fieldDiagnostic(title.value || null, title.confidence, title.value ? 'heuristic' : 'none', title.evidence),
      city: fieldDiagnostic(city, city ? 'medium' : 'none', city ? 'heuristic' : 'none', city),
      salaryMin: fieldDiagnostic(salaries.salaryMin, salaries.salaryMin != null ? 'medium' : 'none', salaries.salaryMin != null ? 'heuristic' : 'none'),
      salaryMax: fieldDiagnostic(salaries.salaryMax, salaries.salaryMax != null ? 'medium' : 'none', salaries.salaryMax != null ? 'heuristic' : 'none'),
      payPeriod: fieldDiagnostic(payPeriod, 'low', 'heuristic'),
      contractType: fieldDiagnostic(contractType, contractType ? 'medium' : 'none', contractType ? 'heuristic' : 'none'),
      workModel: fieldDiagnostic(workModel, workModel ? 'medium' : 'none', workModel ? 'heuristic' : 'none'),
      seniorityLevel: fieldDiagnostic(seniorityLevel, seniorityLevel ? 'medium' : 'none', seniorityLevel ? 'heuristic' : 'none'),
      yearsExperienceRequired: fieldDiagnostic(yearsMatch ? Number(yearsMatch[1]) : null, yearsMatch ? 'medium' : 'none', yearsMatch ? 'heuristic' : 'none', yearsMatch?.[0] || null),
      benefits: fieldDiagnostic(benefits, benefits.length ? 'low' : 'none', benefits.length ? 'heuristic' : 'none'),
    },
  };
}

function mergeField<T>(
  name: JobOfferExtractionFieldName,
  aiValue: T | null | undefined,
  heuristicValue: T | null | undefined,
  diagnostics: PartialDiagnostics
) {
  const useAi =
    Array.isArray(aiValue) ? aiValue.length > 0 :
    typeof aiValue === 'string' ? aiValue.trim().length > 0 :
    aiValue !== null && aiValue !== undefined;

  if (useAi) {
    diagnostics[name] = fieldDiagnostic(
      Array.isArray(aiValue) ? [...aiValue] : (aiValue as string | number | null),
      name === 'companyName' || name === 'jobTitle' ? 'high' : 'medium',
      'ai'
    );
    return aiValue;
  }

  if (heuristicValue !== null && heuristicValue !== undefined && (!(typeof heuristicValue === 'string') || heuristicValue.trim())) {
    diagnostics[name] = {
      ...(diagnostics[name] || fieldDiagnostic(null, 'none', 'none')),
      source: 'merged',
    };
    return heuristicValue;
  }

  diagnostics[name] = diagnostics[name] || fieldDiagnostic(null, 'none', 'none');
  return heuristicValue ?? null;
}

export async function extractJobOfferInput(input: JobOfferIngestionInput): Promise<JobOfferExtractionPipelineResult> {
  const sourceType: 'paste' | 'url' = input.sourceUrl ? 'url' : 'paste';
  const diagnostics: JobOfferExtractionDiagnostics = {
    sourceType,
    currentStage: 'resolve_source',
    sourceUrl: input.sourceUrl || null,
    sourceFetchStatus: sourceType === 'url' ? 'failed' : 'not_applicable',
    sourceFetchError: null,
    rawContentLength: 0,
    cleanedContentLength: 0,
    rawContentPreview: '',
    cleanedContentPreview: '',
    usedAi: false,
    notes: [],
    missingCriticalFields: [],
    minimumFieldsMet: false,
    fieldDiagnostics: {},
  };

  let rawContent = input.sourceText || '';
  if (sourceType === 'url') {
    try {
      rawContent = await fetchUrlContent(input.sourceUrl || '');
      diagnostics.sourceFetchStatus = 'fetched';
    } catch (error) {
      diagnostics.sourceFetchError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  diagnostics.rawContentLength = rawContent.length;
  diagnostics.rawContentPreview = truncate(rawContent, 500);
  diagnostics.currentStage = 'clean_source';

  const cleanedContent = cleanSourceContent(rawContent);
  diagnostics.cleanedContentLength = cleanedContent.length;
  diagnostics.cleanedContentPreview = truncate(cleanedContent, 500);
  diagnostics.currentStage = 'extract_heuristic';

  const heuristic = heuristicExtract(cleanedContent, sourceType, input.sourceUrl || undefined);
  diagnostics.fieldDiagnostics = { ...heuristic.diagnostics };
  diagnostics.notes.push('Heuristic extraction completed.');

  diagnostics.currentStage = 'extract_ai';
  let aiResult: Partial<JobOfferExtractionResult> | null = null;
  if (hasConfiguredAiModel()) {
    try {
      aiResult = await extractJobOffer({
        sourceType,
        content: cleanedContent.slice(0, 16000),
      });
      diagnostics.usedAi = true;
      diagnostics.notes.push(`AI extraction completed using ${getConfiguredAiProviders().map((item) => item.label).join(', ')}.`);
    } catch (error) {
      diagnostics.notes.push(`AI extraction skipped: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    diagnostics.notes.push('AI extraction skipped: no configured AI provider.');
  }

  diagnostics.currentStage = 'merge_fields';
  const mergedDiagnostics = { ...diagnostics.fieldDiagnostics };
  const merged: JobOfferExtractionResult = {
    companyName: String(mergeField('companyName', aiResult?.companyName, heuristic.result.companyName, mergedDiagnostics) || ''),
    jobTitle: String(mergeField('jobTitle', aiResult?.jobTitle, heuristic.result.jobTitle, mergedDiagnostics) || ''),
    city: (mergeField('city', aiResult?.city, heuristic.result.city, mergedDiagnostics) as string | null | undefined) || null,
    salaryMin: (mergeField('salaryMin', aiResult?.salaryMin, heuristic.result.salaryMin, mergedDiagnostics) as number | null | undefined) ?? null,
    salaryMax: (mergeField('salaryMax', aiResult?.salaryMax, heuristic.result.salaryMax, mergedDiagnostics) as number | null | undefined) ?? null,
    payPeriod: (mergeField('payPeriod', aiResult?.payPeriod, heuristic.result.payPeriod || 'monthly', mergedDiagnostics) as JobOfferPayPeriod) || 'monthly',
    contractType: (mergeField('contractType', aiResult?.contractType, heuristic.result.contractType, mergedDiagnostics) as JobOfferContractType | null | undefined) ?? null,
    workModel: (mergeField('workModel', aiResult?.workModel, heuristic.result.workModel, mergedDiagnostics) as JobOfferWorkModel | null | undefined) ?? null,
    seniorityLevel: (mergeField('seniorityLevel', aiResult?.seniorityLevel, heuristic.result.seniorityLevel, mergedDiagnostics) as JobOfferSeniorityLevel | null | undefined) ?? null,
    yearsExperienceRequired: (mergeField('yearsExperienceRequired', aiResult?.yearsExperienceRequired, heuristic.result.yearsExperienceRequired, mergedDiagnostics) as number | null | undefined) ?? null,
    benefits: (mergeField('benefits', aiResult?.benefits, heuristic.result.benefits || [], mergedDiagnostics) as string[] | null | undefined) || [],
    sourceSummary: cleanCandidate(
      typeof aiResult?.sourceSummary === 'string' && aiResult.sourceSummary.trim()
        ? aiResult.sourceSummary
        : heuristic.result.sourceSummary,
      220
    ),
  };
  diagnostics.fieldDiagnostics = mergedDiagnostics;

  diagnostics.currentStage = 'validate_fields';
  const missingCriticalFields: Array<'companyName' | 'jobTitle'> = [];
  if (!merged.companyName.trim()) missingCriticalFields.push('companyName');
  if (!merged.jobTitle.trim()) missingCriticalFields.push('jobTitle');
  diagnostics.missingCriticalFields = missingCriticalFields;
  diagnostics.minimumFieldsMet = missingCriticalFields.length === 0;
  if (!diagnostics.minimumFieldsMet) {
    diagnostics.notes.push(`Missing critical fields: ${missingCriticalFields.join(', ')}`);
  }

  return {
    extracted: {
      ...merged,
      rawContent,
      cleanedContent,
    },
    diagnostics,
  };
}
