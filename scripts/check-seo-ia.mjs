/**
 * SEO IA smoke check.
 *
 * Usage:
 *   SITE_URL=http://localhost:9002 npm run check:seo-ia
 *
 * Assumes the app is already running.
 */

const siteUrl = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002').replace(/\/+$/, '');

function readBooleanEnv(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

const expected = {
  blogHubIndex: readBooleanEnv('NEXT_PUBLIC_ENABLE_BLOG_HUB_INDEXING', true),
  reportsHubIndex: readBooleanEnv('NEXT_PUBLIC_ENABLE_REPORTS_HUB_INDEXING', false),
};

const checks = [
  {
    name: 'Blog hub',
    path: '/blog',
    canonical: '/blog',
    expectIndex: expected.blogHubIndex,
  },
  {
    name: 'Blog pillar article',
    path: '/blog/what-is-referral-demand-complete-guide-2026',
    canonical: '/blog/what-is-referral-demand-complete-guide-2026',
    expectIndex: true,
  },
  {
    name: 'Reports hub',
    path: '/reports',
    canonical: '/reports',
    expectIndex: expected.reportsHubIndex,
  },
  {
    name: 'Salary hub',
    path: '/salary',
    canonical: '/salary',
    expectIndex: false,
  },
  {
    name: 'Companies hub',
    path: '/companies',
    canonical: '/companies',
    expectIndex: false,
  },
  {
    name: 'Referral-demand hub',
    path: '/referral-demand',
    canonical: '/referral-demand',
    expectIndex: true,
  },
];

function extractCanonical(html) {
  const match = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  return match ? match[1] : null;
}

function extractRobotsContent(html) {
  const match = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  return match ? match[1].toLowerCase() : null;
}

function robotsImpliesIndex(robotsContent) {
  if (!robotsContent) return true;
  return !robotsContent.split(',').map((p) => p.trim()).includes('noindex');
}

function toAbsolute(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${siteUrl}${pathOrUrl}`;
}

async function checkRoute(route) {
  const url = toAbsolute(route.path);
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    return {
      ok: false,
      message: `[${route.name}] ${url} returned status ${response.status}`,
    };
  }

  const html = await response.text();
  const canonical = extractCanonical(html);
  const robots = extractRobotsContent(html);
  const actualIndex = robotsImpliesIndex(robots);
  const expectedCanonical = toAbsolute(route.canonical);

  const failures = [];
  if (!canonical) {
    failures.push('missing canonical tag');
  } else if (canonical !== expectedCanonical) {
    failures.push(`canonical mismatch (expected "${expectedCanonical}", got "${canonical}")`);
  }

  if (actualIndex !== route.expectIndex) {
    failures.push(`robots mismatch (expected index=${route.expectIndex}, got index=${actualIndex}, robots="${robots || 'none'}")`);
  }

  return {
    ok: failures.length === 0,
    message:
      failures.length === 0
        ? `[PASS] ${route.name} (${route.path})`
        : `[FAIL] ${route.name} (${route.path}): ${failures.join('; ')}`,
  };
}

async function main() {
  console.log(`SEO IA smoke check against ${siteUrl}`);
  const results = await Promise.all(checks.map((route) => checkRoute(route)));
  for (const result of results) {
    console.log(result.message);
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length} check(s) failed.`);
    process.exit(1);
  }

  console.log('\nAll SEO IA checks passed.');
}

main().catch((error) => {
  console.error('SEO IA smoke check crashed:', error);
  process.exit(1);
});
