import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from './lib/auth';

const CRON_SECRET = 'a-very-secret-cron-key-for-development';

export async function middleware(request: NextRequest) {
  const isApiCron = request.nextUrl.pathname.startsWith('/api/cron');
  if (isApiCron) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.next();
  }
  
  const publicPaths = ['/login', '/download'];
  
  // Redirect root to /download
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/download', request.url));
  }
  
  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const session = await getSession();

  if (!session?.loggedIn) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // All other paths are protected and assumed to be part of the editor experience
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
