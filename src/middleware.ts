import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verify } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const secret = process.env.SESSION_SECRET;

  const isApiCron = request.nextUrl.pathname.startsWith('/api/cron');
  if (isApiCron) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.next();
  }

  const isPublicPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/download');

  if (!session || !secret) {
    if (isPublicPage) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const payload = await verify(session, secret);
    if (!payload.loggedIn) {
        if (isPublicPage) {
            return NextResponse.next();
          }
      return NextResponse.redirect(new URL('/login', request.url));
    }
  } catch (err) {
    console.error(err);
    if (isPublicPage) {
        return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
