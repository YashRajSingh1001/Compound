import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs before every page request: refreshes the Supabase session cookie
// and sends logged-out visitors to /login.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  // The demo is public: generated data only, nothing from the database.
  const isPublic = request.nextUrl.pathname === "/demo" || request.nextUrl.pathname.startsWith("/demo/");
  if (!user && !isLoginPage && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except API routes, Next internals, static files, and the
    // OAuth addresses MCP clients probe (/.well-known/*, plus the fallback
    // /register, /authorize and /token). Those must answer 404, not redirect
    // to the login page: Claude.ai reads a redirect as "this server has OAuth
    // sign-in", while the MCP server uses a secret URL instead.
    "/((?!api|_next/static|_next/image|\\.well-known|(?:register|authorize|token)(?:/|$)|favicon.ico|.*\\.(?:png|svg|ico|webmanifest)$).*)",
  ],
};
