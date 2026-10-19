import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Request proxy — Next.js 16's rename of `middleware.ts`. Runs on the Node
 * runtime before every non-API request. It:
 *   1. refreshes the Supabase session early, writing rotated cookies onto
 *      the request (so Server Components see the fresh token) and onto the
 *      response (so the browser stores it);
 *   2. redirects signed-out users away from protected pages;
 *   3. gates /admin behind the librarian role.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        },
      },
    }
  );

  // getUser() revalidates the token against the Auth server on every request,
  // so a suspension takes effect immediately instead of at token expiry.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Redirects must carry any refreshed session cookies / cache headers.
  const redirectWithSession = (url: URL) => {
    const response = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      response.cookies.set(cookie.name, cookie.value, cookie);
    }
    for (const header of ['cache-control', 'expires', 'pragma']) {
      const value = supabaseResponse.headers.get(header);
      if (value) response.headers.set(header, value);
    }
    return response;
  };

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Redirect authenticated users away from login/register
  if (user && isPublicRoute) {
    return redirectWithSession(new URL('/books', request.url));
  }

  // Protected routes that require authentication
  const protectedRoutes = ['/', '/books', '/profile', '/borrowed'];
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!user && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return redirectWithSession(loginUrl);
  }

  // Admin routes - require librarian role
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return redirectWithSession(loginUrl);
    }

    // Check if user has librarian role by fetching their profile
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'librarian') {
        return redirectWithSession(new URL('/books', request.url));
      }
    } catch {
      return redirectWithSession(new URL('/books', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
