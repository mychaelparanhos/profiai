import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const session =
    request.cookies.get('next-auth.session-token') ||
    request.cookies.get('__Secure-next-auth.session-token');
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
