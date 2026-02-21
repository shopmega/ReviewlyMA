const PLACEHOLDER_PREFIX = '/placeholders/';
const LEGACY_PLACEHOLDER_PATHS = new Set(['/placeholder-logo.png']);

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
