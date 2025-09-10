import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ashridge-welfare-tracker-secret-key';

export function middleware(request: NextRequest) {
  // Skip middleware during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.next();
  }

  // Skip authentication for static files, API auth endpoint, login page, and health check
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon') ||
    request.nextUrl.pathname.endsWith('.png') ||
    request.nextUrl.pathname.endsWith('.jpg') ||
    request.nextUrl.pathname.endsWith('.jpeg') ||
    request.nextUrl.pathname.endsWith('.gif') ||
    request.nextUrl.pathname.endsWith('.svg') ||
    request.nextUrl.pathname === '/api/health' ||
    request.nextUrl.pathname === '/api/auth' ||
    request.nextUrl.pathname === '/login'
  ) {
    return NextResponse.next();
  }

  // Get the auth token from cookies
  const token = request.cookies.get('auth-token')?.value;
  
  let isAuthenticated = false;

  if (token) {
    try {
      verify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch (error) {
      // Token is invalid or expired
      isAuthenticated = false;
    }
  }

  if (!isAuthenticated) {
    // Redirect to login page instead of showing inline form
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Authentication successful, continue to the requested page
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|ashridge-logo.png|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
};
