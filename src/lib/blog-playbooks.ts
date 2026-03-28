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

export const REQUIRED_CLUSTER_LINKS = ['/companies', '/salaires', '/blog', '/job-offers'] as const;

const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-to-evaluate-an-employer-in-morocco-complete-guide-2026',
    title: 'How to Evaluate an Employer in Morocco: Complete Guide 2026',
    description:
      'A practical framework to combine reviews, salaries, company signals, and job-offer analysis before you apply.',
    publishedAt: '2026-02-28',
    updatedAt: '2026-02-28',
    readTimeMinutes: 10,
    category: 'pillar',
    intro:
      'The best employer decisions come from combining reputation, compensation, company context, and offer quality instead of relying on one signal alone.',
    sections: [
      {
        heading: 'Use multiple signals instead of one headline metric',
        paragraphs: [
          'A high review score can hide compensation issues, and a strong salary band can still come with poor management quality.',
          'The goal is to cross-check reputation, pay, and current hiring signals before you spend time on an application process.',
        ],
      },
      {
        heading: 'Core dimensions to track',
        paragraphs: [
          'The most useful dimensions are role, city, salary range, work mode, seniority, and review quality.',
          'Together they give you a grounded view of employer quality and market fit.',
        ],
        bullets: [
          'Role + city: hiring and salary context',
          'Work mode + seniority: fit and expectations',
          'Recent review and offer signals: operational reality check',
        ],
      },
      {
        heading: 'How to use the platform in practice',
        paragraphs: [
          'Start with the company page, then compare salary context and any available job-offer analysis before making a decision.',
          'Use blog playbooks to structure your research instead of treating each surface as a standalone product.',
          'Prioritize employers where the review story, salary signal, and offer quality are coherent.',
        ],
      },
    ],
    clusterLinks: [
      { href: '/companies', label: 'Company Insights Hub' },
      { href: '/salaires', label: 'Salary Intelligence Hub' },
      { href: '/blog', label: 'Editorial Hub' },
      { href: '/job-offers', label: 'Job-Offer Analysis' },
    ],
  },
  {
    slug: 'how-to-write-a-strong-employer-outreach-message',
    title: 'How to Write a Strong Employer Outreach Message',
    description:
      'A concise message structure to improve employer outreach quality while avoiding generic or spam-like contact.',
    publishedAt: '2026-02-28',
    updatedAt: '2026-02-28',
    readTimeMinutes: 7,
    category: 'how_to',
    intro:
      'Better response rates come from relevance and clarity, not volume. Use short context, clear fit, and one specific ask.',
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
        heading: 'Target by data, not by random company lists',
        paragraphs: [
          'Use company pages, salary pages, and offer analysis to focus on employers where your profile is actually relevant.',
          'Avoid sending the same generic outreach across unrelated roles and cities.',
        ],
      },
    ],
    clusterLinks: [
      { href: '/companies', label: 'Company Insights Hub' },
      { href: '/salaires', label: 'Salary Intelligence Hub' },
      { href: '/blog', label: 'Editorial Hub' },
      { href: '/job-offers', label: 'Job-Offer Analysis' },
    ],
  },
  {
    slug: 'how-to-choose-the-right-role-and-city-before-you-apply',
    title: 'How to Choose the Right Role and City Before You Apply',
    description:
      'A practical framework to select high-opportunity role and city segments before you commit to a search track.',
    publishedAt: '2026-02-28',
    updatedAt: '2026-02-28',
    readTimeMinutes: 6,
    category: 'how_to',
    intro:
      'Role-city targeting is one of the biggest levers for search quality, salary relevance, and realistic hiring expectations.',
    sections: [
      {
        heading: 'Start from market signal concentration',
        paragraphs: [
          'Start from salary pages, company density, and active hiring signals to identify where the market is actually moving.',
          'Then move into specific employer and offer surfaces to validate whether the segment is worth your time.',
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
      { href: '/companies', label: 'Company Insights Hub' },
      { href: '/salaires', label: 'Salary Intelligence Hub' },
      { href: '/blog', label: 'Editorial Hub' },
      { href: '/job-offers', label: 'Job-Offer Analysis' },
    ],
  },
  {
    slug: 'how-to-use-salary-signals-before-you-apply',
    title: 'How to Use Salary Signals Before You Apply',
    description:
      'Use median, distribution, and trend signals to prioritize applications and avoid weak-fit opportunities.',
    publishedAt: '2026-02-28',
    updatedAt: '2026-02-28',
    readTimeMinutes: 7,
    category: 'how_to',
    intro:
      'Salary signals reduce wasted effort by helping you focus on role-city combinations that match your target compensation band.',
    sections: [
      {
        heading: 'Read distribution, not only median',
        paragraphs: [
          'Median alone can hide volatility. Use low/median/high bands to estimate realistic negotiation range.',
          'Combine this with review quality and employer signals before you commit to an interview loop.',
        ],
      },
      {
        heading: 'Check monthly trend before committing effort',
        paragraphs: [
          'If pay is declining while hiring looks noisy, the role may be less attractive than it appears on the surface.',
          'Use recent signals to decide whether to apply now, wait, or shift target employers.',
        ],
      },
    ],
    clusterLinks: [
      { href: '/companies', label: 'Company Insights Hub' },
      { href: '/salaires', label: 'Salary Intelligence Hub' },
      { href: '/blog', label: 'Editorial Hub' },
      { href: '/job-offers', label: 'Job-Offer Analysis' },
    ],
  },
  {
    slug: 'how-to-evaluate-company-fit-before-you-spend-time-applying',
    title: 'How to Evaluate Company Fit Before You Spend Time Applying',
    description:
      'A fast decision checklist using review quality, salary evidence, and hiring context.',
    publishedAt: '2026-02-28',
    updatedAt: '2026-02-28',
    readTimeMinutes: 6,
    category: 'how_to',
    intro:
      'Not every target company deserves the same effort. Use fit checks before you invest in a full application process.',
    sections: [
      {
        heading: 'Validate active hiring signals first',
        paragraphs: [
          'Start with company pages and confirm there are current signals in your target role family.',
          'If there is no useful activity, move to employers with clearer hiring momentum.',
        ],
      },
      {
        heading: 'Cross-check with salary and review context',
        paragraphs: [
          'Use salary pages to verify compensation alignment and reviews to pressure-test reputation.',
          'Then prioritize companies where fit, pay, and employer quality are all credible.',
        ],
      },
    ],
    clusterLinks: [
      { href: '/companies', label: 'Company Insights Hub' },
      { href: '/salaires', label: 'Salary Intelligence Hub' },
      { href: '/blog', label: 'Editorial Hub' },
      { href: '/job-offers', label: 'Job-Offer Analysis' },
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
