import type { JobOfferExtractionResult, JobOfferIngestionInput } from '@/lib/types';
import { extractJobOffer } from '@/ai/flows/extract-job-offer';

const BENEFIT_KEYWORDS = [
  'bonus',
  'assurance',
  'insurance',
  'transport',
  'tickets repas',
  'meal',
  'remote',
  'hybrid',
  'formation',
  'stock',
];

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchUrlText(url: string) {
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
  return stripHtml(html).slice(0, 20000);
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

function heuristicExtract(text: string, sourceType: 'paste' | 'url'): JobOfferExtractionResult {
  const lines = text.split(/[\n\r]+/).map((line) => line.trim()).filter(Boolean);
  const titleCandidate = lines.find((line) => line.length > 4 && line.length < 120) || '';
  const companyCandidate = lines.slice(1, 6).find((line) => /[A-Za-z]/.test(line)) || '';
  const cityMatch = text.match(/\b(Casablanca|Rabat|Marrakech|Tanger|Tangier|Agadir|Fes|Riyadh|Dubai|Paris|Lyon)\b/i);
  const workModel = /hybrid/i.test(text) ? 'hybrid' : /remote/i.test(text) ? 'remote' : /onsite|on-site|presentiel/i.test(text) ? 'onsite' : null;
  const contractType = /freelance/i.test(text)
    ? 'freelance'
    : /intern(ship)?|stage/i.test(text)
      ? 'internship'
      : /\bcdd\b/i.test(text)
        ? 'cdd'
        : /\bcdi\b/i.test(text)
          ? 'cdi'
          : null;
  const seniorityLevel = /junior/i.test(text)
    ? 'junior'
    : /\bmid\b|intermediate/i.test(text)
      ? 'mid'
      : /senior/i.test(text)
        ? 'senior'
        : /lead/i.test(text)
          ? 'lead'
          : /manager/i.test(text)
            ? 'manager'
            : null;
  const yearsMatch = text.match(/(\d{1,2})\+?\s+(?:years|ans)/i);
  const salaries = extractSalaryNumbers(text);

  return {
    companyName: companyCandidate,
    jobTitle: titleCandidate,
    city: cityMatch?.[1] || null,
    salaryMin: salaries.salaryMin,
    salaryMax: salaries.salaryMax,
    payPeriod: /year|annuel|annual/i.test(text) ? 'yearly' : 'monthly',
    contractType,
    workModel,
    seniorityLevel,
    yearsExperienceRequired: yearsMatch ? Number(yearsMatch[1]) : null,
    benefits: extractBenefits(text),
    sourceSummary: sourceType === 'url'
      ? 'Extracted from URL content with fallback heuristics.'
      : 'Extracted from pasted text with fallback heuristics.',
  };
}

export async function extractJobOfferInput(input: JobOfferIngestionInput): Promise<JobOfferExtractionResult & { rawContent: string }> {
  const sourceType: 'paste' | 'url' = input.sourceUrl ? 'url' : 'paste';
  const rawContent = sourceType === 'url'
    ? await fetchUrlText(input.sourceUrl || '')
    : (input.sourceText || '');

  const heuristic = heuristicExtract(rawContent, sourceType);

  try {
    const aiResult = await extractJobOffer({
      sourceType,
      content: rawContent.slice(0, 16000),
    });

    return {
      companyName: aiResult.companyName || heuristic.companyName,
      jobTitle: aiResult.jobTitle || heuristic.jobTitle,
      city: aiResult.city || heuristic.city,
      salaryMin: aiResult.salaryMin ?? heuristic.salaryMin,
      salaryMax: aiResult.salaryMax ?? heuristic.salaryMax,
      payPeriod: aiResult.payPeriod || heuristic.payPeriod,
      contractType: aiResult.contractType ?? heuristic.contractType,
      workModel: aiResult.workModel ?? heuristic.workModel,
      seniorityLevel: aiResult.seniorityLevel ?? heuristic.seniorityLevel,
      yearsExperienceRequired: aiResult.yearsExperienceRequired ?? heuristic.yearsExperienceRequired,
      benefits: aiResult.benefits?.length ? aiResult.benefits : heuristic.benefits,
      sourceSummary: aiResult.sourceSummary || heuristic.sourceSummary,
      rawContent,
    };
  } catch {
    return {
      ...heuristic,
      rawContent,
    };
  }
}
