import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from './lib/auth';

const CRON_SECRET = 'a-very-secret-cron-key-for-development';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CRON auth
  if (pathname.startsWith('/api/cron')) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.next();
  }

  const publicPaths = ['/login', '/download'];

  const session = await getSession();

  // Root path logic
  if (pathname === '/') {
    if (session?.loggedIn) {
      return NextResponse.redirect(new URL('/editor', request.url));
    }
    return NextResponse.redirect(new URL('/download', request.url));
  }

  // Public paths are always accessible
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // All other paths require login
  if (!session?.loggedIn) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
