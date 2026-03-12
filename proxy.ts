import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  // NextAuth v5 uses authjs.* cookie names (not next-auth.* from v4)
  const session =
    request.cookies.get('__Secure-authjs.session-token') ||
    request.cookies.get('authjs.session-token'); // dev/HTTP fallback
  const isAuth = !!session;

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/aula') ||
    request.nextUrl.pathname.startsWith('/turmas') ||
    request.nextUrl.pathname.startsWith('/planos') ||
    request.nextUrl.pathname.startsWith('/configuracoes');

  if (!isAuth && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/aula/:path*',
    '/turmas/:path*',
    '/planos/:path*',
    '/configuracoes/:path*',
  ],
};
