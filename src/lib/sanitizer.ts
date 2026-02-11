/**
 * HTML Content Sanitization Utility
 * Prevents XSS attacks by sanitizing user-generated content
 * 
 * Security: CRITICAL - Use for all user-generated content
 */

'use client';

// DOMPurify import - optional, falls back to basic sanitization if not available
let DOMPurify: any = null;

try {
  DOMPurify = require('isomorphic-dompurify').default || require('isomorphic-dompurify');
} catch (e) {
  // DOMPurify not installed - will use basic regex sanitization
}

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

/**
 * Sanitize user-generated HTML content
 * @param dirty - Raw HTML content from user
 * @returns Clean, safe HTML content
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty) return '';
  
  try {
    return DOMPurify.sanitize(dirty, SANITIZE_CONFIG);
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
  
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
  const allowed = ['<b>', '<i>', '<em>', '<strong>', '<br>', '<p>'];
  let sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
  
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
  
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'u', 'p', 'br',
      'ul', 'ol', 'li', 'a', 'blockquote',
      'h1', 'h2', 'h3'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    KEEP_CONTENT: true,
  });
  
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
