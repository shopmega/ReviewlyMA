import type { Business, Review, SalaryEntry, SalaryStats } from '@/lib/types';

export type QaPreviewMode = 'real' | 'empty' | 'low' | 'medium' | 'high';

const QA_MODES: QaPreviewMode[] = ['real', 'empty', 'low', 'medium', 'high'];

function toIsoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function buildReviews(
  businessId: string,
  starDistribution: Array<{ rating: number; count: number }>,
  startId: number
): Review[] {
  const reviews: Review[] = [];
  let id = startId;
  let daysAgo = 2;

  starDistribution.forEach((bucket) => {
    for (let i = 0; i < bucket.count; i += 1) {
      const decimalOffset = i % 2 === 0 ? 0 : 0.2;
      const score = Math.max(1, Math.min(5, Number((bucket.rating - decimalOffset).toFixed(1))));
      reviews.push({
        id,
        rating: score,
        title: `Avis ${id - startId + 1}`,
        text: `Retour anonyme sur ${businessId}. Apercu QA pour valider la lecture des avis et la densite de contenu.`,
        author: `Utilisateur ${id - startId + 1}`,
        date: toIsoDaysAgo(daysAgo).slice(0, 10),
        likes: Math.max(0, Math.floor(bucket.rating * 2) - i),
        dislikes: Math.max(0, 2 - bucket.rating),
      });
      id += 1;
      daysAgo += 2;
    }
  });

  return reviews;
}

function computeOverallRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return Number((sum / reviews.length).toFixed(1));
}

function buildSalaryEntries(
  businessId: string,
  count: number,
  seed: number,
  roles: string[]
): SalaryEntry[] {
  return Array.from({ length: Math.max(0, count) }).map((_, idx) => {
    const salaryBase = seed + idx * 250;
    const role = roles[idx % roles.length] || 'Employe';
    return {
      id: 900000 + idx,
      business_id: businessId,
      job_title: role,
      salary: salaryBase,
      location: 'Casablanca',
      pay_period: 'monthly',
      currency: 'MAD',
      employment_type: 'full_time',
      years_experience: Math.min(12, idx % 13),
      seniority_level: idx % 4 === 0 ? 'junior' : idx % 4 === 1 ? 'confirme' : idx % 4 === 2 ? 'senior' : 'manager',
      department: idx % 2 === 0 ? 'Operations' : 'Engineering',
      work_model: idx % 3 === 0 ? 'presentiel' : idx % 3 === 1 ? 'hybride' : 'teletravail',
      bonus_flags: {
        prime: idx % 2 === 0,
        treizieme_mois: idx % 3 === 0,
        commission: idx % 4 === 0,
        bonus_annuel: idx % 5 === 0,
      },
      salary_monthly_normalized: salaryBase,
      is_current: true,
      source: 'self_reported',
      status: 'published',
      moderation_notes: null,
      reviewed_at: toIsoDaysAgo(Math.max(1, idx * 4)),
      reviewed_by: null,
      created_at: toIsoDaysAgo(Math.max(1, idx * 4)),
    };
  });
}

function salaryStatsFromEntries(entries: SalaryEntry[]): SalaryStats {
  const monthly = entries.map((entry) => entry.salary_monthly_normalized || entry.salary).sort((a, b) => a - b);
  const count = monthly.length;
  const median = count === 0 ? null : monthly[Math.floor((count - 1) / 2)];
  const min = count === 0 ? null : monthly[0];
  const max = count === 0 ? null : monthly[count - 1];
  const roleMap = new Map<string, number[]>();

  entries.forEach((entry) => {
    const list = roleMap.get(entry.job_title) || [];
    list.push(entry.salary_monthly_normalized || entry.salary);
    roleMap.set(entry.job_title, list);
  });

  const roleBreakdown = [...roleMap.entries()]
    .map(([jobTitle, values]) => {
      const sorted = values.sort((a, b) => a - b);
      return {
        jobTitle,
        count: sorted.length,
        medianMonthly: sorted[Math.floor((sorted.length - 1) / 2)],
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    count,
    medianMonthly: median,
    minMonthly: min,
    maxMonthly: max,
    currency: 'MAD',
    roleBreakdown,
  };
}

export function parseQaPreviewMode(raw: string | null | undefined): QaPreviewMode {
  if (!raw) return 'real';
  const normalized = raw.toLowerCase();
  return (QA_MODES.includes(normalized as QaPreviewMode) ? normalized : 'real') as QaPreviewMode;
}

export function applyBusinessQaPreview(
  business: Business,
  salaryStats: SalaryStats,
  salaryEntries: SalaryEntry[],
  mode: QaPreviewMode
): { business: Business; salaryStats: SalaryStats; salaryEntries: SalaryEntry[] } {
  if (mode === 'real') {
    return { business, salaryStats, salaryEntries };
  }

  if (mode === 'empty') {
    return {
      business: {
        ...business,
        reviews: [],
        overallRating: 0,
      },
      salaryStats: {
        count: 0,
        medianMonthly: null,
        minMonthly: null,
        maxMonthly: null,
        currency: 'MAD',
        roleBreakdown: [],
      },
      salaryEntries: [],
    };
  }

  if (mode === 'low') {
    const qaReviews = buildReviews(
      business.id,
      [
        { rating: 5, count: 1 },
        { rating: 4, count: 2 },
        { rating: 3, count: 2 },
        { rating: 2, count: 1 },
        { rating: 1, count: 0 },
      ],
      700000
    );
    const qaSalaries = buildSalaryEntries(business.id, 6, 5200, ['Agent support', 'Assistant administratif', 'Technicien']);
    return {
      business: {
        ...business,
        reviews: qaReviews,
        overallRating: computeOverallRating(qaReviews),
      },
      salaryStats: salaryStatsFromEntries(qaSalaries),
      salaryEntries: qaSalaries.slice(0, 6),
    };
  }

  if (mode === 'medium') {
    const qaReviews = buildReviews(
      business.id,
      [
        { rating: 5, count: 9 },
        { rating: 4, count: 10 },
        { rating: 3, count: 4 },
        { rating: 2, count: 2 },
        { rating: 1, count: 1 },
      ],
      710000
    );
    const qaSalaries = buildSalaryEntries(
      business.id,
      24,
      6800,
      ['Charge de clientele', 'Developpeur', 'Analyste', 'Team lead']
    );
    return {
      business: {
        ...business,
        reviews: qaReviews,
        overallRating: computeOverallRating(qaReviews),
      },
      salaryStats: salaryStatsFromEntries(qaSalaries),
      salaryEntries: qaSalaries.slice(0, 10),
    };
  }

  const qaReviews = buildReviews(
    business.id,
    [
      { rating: 5, count: 48 },
      { rating: 4, count: 34 },
      { rating: 3, count: 12 },
      { rating: 2, count: 4 },
      { rating: 1, count: 2 },
    ],
    720000
  );
  const qaSalaries = buildSalaryEntries(
    business.id,
    72,
    8200,
    ['Consultant senior', 'Manager', 'Responsable operationnel', 'Ingenieur data', 'Chef de projet']
  );

  return {
    business: {
      ...business,
      reviews: qaReviews,
      overallRating: computeOverallRating(qaReviews),
    },
    salaryStats: salaryStatsFromEntries(qaSalaries),
    salaryEntries: qaSalaries.slice(0, 10),
  };
}

