const ADS_TXT_AUTHORITY = 'google.com';
const ADS_TXT_RELATIONSHIP = 'DIRECT';
const ADS_TXT_CERTIFICATION_ID = 'f08c47fec0942fa0';

function normalizePublisherId(rawValue?: string): string | null {
  if (!rawValue) return null;

  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('ca-pub-')) {
    return trimmed.replace(/^ca-/, '');
  }

  if (trimmed.startsWith('pub-')) {
    return trimmed;
  }

  return null;
}

export async function GET() {
  const normalizedPublisherId = normalizePublisherId(process.env.NEXT_PUBLIC_ADSENSE_PUB_ID);

  const body = normalizedPublisherId
    ? `${ADS_TXT_AUTHORITY}, ${normalizedPublisherId}, ${ADS_TXT_RELATIONSHIP}, ${ADS_TXT_CERTIFICATION_ID}\n`
    : '';

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Avoid stale values after changing AdSense IDs between environments.
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
