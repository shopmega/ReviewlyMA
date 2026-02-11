import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin'
import { rateLimitByEndpoint } from '@/lib/api-rate-limiter'

export async function GET(request: NextRequest) {
  return rateLimitByEndpoint.admin(request, handler)
}

async function handler(request: NextRequest) {
  try {
    try {
      await verifyAdminSession()
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Admin access required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Business ID parameter is required' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Find business by ID
    const { data: business, error } = await supabase
      .from('businesses')
      .select('id, name, category, city, overall_rating')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        category: business.category,
        city: business.city,
        overall_rating: business.overall_rating || 0
      }
    })

  } catch (error) {
    console.error('Business search error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
