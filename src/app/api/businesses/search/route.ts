import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { rateLimitByEndpoint } from '@/lib/api-rate-limiter';

// Search query validation schema
const searchQuerySchema = z.object({
  q: z.string().min(2, 'Query must be at least 2 characters').max(100),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10).optional(),
  category: z.string().optional(),
  city: z.string().optional(),
});

/**
 * Enhanced Business Search API
 * GET /api/businesses/search?q=query&page=1&limit=10&category=restaurant&city=casablanca
 * 
 * Features:
 * - Full-text search on name, location, description
 * - Pagination support
 * - Category and city filtering
 * - Proper error handling and validation
 */
export async function GET(request: NextRequest) {
  return rateLimitByEndpoint.read(request, searchHandler);
}

async function searchHandler(request: NextRequest) {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;

    // Build params object, only including present values to avoid Zod null/undefined issues
    const params: any = {
      q: searchParams.get('q') || '',
    };

    const pageParam = searchParams.get('page');
    if (pageParam) params.page = pageParam;

    const limitParam = searchParams.get('limit');
    if (limitParam) params.limit = limitParam;

    const categoryParam = searchParams.get('category');
    if (categoryParam) params.category = categoryParam;

    const cityParam = searchParams.get('city');
    if (cityParam) params.city = cityParam;

    const validatedParams = searchQuerySchema.safeParse(params);

    if (!validatedParams.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validatedParams.error.flatten().fieldErrors,
          results: [],
          pagination: null,
        },
        { status: 400 }
      );
    }

    const { q, page = 1, limit = 10, category, city } = validatedParams.data;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Build query with full-text search
    let query = supabase
      .from('businesses')
      .select('id, name, location, category, logo_url, city, overall_rating, description', { count: 'exact' });

    // Search in name, location, description, and city
    const searchPattern = `%${q}%`;
    query = query.or(
      `name.ilike.${searchPattern},location.ilike.${searchPattern},description.ilike.${searchPattern},city.ilike.${searchPattern}`
    );

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    // Note: If you add an is_active column later, uncomment this:
    // query = query.eq('is_active', true);

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Apply pagination
    query = query.range(from, to);

    // Order by relevance (rating first, then name)
    query = query.order('overall_rating', { ascending: false, nullsFirst: false });
    query = query.order('name', { ascending: true });

    const { data: businesses, error, count } = await query;

    if (error) {
      logger.error('Search query error', error, { query: q, category, city });
      return NextResponse.json(
        {
          error: 'Search failed',
          message: 'An error occurred while searching. Please try again.',
          results: [],
          pagination: null,
        },
        { status: 500 }
      );
    }

    // Enhanced Search Logic: If no results with the exact phrase, try splitting by words
    let businessesWithClaimStatus = [];
    let finalBusinesses = businesses;
    let finalCount = count;

    if ((!businesses || businesses.length === 0) && q.includes(' ')) {
      const words = q.split(/\s+/).filter(w => w.length >= 2);
      if (words.length > 0) {
        let multiWordQuery = supabase
          .from('businesses')
          .select('id, name, location, category, logo_url, city, overall_rating, description', { count: 'exact' });

        // Build an OR condition that joins multiple word matches
        // For simplicity, we search if ANY word matches ANY field
        const wordFilters = words.map(w => {
          const p = `%${w}%`;
          return `name.ilike.${p},location.ilike.${p},description.ilike.${p},city.ilike.${p}`;
        }).join(',');

        const { data: fuzzyData, count: fuzzyCount } = await multiWordQuery
          .or(wordFilters)
          .range(from, to)
          .order('overall_rating', { ascending: false });

        if (fuzzyData && fuzzyData.length > 0) {
          finalBusinesses = fuzzyData;
          finalCount = fuzzyCount;
        }
      }
    }

    // NEW: Check which businesses are already claimed
    const businessIds = finalBusinesses?.map(b => b.id) || [];
    let claimedIds = new Set();

    if (businessIds.length > 0) {
      const { data: claims } = await supabase
        .from('business_claims')
        .select('business_id')
        .in('business_id', businessIds)
        .eq('status', 'approved');

      if (claims) {
        claimedIds = new Set(claims.map(c => c.business_id));
      }
    }

    businessesWithClaimStatus = finalBusinesses?.map(b => ({
      ...b,
      is_claimed: claimedIds.has(b.id)
    })) || [];

    const totalPages = finalCount ? Math.ceil(finalCount / limit) : 0;
    const responseTime = Date.now() - startTime;

    logger.info('Business search completed', {
      query: q,
      results: finalBusinesses?.length || 0,
      page,
      totalPages,
      responseTime,
    });

    return NextResponse.json({
      results: businessesWithClaimStatus,
      query: q,
      pagination: {
        page,
        limit,
        total: finalCount || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: {
        category: category || null,
        city: city || null,
      },
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });
  } catch (error) {
    logger.error('Search endpoint error', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.',
        results: [],
        pagination: null,
      },
      { status: 500 }
    );
  }
}
