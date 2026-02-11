import { describe, it, expect } from 'vitest';
import { cn, isValidImageUrl } from '../utils';

describe('Utils', () => {
  describe('cn (className utility)', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });

    it('should handle undefined and null', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });

    it('should handle arrays', () => {
      expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
    });

    it('should handle objects', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });
  });

  describe('isValidImageUrl', () => {
    it('should return false for empty or undefined', () => {
      expect(isValidImageUrl()).toBe(false);
      expect(isValidImageUrl('')).toBe(false);
      expect(isValidImageUrl(null as any)).toBe(false);
    });

    it('should return true for local paths', () => {
      expect(isValidImageUrl('/images/logo.png')).toBe(true);
      expect(isValidImageUrl('/placeholders/default.svg')).toBe(true);
    });

    it('should return true for HTTP URLs', () => {
      expect(isValidImageUrl('http://example.com/image.jpg')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.jpg')).toBe(true);
    });

    it('should return true for data URLs', () => {
      expect(isValidImageUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidImageUrl('not-a-url')).toBe(false);
      expect(isValidImageUrl('ftp://example.com/image.jpg')).toBe(false);
    });
  });
});

