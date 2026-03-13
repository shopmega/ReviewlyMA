const PLACEHOLDER_PREFIX = '/placeholders/';
const LEGACY_PLACEHOLDER_PATHS = new Set(['/placeholder-logo.png']);
const BUSINESS_IMAGES_BUCKET = 'business-images';

function normalizePath(value: string): string {
  return value.trim().toLowerCase();
}

export function isPlaceholderBusinessMediaPath(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = normalizePath(value);
  return normalized.startsWith(PLACEHOLDER_PREFIX) || LEGACY_PLACEHOLDER_PATHS.has(normalized);
}

export function sanitizeBusinessMediaPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isPlaceholderBusinessMediaPath(trimmed) ? null : trimmed;
}

export function sanitizeBusinessGalleryUrls(values: string[] | null | undefined): string[] {
  if (!values || values.length === 0) return [];
  return values
    .map((value) => sanitizeBusinessMediaPath(value))
    .filter((value): value is string => Boolean(value));
}

export function extractBusinessImageObjectPath(value: string | null | undefined): string | null {
  if (!value) return null;

  const sanitized = sanitizeBusinessMediaPath(value);
  if (!sanitized) return null;

  if (sanitized.startsWith('http://') || sanitized.startsWith('https://')) {
    const marker = `/storage/v1/object/public/${BUSINESS_IMAGES_BUCKET}/`;
    const markerIndex = sanitized.indexOf(marker);
    if (markerIndex === -1) return null;
    return sanitized.slice(markerIndex + marker.length).split('?')[0] || null;
  }

  if (sanitized.startsWith('/')) return null;
  return sanitized;
}

export function getRemovedBusinessImagePaths(
  previousValues: Array<string | null | undefined>,
  nextValues: Array<string | null | undefined>
): string[] {
  const nextPaths = new Set(
    nextValues
      .map((value) => extractBusinessImageObjectPath(value))
      .filter((value): value is string => Boolean(value))
  );

  return previousValues
    .map((value) => extractBusinessImageObjectPath(value))
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index)
    .filter((value) => !nextPaths.has(value));
}
