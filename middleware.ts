import { withAuth } from 'next-auth/middleware';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  // Xử lý CORS cho API routes TRƯỚC KHI áp dụng auth
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin') || 'https://www.speedtest.net';

    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Cho các API requests khác, thêm CORS headers
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');

    return response;
  }

  // Cho các routes không phải API, áp dụng NextAuth middleware
  return withAuth(
    function authMiddleware(req) {
      const { pathname } = req.nextUrl;
      const token = req.nextauth.token;

      // Redirect admin routes if not admin
      if (pathname.startsWith('/admin') && token?.role !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }

      return NextResponse.next();
    },
    {
      callbacks: {
        authorized: ({ token, req }) => {
          const { pathname } = req.nextUrl;

          // Allow public routes
          const publicRoutes = ['/login', '/register', '/'];
          if (publicRoutes.includes(pathname)) {
            return true;
          }

          // Require auth for protected routes
          return !!token;
        },
      },
    }
  )(request as any, event);
}

export const config = {
  matcher: [
    // Bao gồm API routes để xử lý CORS
    '/api/:path*',
    // Protected routes cần auth
    '/home/:path*',
    '/lookup/:path*',
    '/vocabulary/:path*',
    '/profile/:path*',
    '/admin/:path*',
    // Loại trừ các file static
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
