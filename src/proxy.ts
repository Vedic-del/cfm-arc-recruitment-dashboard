import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, passwordToken } from '@/lib/auth';

// Paths reachable without signing in: the login screen itself and the public
// manager scorecard links (hiring managers use those without an account).
const PUBLIC_PREFIXES = ['/login', '/scorecard'];

export async function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  // Gate is opt-in: with no APP_PASSWORD set, the app stays open (so a
  // misconfiguration never locks the whole team out). Set APP_PASSWORD to arm.
  if (!password) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  const expected = await passwordToken(password);
  if (cookie && cookie === expected) return NextResponse.next();

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on everything except Next internals and static metadata files. Server
  // Actions POST to their own route, so they're gated by this matcher too.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
