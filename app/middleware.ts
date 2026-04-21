import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Public routes (always accessible)
  const publicRoutes = ['/', '/login', '/signup', '/quick-admission', '/dashboard'];
  const isPublicRoute = publicRoutes.some(route => path === route) || path.startsWith('/api/');
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Create a response object that can be modified with cookies
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  // Create Supabase server client with proper cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Get user role from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role;

  // ========== ADMIN ROUTE PROTECTION ==========
  if (path.startsWith('/admin')) {
    if (role !== 'admin') {
      const dashboardMap: Record<string, string> = {
        student: '/student/dashboard',
        recruiter: '/recruiter/dashboard',
        affiliate: '/affiliate/dashboard',
        institution_admin: '/institution/dashboard',
        consultancy_admin: '/consultancy/dashboard',
      };
      const redirectTo = dashboardMap[role as string] || '/dashboard';
      return NextResponse.redirect(new URL(redirectTo, req.url));
    }
  }

  // ========== MAINTENANCE MODE CHECK ==========
  if (role !== 'admin') {
    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single();
    const maintenance = settings?.value as { enabled: boolean; message?: string };
    if (maintenance?.enabled && path !== '/maintenance') {
      return NextResponse.redirect(new URL('/maintenance', req.url));
    }
  }

  // ========== ROLE‑SPECIFIC ROUTE PROTECTION ==========
  const rolePrefixes: Record<string, string[]> = {
    student: ['/student'],
    recruiter: ['/recruiter'],
    affiliate: ['/affiliate'],
    institution_admin: ['/institution'],
    consultancy_admin: ['/consultancy'],
  };

  for (const [allowedRole, prefixes] of Object.entries(rolePrefixes)) {
    const isAccessing = prefixes.some(prefix => path.startsWith(prefix));
    if (isAccessing && role !== allowedRole) {
      const dashboardMap: Record<string, string> = {
        student: '/student/dashboard',
        recruiter: '/recruiter/dashboard',
        affiliate: '/affiliate/dashboard',
        institution_admin: '/institution/dashboard',
        consultancy_admin: '/consultancy/dashboard',
        admin: '/admin',
      };
      const redirectTo = dashboardMap[role as string] || '/dashboard';
      return NextResponse.redirect(new URL(redirectTo, req.url));
    }
  }

  // ========== RECRUITER SUBSCRIPTION CHECK ==========
  if (role === 'recruiter' && path.startsWith('/recruiter/') && path !== '/recruiter/dashboard') {
    const { data: recruiter } = await supabase
      .from('recruiters')
      .select('subscription_status, trial_started_at')
      .eq('user_id', user.id)
      .single();

    const trialDays = recruiter?.trial_started_at
      ? Math.floor((Date.now() - new Date(recruiter.trial_started_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    if (recruiter?.subscription_status !== 'active' && trialDays >= 30) {
      return NextResponse.redirect(new URL('/recruiter/subscription-required', req.url));
    }
  }

  // Return the response with any cookie modifications
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};