export type BlogLink = {
  href: string;
  label: string;
};

export type BlogSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  readTimeMinutes: number;
  category: 'pillar' | 'how_to';
  intro: string;
  sections: BlogSection[];
  clusterLinks: BlogLink[];
};

export const REQUIRED_CLUSTER_LINKS = ['/referral-demand', '/salary', '/companies', '/reports'] as const;

const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'what-is-referral-demand-complete-guide-2026',
    title: 'What Is Referral Demand? Complete Guide 2026',
    description:
      'Definition, mechanics, and practical framework to use referral-demand signals to make better job and referral decisions.',
    publishedAt: '2026-02-28',
    updatedAt: '2026-02-28',
    readTimeMinutes: 10,
    category: 'pillar',
    intro:
      'Referral demand is the live signal of how many candidates are actively requesting referral support for specific roles, cities, and companies. It helps candidates prioritize where effort has the highest probability of response.',
    sections: [
      {
        heading: 'How referral demand differs from job volume',
        paragraphs: [
          'Job volume tells you how many openings exist. Referral demand tells you where candidates are actively competing for referral access.',
          'When demand spikes faster than supply, response rates usually decline unless you improve targeting and message quality.',
        ],
      },
      {
        heading: 'Core dimensions to track',
        paragraphs: [
          'The most useful referral-demand dimensions are role, city, work mode, seniority, and contract type.',
          'Together they create a segment-level view of competition and candidate intent.',
        ],
        bullets: [
          'Role + city: primary segment for intent targeting',
          'Work mode + seniority: qualification and fit layer',
          'Time windows: week-over-week and month-over-month momentum',
        ],
      },
      {
        heading: 'How to use this signal in practice',
        paragraphs: [
          'Start with high-demand segments, then narrow to reachable company targets where offer-side activity exists.',
          'Use salary intelligence to validate whether a segment is worth pursuing before sending requests.',
          'Track monthly reports to avoid stale assumptions.',
        ],
      },
    ],
    clusterLinks: [
      { href: '/referral-demand', label: 'Referral Demand Dashboard' },
      { href: '/salary', label: 'Salary Intelligence Hub' },
      { href: '/companies', label: 'Company Insights Hub' },
      { href: '/reports', label: 'Monthly Reports' },
      { href: '/referral-demand/roles', label: 'Top Demand Roles' },
      { href: '/referral-demand/cities', label: 'Top Demand Cities' },
    ],
  },
  {
    slug: 'how-to-write-a-referral-request-that-gets-replies',
    title: 'How to Write a Referral Request That Gets Replies',
    description:
      'A simple outreach structure to improve referral response quality while reducing spam-like messaging.',
    publishedAt: '2026-02-28',
    updatedAt: '2026-02-28',
    readTimeMinutes: 7,
    category: 'how_to',
    intro:
      'High response rates come from relevance and clarity, not volume. Use short context, clear role fit, and one specific ask.',
    sections: [
      {
        heading: 'Use a three-block message',
        paragraphs: [
          'Block 1: who you are and why you picked this role/company segment.',
          'Block 2: one proof point tied to role requirements.',
          'Block 3: one concrete ask with low friction.',
        ],
      },
      {
        heading: 'Target by data, not by random company list',
        paragraphs: [
          'Use demand and company pages to focus on segments with active movement.',
          'Avoid generic messages across unrelated roles and cities.',
        ],
      },
    ],
    clusterLinks: [
      { href: '/referral-demand', label: 'Referral Demand Dashboard' },
      { href: '/salary', label: 'Salary Intelligence Hub' },
      { href: '/companies', label: 'Company Insights Hub' },
      { href: '/reports', label: 'Monthly Reports' },
    ],
  },
  {
    slug: 'how-to-choose-role-and-city-for-your-demand-listing',
    title: 'How to Choose Role and City for Your Demand Listing',
    description:
      'A practical framework to select high-opportunity role/city segments before publishing your listing.',
    publishedAt: '2026-02-28',
    updatedAt: '2026-02-28',
    readTimeMinutes: 6,
    category: 'how_to',
    intro:
      'Role-city targeting is the biggest lever for visibility and conversion in referral-demand pages.',
    sections: [
      {
        heading: 'Start from top demand segments',
        paragraphs: [
          'Use top roles and top cities pages to identify where candidate intent is concentrated.',
          'Then move to a specific role-city page to validate active listing depth.',
        ],
      },
      {
        heading: 'Balance competition and fit',
        paragraphs: [
          'Choose segments where you have credible fit, not only maximum volume.',
          'High-volume segments can underperform if your profile does not match expected seniority.',
        ],
      },
    ],
    clusterLinks: [
      { href: '/referral-demand', label: 'Referral Demand Dashboard' },
      { href: '/salary', label: 'Salary Intelligence Hub' },
      { href: '/companies', label: 'Company Insights Hub' },
      { href: '/reports', label: 'Monthly Reports' },
      { href: '/referral-demand/roles', label: 'Top Demand Roles' },
      { href: '/referral-demand/cities', label: 'Top Demand Cities' },
    ],
  },
  {
    slug: 'how-to-use-salary-signals-before-asking-for-a-referral',
    title: 'How to Use Salary Signals Before Asking for a Referral',
    description:
      'Use median, distribution, and trend signals to prioritize referral outreach and avoid weak-fit applications.',
    publishedAt: '2026-02-28',
    updatedAt: '2026-02-28',
    readTimeMinutes: 7,
    category: 'how_to',
    intro:
      'Salary signals reduce wasted outreach by helping you focus on role-city combinations that match your target compensation band.',
    sections: [
      {
        heading: 'Read distribution, not only median',
        paragraphs: [
          'Median alone can hide volatility. Use low/median/high bands to estimate realistic negotiation range.',
          'Combine this with role-city demand momentum before contacting employees.',
        ],
      },
      {
        heading: 'Check monthly trend before committing effort',
        paragraphs: [
          'If median is dropping while demand is rising, response quality may decline due to segment pressure.',
          'Use monthly reports to time your outreach and listing updates.',
        ],
      },
    ],
    clusterLinks: [
      { href: '/referral-demand', label: 'Referral Demand Dashboard' },
      { href: '/salary', label: 'Salary Intelligence Hub' },
      { href: '/companies', label: 'Company Insights Hub' },
      { href: '/reports', label: 'Monthly Reports' },
    ],
  },
  {
    slug: 'how-to-evaluate-company-fit-before-you-ask-for-a-referral',
    title: 'How to Evaluate Company Fit Before You Ask for a Referral',
    description:
      'A fast decision checklist using company referral activity, role overlap, and demand context.',
    publishedAt: '2026-02-28',
    updatedAt: '2026-02-28',
    readTimeMinutes: 6,
    category: 'how_to',
    intro:
      'Not every target company deserves the same effort. Use fit checks before you request introductions.',
    sections: [
      {
        heading: 'Validate offer-side activity first',
        paragraphs: [
          'Start with company referral pages and confirm there are active offers in your target role family.',
          'If no activity exists, shift to companies with active movement.',
        ],
      },
      {
        heading: 'Cross-check with demand and salary context',
        paragraphs: [
          'Use demand pages to evaluate competition and salary pages to verify compensation alignment.',
          'Then prioritize companies where both fit and opportunity are present.',
        ],
      },
    ],
    clusterLinks: [
      { href: '/referral-demand', label: 'Referral Demand Dashboard' },
      { href: '/salary', label: 'Salary Intelligence Hub' },
      { href: '/companies', label: 'Company Insights Hub' },
      { href: '/reports', label: 'Monthly Reports' },
    ],
  },
];

function assertInternalLinkPolicy(post: BlogPost) {
  const hrefs = new Set(post.clusterLinks.map((link) => link.href));
  const missing = REQUIRED_CLUSTER_LINKS.filter((requiredHref) => !hrefs.has(requiredHref));
  if (missing.length > 0) {
    throw new Error(`Blog post "${post.slug}" is missing required cluster links: ${missing.join(', ')}`);
  }
}

for (const post of BLOG_POSTS) {
  assertInternalLinkPolicy(post);
}

export function getAllBlogPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export function getBlogPostBySlug(slug: string): BlogPost | null {
  return BLOG_POSTS.find((post) => post.slug === slug) || null;
}

export function getBlogPostSlugs(): string[] {
  return BLOG_POSTS.map((post) => post.slug);
}
