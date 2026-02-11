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

    // Find user by email
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      return NextResponse.json(
        { success: false, error: 'Error listing users' },
        { status: 500 }
      )
    }

    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user profile details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, business_id, role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      // If profile doesn't exist, return basic user info
      if (profileError.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || 'Unknown',
            role: 'user',
            business_id: null
          }
        });
      }
      
      return NextResponse.json(
        { success: false, error: 'Error fetching user profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
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
