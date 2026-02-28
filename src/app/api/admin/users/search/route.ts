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
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()
    const normalizedEmail = email.trim().toLowerCase()

    // Query profile directly (indexed lookup candidate) instead of scanning auth users.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, business_id, role')
      .ilike('email', normalizedEmail)
      .limit(1)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json(
        { success: false, error: 'Error fetching user profile' },
        { status: 500 }
      )
    }
    
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email || normalizedEmail,
        full_name: profile.full_name,
        role: profile.role,
        business_id: profile.business_id
      }
    })

  } catch (error) {
    console.error('User search error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
