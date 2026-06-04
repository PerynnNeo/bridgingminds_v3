import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

/** Routes that require authentication. */
const PROTECTED_PREFIXES = ['/home', '/practice', '/games', '/profile', '/onboarding'];
/** Public auth pages a signed-in user shouldn't see. */
const AUTH_PAGES = ['/login', '/signup'];

function matchesPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Clone the refreshed cookies onto a redirect response so the session survives. */
function redirectWithCookies(request: NextRequest, from: NextResponse, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

/**
 * Refreshes the Supabase auth session and enforces route protection (spec §7.3).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Before Supabase keys are configured, pass requests through untouched.
  if (!url || !anonKey) return supabaseResponse;

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: keep getUser() immediately after client creation, do not insert
  // other logic between, or session refresh can break.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = matchesPrefix(path, PROTECTED_PREFIXES);
  const isAuthPage = AUTH_PAGES.includes(path);

  if (!user) {
    if (isProtected) return redirectWithCookies(request, supabaseResponse, '/login');
    return supabaseResponse;
  }

  // Signed in, branch on onboarding status only where it matters.
  if (isProtected || isAuthPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    const onboardingComplete = profile?.onboarding_completed ?? false;
    const onOnboarding = path === '/onboarding' || path.startsWith('/onboarding/');

    if (isAuthPage) {
      return redirectWithCookies(request, supabaseResponse, onboardingComplete ? '/home' : '/onboarding');
    }
    if (!onboardingComplete && !onOnboarding) {
      return redirectWithCookies(request, supabaseResponse, '/onboarding');
    }
    if (onboardingComplete && onOnboarding) {
      return redirectWithCookies(request, supabaseResponse, '/home');
    }
  }

  return supabaseResponse;
}
