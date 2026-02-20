import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCategories,
  getSubcategories,
  upsertCategory,
  deleteCategory,
  upsertSubcategory,
  deleteSubcategory,
} from '../categories';
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin';
import { logAuditAction } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
  verifyAdminSession: vi.fn(),
}));

vi.mock('@/lib/audit-logger', () => ({
  logAuditAction: vi.fn(() => Promise.resolve()),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe('Category CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdminSession).mockResolvedValue('admin-1');
  });

  it('getCategories should return ordered category rows', async () => {
    const categories = [{ id: 'c1', name: 'Cafe' }];
    vi.mocked(createAdminClient).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: categories, error: null })),
        })),
      })),
    } as any);

    const result = await getCategories();
    expect(result).toEqual(categories);
  });

  it('getSubcategories should return rows for selected category', async () => {
    const subcategories = [{ id: 's1', name: 'Coffee', category_id: 'c1' }];
    vi.mocked(createAdminClient).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: subcategories, error: null })),
          })),
        })),
      })),
    } as any);

    const result = await getSubcategories('c1');
    expect(result).toEqual(subcategories);
  });

  it('upsertCategory should return success and data', async () => {
    const category = { id: 'c3', name: 'New Cat', slug: 'new-cat' };
    vi.mocked(createAdminClient).mockResolvedValue({
      from: vi.fn(() => ({
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: category, error: null })),
          })),
        })),
      })),
    } as any);

    const result = await upsertCategory({ name: 'New Cat', slug: 'new-cat' });

    expect(result.status).toBe('success');
    expect(result.data).toEqual(category);
    expect(logAuditAction).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/categories');
  });

  it('upsertCategory should return error on db failure', async () => {
    vi.mocked(createAdminClient).mockResolvedValue({
      from: vi.fn(() => ({
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({ data: null, error: { message: 'insert failed' } })
            ),
          })),
        })),
      })),
    } as any);

    const result = await upsertCategory({ name: 'New Cat', slug: 'new-cat' });
    expect(result.status).toBe('error');
    expect(result.message).toContain('insert failed');
  });

  it('deleteCategory should return success when delete succeeds', async () => {
    vi.mocked(createAdminClient).mockResolvedValue({
      from: vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    } as any);

    const result = await deleteCategory('c1');
    expect(result.status).toBe('success');
  });

  it('deleteCategory should return error when delete fails', async () => {
    vi.mocked(createAdminClient).mockResolvedValue({
      from: vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: { message: 'delete failed' } })),
        })),
      })),
    } as any);

    const result = await deleteCategory('c1');
    expect(result.status).toBe('error');
    expect(result.message).toContain('delete failed');
  });

  it('upsertSubcategory should return success and data', async () => {
    const subcategory = { id: 's3', name: 'New Sub', category_id: 'c1' };
    vi.mocked(createAdminClient).mockResolvedValue({
      from: vi.fn(() => ({
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: subcategory, error: null })),
          })),
        })),
      })),
    } as any);

    const result = await upsertSubcategory({ name: 'New Sub', category_id: 'c1' });
    expect(result.status).toBe('success');
    expect(result.data).toEqual(subcategory);
  });

  it('deleteSubcategory should return success when delete succeeds', async () => {
    vi.mocked(createAdminClient).mockResolvedValue({
      from: vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    } as any);

    const result = await deleteSubcategory('s1');
    expect(result.status).toBe('success');
  });

  it('deleteSubcategory should return error when delete fails', async () => {
    vi.mocked(createAdminClient).mockResolvedValue({
      from: vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: { message: 'delete failed' } })),
        })),
      })),
    } as any);

    const result = await deleteSubcategory('s1');
    expect(result.status).toBe('error');
    expect(result.message).toContain('delete failed');
  });
});
