const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

const REPORT_PREFIX = 'monthly-referral-report';

export function getMonthNameFromIndex(monthIndex: number): string | null {
  if (monthIndex < 0 || monthIndex > 11) return null;
  return MONTH_NAMES[monthIndex];
}

export function getMonthIndexFromName(monthName: string): number {
  return MONTH_NAMES.indexOf(monthName as (typeof MONTH_NAMES)[number]);
}

export function buildMonthlyReferralReportSlugFromYearMonth(year: number, monthIndex: number): string {
  const monthName = getMonthNameFromIndex(monthIndex);
  if (!monthName) {
    throw new Error(`Invalid month index: ${monthIndex}`);
  }
  return `${REPORT_PREFIX}-${monthName}-${year}`;
}

export function buildMonthlyReferralReportSlug(date: Date): string {
  return buildMonthlyReferralReportSlugFromYearMonth(date.getUTCFullYear(), date.getUTCMonth());
}

export function parseMonthlyReferralReportSlug(slug: string):
  | {
      year: number;
      monthIndex: number;
      monthName: string;
      periodStartIso: string;
      periodEndIso: string;
      reportDateUtc: Date;
    }
  | null {
  const parsed = slug.match(/^monthly-referral-report-([a-z]+)-(\d{4})$/);
  if (!parsed) return null;

  const monthName = parsed[1];
  const year = Number(parsed[2]);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return null;

  const monthIndex = getMonthIndexFromName(monthName);
  if (monthIndex < 0) return null;

  const reportDateUtc = new Date(Date.UTC(year, monthIndex, 1));
  const nextMonthDateUtc = new Date(Date.UTC(year, monthIndex + 1, 1));

  return {
    year,
    monthIndex,
    monthName,
    periodStartIso: reportDateUtc.toISOString(),
    periodEndIso: nextMonthDateUtc.toISOString(),
    reportDateUtc,
  };
}

export function formatReportMonthLabel(reportDateUtc: Date, locale = 'en-US'): string {
  return reportDateUtc.toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
