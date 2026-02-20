import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getFilteredBusinesses,
  getBusinessById,
  getBusinessReviews,
  getBusinessHours,
  getAllCategories,
  getFeaturedBusinesses,
} from '../data/businesses';
import { getPublicClient } from '../data/client';
import { mapBusinessFromDB, mapCollectionFromDB } from '../data/mappers';

vi.mock('../data/client', () => ({
  getPublicClient: vi.fn(),
}));

vi.mock('../data/mappers', () => ({
  mapBusinessFromDB: vi.fn((row: any) => ({ id: row.id, name: row.name })),
  mapCollectionFromDB: vi.fn((row: any) => row),
}));

function createThenableQuery(result: any) {
  const query: any = {
    or: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    contains: vi.fn(() => query),
    range: vi.fn(() => query),
    order: vi.fn(() => query),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

describe('Data Fetching Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getFilteredBusinesses should return mapped paginated result', async () => {
    const query = createThenableQuery({
      data: [{ id: 'b1', name: 'Business 1' }],
      error: null,
      count: 1,
    });

    vi.mocked(getPublicClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => query),
      })),
    } as any);

    const result = await getFilteredBusinesses({ page: 1, limit: 12 });

    expect(result.businesses).toEqual([{ id: 'b1', name: 'Business 1' }]);
    expect(result.totalCount).toBe(1);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('getFilteredBusinesses should return empty payload on query error', async () => {
    const query = createThenableQuery({
      data: null,
      error: { message: 'query failed' },
      count: 0,
    });

    vi.mocked(getPublicClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => query),
      })),
    } as any);

    const result = await getFilteredBusinesses({ page: 1, limit: 12 });

    expect(result.businesses).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('getBusinessById should return mapped business', async () => {
    vi.mocked(getPublicClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'b1', name: 'Business 1' }, error: null })),
          })),
        })),
      })),
    } as any);

    const result = await getBusinessById('b1');

    expect(result).toEqual({ id: 'b1', name: 'Business 1' });
    expect(mapBusinessFromDB).toHaveBeenCalledTimes(1);
  });

  it('getBusinessById should return null when row not found', async () => {
    vi.mocked(getPublicClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
          })),
        })),
      })),
    } as any);

    const result = await getBusinessById('missing');
    expect(result).toBeNull();
  });

  it('getBusinessReviews should return review rows', async () => {
    const reviews = [{ id: 1 }, { id: 2 }];
    vi.mocked(getPublicClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: reviews, error: null })),
            })),
          })),
        })),
      })),
    } as any);

    const result = await getBusinessReviews('b1');
    expect(result).toEqual(reviews);
  });

  it('getBusinessHours should return business hours rows', async () => {
    const hours = [{ day_of_week: 1, open_time: '09:00' }];
    vi.mocked(getPublicClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: hours, error: null })),
        })),
      })),
    } as any);

    const result = await getBusinessHours('b1');
    expect(result).toEqual(hours);
  });

  it('getAllCategories should return unique sorted categories', async () => {
    vi.mocked(getPublicClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          not: vi.fn(() =>
            Promise.resolve({
              data: [{ category: 'Cafe' }, { category: 'Hotel' }, { category: 'Cafe' }],
              error: null,
            })
          ),
        })),
      })),
    } as any);

    const result = await getAllCategories();
    expect(result).toEqual(['Cafe', 'Hotel']);
  });

  it('getFeaturedBusinesses should return the featured business list', async () => {
    const query = createThenableQuery({
      data: [{ id: 'f1', name: 'Featured 1' }, { id: 'f2', name: 'Featured 2' }],
      error: null,
      count: 2,
    });

    vi.mocked(getPublicClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => query),
      })),
    } as any);

    const result = await getFeaturedBusinesses();
    expect(result).toEqual([
      { id: 'f1', name: 'Featured 1' },
      { id: 'f2', name: 'Featured 2' },
    ]);
  });
});
