import { auth } from '@/lib/auth/config';
import { NextResponse } from 'next/server';

const PROTECTED_PAGE_PATTERNS = [
  /^\/profile(\/.*)?$/,
  /^\/universes\/new$/,
  /^\/stories\/new$/,
  /^\/pages\/new$/,
];

// API paths whose POST/PATCH/DELETE require a session. GET stays public.
const PROTECTED_API_PATTERNS = [
  /^\/api\/universes(\/.*)?$/,
  /^\/api\/stories(\/.*)?$/,
  /^\/api\/pages(\/.*)?$/,
  /^\/api\/authors\/[^/]+$/,
  /^\/api\/reactions$/,
  /^\/api\/upload$/,
];

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export default auth((req) => {
  const { pathname }  = req.nextUrl;
  const method        = req.method.toUpperCase();
  const isAuthed      = !!req.auth?.user;

  const isProtectedPage = PROTECTED_PAGE_PATTERNS.some(p => p.test(pathname));
  if (isProtectedPage && !isAuthed) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isProtectedApi = MUTATION_METHODS.has(method) &&
                         PROTECTED_API_PATTERNS.some(p => p.test(pathname));
  if (isProtectedApi && !isAuthed) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // page routes
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
