import { type NextRequest, NextResponse } from 'next/server'
// Use optimized middleware with caching
import { updateSession } from '@/lib/supabase/middleware-optimized'

// Security: Request size limit (10MB)
const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB

export async function middleware(request: NextRequest) {
  // Check request size for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentLength = request.headers.get('content-length');
    
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return new NextResponse('Payload too large', { 
        status: 413,
        statusText: 'Payload Too Large'
      });
    }
  }
  
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
