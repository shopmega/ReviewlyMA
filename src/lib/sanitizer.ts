/**
 * HTML Content Sanitization Utility
 * Prevents XSS attacks by sanitizing user-generated content
 *
 * Security: CRITICAL - Use for all user-generated content
 *
 * NOTE:
 * We intentionally avoid server-side DOMPurify runtime imports here because
 * some deployment environments throw ERR_REQUIRE_ESM through transitive deps.
 * This utility must stay synchronous and SSR-safe.
 */

/**
 * Sanitization configuration
 * Conservative whitelist of allowed HTML tags
 */
const SANITIZE_CONFIG: any = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'u', 'p', 'br',
    'ul', 'ol', 'li', 'a', 'blockquote',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'title',
    'class', 'id'
  ],
  KEEP_CONTENT: true,
};

const URL_ATTRS = new Set(['href', 'src']);

function removeDangerousBlocks(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
}

function sanitizeTagAttributes(rawAttrs: string): string {
  if (!rawAttrs) return '';

  const attrs: string[] = [];
  const attrRegex = /([a-zA-Z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(rawAttrs)) !== null) {
    const name = match[1].toLowerCase();
    const value = (match[3] ?? match[4] ?? match[5] ?? '').trim();

    if (!name || !value) continue;
    if (name.startsWith('on')) continue;

    // Keep only configured attributes.
    if (!SANITIZE_CONFIG.ALLOWED_ATTR.includes(name)) continue;

    if (URL_ATTRS.has(name)) {
      const safeUrl = sanitizeURL(value);
      if (!safeUrl) continue;
      attrs.push(`${name}="${encodeHTML(safeUrl)}"`);
      continue;
    }

    attrs.push(`${name}="${encodeHTML(value)}"`);
  }

  return attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
}

function sanitizeAllowedHtml(input: string, allowedTags: string[]): string {
  const allowed = new Set(allowedTags.map((t) => t.toLowerCase()));
  const stripped = removeDangerousBlocks(input);

  return stripped.replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (full, tagName: string, attrs: string) => {
    const tag = String(tagName || '').toLowerCase();
    if (!allowed.has(tag)) {
      return '';
    }

    const isClosing = full.startsWith('</');
    if (isClosing) {
      return `</${tag}>`;
    }

    const safeAttrs = sanitizeTagAttributes(attrs || '');
    return `<${tag}${safeAttrs}>`;
  });
}

/**
 * Sanitize user-generated HTML content
 * @param dirty - Raw HTML content from user
 * @returns Clean, safe HTML content
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty) return '';

  try {
    return sanitizeAllowedHtml(dirty, SANITIZE_CONFIG.ALLOWED_TAGS);
  } catch (error) {
    console.error('Error sanitizing HTML:', error);
    // Fallback to plain text encoding
    return encodeHTML(dirty);
  }
}

/**
 * Sanitize plain text (escape HTML characters)
 * @param text - Raw text content
 * @returns HTML-safe text
 */
export function sanitizeText(text: string): string {
  if (!text) return '';

  return encodeHTML(text);
}

/**
 * Encode HTML special characters
 * @param text - Text to encode
 * @returns Encoded text
 */
function encodeHTML(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Sanitize URLs to prevent javascript: and data: URLs
 * @param url - URL to sanitize
 * @returns Safe URL or empty string
 */
export function sanitizeURL(url: string): string {
  if (!url) return '';

  try {
    // Remove whitespace
    const trimmed = url.trim().toLowerCase();

    // Block dangerous protocols
    if (trimmed.startsWith('javascript:') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('vbscript:')) {
      return '';
    }

    // Ensure absolute or relative URL
    if (trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('mailto:')) {
      return url;
    }

    // Default to relative URL
    return '/' + url;
  } catch {
    return '';
  }
}

/**
 * Strip all HTML tags
 * @param html - HTML content
 * @returns Plain text
 */
export function stripHTML(html: string): string {
  if (!html) return '';

  try {
    return removeDangerousBlocks(html)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (error) {
    console.error('Error stripping HTML:', error);
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

/**
 * Sanitize user review content
 * Allows basic formatting but prevents malicious content
 * @param content - Review text
 * @returns Safe review content
 */
export function sanitizeReviewContent(content: string): string {
  if (!content) return '';

  // Allow basic formatting
  let sanitized = sanitizeAllowedHtml(content, ['b', 'i', 'em', 'strong', 'br', 'p']);

  // Ensure length limits
  if (sanitized.length > 5000) {
    sanitized = sanitized.substring(0, 5000) + '...';
  }

  return sanitized;
}

/**
 * Sanitize business information
 * More permissive than user content
 * @param content - Business content
 * @returns Safe business content
 */
export function sanitizeBusinessContent(content: string): string {
  if (!content) return '';

  let sanitized = sanitizeAllowedHtml(content, [
    'b', 'i', 'em', 'strong', 'u', 'p', 'br',
    'ul', 'ol', 'li', 'a', 'blockquote',
    'h1', 'h2', 'h3'
  ]);

  // Ensure length limits
  if (sanitized.length > 10000) {
    return sanitized.substring(0, 10000) + '...';
  }

  return sanitized;
}

/**
 * Sanitize JSON field from user input
 * @param json - JSON string
 * @returns Parsed and re-stringified JSON (removes functions, etc.)
 */
export function sanitizeJSON(json: string): string {
  if (!json) return '{}';

  try {
    const parsed = JSON.parse(json);
    return JSON.stringify(parsed);
  } catch {
    return '{}';
  }
}

export default {
  sanitizeHTML,
  sanitizeText,
  sanitizeURL,
  stripHTML,
  sanitizeReviewContent,
  sanitizeBusinessContent,
  sanitizeJSON,
};
