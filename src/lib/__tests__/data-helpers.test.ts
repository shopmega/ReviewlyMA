import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoragePublicUrl,
  extractStoragePath,
  parsePostgresArray,
} from '../data';

describe('Data Helpers', () => {
  describe('getStoragePublicUrl', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    });

    it('should return null for empty path', () => {
      expect(getStoragePublicUrl(null)).toBeNull();
      expect(getStoragePublicUrl('')).toBeNull();
    });

    it('should return full URL as-is', () => {
      const url = 'https://example.com/image.jpg';
      expect(getStoragePublicUrl(url)).toBe(url);
    });

    it('should return data URL as-is', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      expect(getStoragePublicUrl(dataUrl)).toBe(dataUrl);
    });

    it('should construct Supabase storage URL', () => {
      const path = 'businesses/logo.jpg';
      const expected = 'https://test.supabase.co/storage/v1/object/public/business-images/businesses/logo.jpg';
      expect(getStoragePublicUrl(path)).toBe(expected);
    });

    it('should handle paths with leading slash', () => {
      const path = '/businesses/logo.jpg';
      const expected = 'https://test.supabase.co/storage/v1/object/public/business-images/businesses/logo.jpg';
      expect(getStoragePublicUrl(path)).toBe(expected);
    });

    it('should handle placeholder paths', () => {
      const path = '/placeholders/logo-placeholder.svg';
      expect(getStoragePublicUrl(path)).toBe(path);
    });

    it('should use custom bucket', () => {
      const path = 'image.jpg';
      const expected = 'https://test.supabase.co/storage/v1/object/public/custom-bucket/image.jpg';
      expect(getStoragePublicUrl(path, 'custom-bucket')).toBe(expected);
    });
  });

  describe('extractStoragePath', () => {
    it('should extract path from Supabase URL', () => {
      const url = 'https://test.supabase.co/storage/v1/object/public/business-images/path/to/image.jpg';
      expect(extractStoragePath(url)).toBe('path/to/image.jpg');
    });

    it('should return null for non-Supabase URLs', () => {
      expect(extractStoragePath('https://example.com/image.jpg')).toBeNull();
    });

    it('should return null for null input', () => {
      expect(extractStoragePath(null)).toBeNull();
    });

    it('should use custom bucket', () => {
      const url = 'https://test.supabase.co/storage/v1/object/public/custom-bucket/path/image.jpg';
      expect(extractStoragePath(url, 'custom-bucket')).toBe('path/image.jpg');
    });
  });

  describe('parsePostgresArray', () => {
    it('should parse Postgres array string', () => {
      const pgArray = '{value1,value2,value3}';
      expect(parsePostgresArray(pgArray)).toEqual(['value1', 'value2', 'value3']);
    });

    it('should parse Postgres array with quoted values', () => {
      const pgArray = '{"value with spaces","another value"}';
      expect(parsePostgresArray(pgArray)).toEqual(['value with spaces', 'another value']);
    });

    it('should parse JSON array', () => {
      const jsonArray = '["value1","value2"]';
      expect(parsePostgresArray(jsonArray)).toEqual(['value1', 'value2']);
    });

    it('should parse comma-separated string', () => {
      const csv = 'value1,value2,value3';
      expect(parsePostgresArray(csv)).toEqual(['value1', 'value2', 'value3']);
    });

    it('should handle empty array', () => {
      expect(parsePostgresArray('{}')).toEqual([]);
      expect(parsePostgresArray('[]')).toEqual([]);
      expect(parsePostgresArray('')).toEqual([]);
      expect(parsePostgresArray(null)).toEqual([]);
    });

    it('should handle already parsed arrays', () => {
      const array = ['value1', 'value2'];
      expect(parsePostgresArray(array)).toEqual(array);
    });

    it('should filter out empty values', () => {
      const pgArray = '{value1,,value2,}';
      expect(parsePostgresArray(pgArray)).toEqual(['value1', 'value2']);
    });
  });
});

