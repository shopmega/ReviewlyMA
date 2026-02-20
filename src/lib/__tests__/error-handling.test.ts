import { describe, it, expect } from 'vitest';

type GenericError = {
  code?: string;
  message: string;
  details?: string;
};

function classifyError(error: GenericError): 'db' | 'auth' | 'network' | 'unknown' {
  const code = String(error.code || '').toLowerCase();

  if (code.startsWith('23') || code.startsWith('08')) return 'db';
  if (code === '401' || code === '403') return 'auth';
  if (code === 'etimedout' || code === 'enotfound') return 'network';
  return 'unknown';
}

async function retryAsync<T>(fn: () => Promise<T>, retries: number): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries - 1) {
        throw error;
      }
    }
  }

  throw lastError;
}

function filterValidRecords<T extends { data: unknown }>(rows: T[]): T[] {
  return rows.filter((row) => row.data !== null);
}

describe('Error Handling Tests', () => {
  it('should classify database related errors', () => {
    expect(classifyError({ code: '23505', message: 'duplicate key' })).toBe('db');
    expect(classifyError({ code: '08006', message: 'connection failure' })).toBe('db');
  });

  it('should classify auth related errors', () => {
    expect(classifyError({ code: '401', message: 'unauthorized' })).toBe('auth');
    expect(classifyError({ code: '403', message: 'forbidden' })).toBe('auth');
  });

  it('should classify network related errors', () => {
    expect(classifyError({ code: 'ETIMEDOUT', message: 'timeout' })).toBe('network');
    expect(classifyError({ code: 'ENOTFOUND', message: 'dns failed' })).toBe('network');
  });

  it('should classify unknown errors safely', () => {
    expect(classifyError({ message: 'unexpected error' })).toBe('unknown');
  });

  it('should retry a transiently failing operation', async () => {
    let attempts = 0;

    const result = await retryAsync(async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error('temporary');
      }
      return 'ok';
    }, 3);

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('should throw after max retries are exhausted', async () => {
    await expect(
      retryAsync(async () => {
        throw new Error('always failing');
      }, 2)
    ).rejects.toThrow('always failing');
  });

  it('should keep only complete records during partial failure recovery', () => {
    const rows = [
      { id: '1', data: { value: 10 } },
      { id: '2', data: null },
      { id: '3', data: { value: 20 } },
    ];

    const filtered = filterValidRecords(rows);
    expect(filtered.map((row) => row.id)).toEqual(['1', '3']);
  });
});
