import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session — must be called before any conditional redirect
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── GP dashboard guard ──────────────────────────────────────────────────────
  if (!user && pathname.startsWith("/dashboard")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user hitting / → send to /login (portal choice handled there)
  if (user && pathname === "/") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // ── Admin portal guard ──────────────────────────────────────────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      return NextResponse.redirect(loginUrl);
    }

    // Call the is_admin() SECURITY DEFINER function via the authenticated session.
    // Returns true if the user has an active row in admin_users.
    const { data: isAdmin, error } = await supabase.rpc("is_admin", {
      uid: user.id,
    });

    if (error || !isAdmin) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("error", "access_denied");
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated admin away from /admin/login
  if (user && pathname === "/admin/login") {
    const { data: isAdmin } = await supabase.rpc("is_admin", { uid: user.id });
    if (isAdmin) {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = "/admin";
      return NextResponse.redirect(adminUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
