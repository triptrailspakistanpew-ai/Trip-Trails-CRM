/**
 * proxy.ts — Edge Authentication Middleware (Parked)
 *
 * NOTE: In Next.js App Router, this middleware can be activated by renaming this file
 * to `middleware.ts` (exporting default or `middleware`). It inspects HttpOnly JWT cookies
 * (`tf_access_token`, `tf_refresh_token`) and manages redirects between /login and /dashboard.
 * It is currently parked as `proxy.ts` during local testing to prevent automatic Edge redirects.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Check if a JWT token string is absent, malformed, or expired.
 */
function isTokenExpired(jwtToken?: string): boolean {
  if (!jwtToken) return true;
  try {
    const parts = jwtToken.split(".");
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get("tf_access_token")?.value;
  const refreshToken = request.cookies.get("tf_refresh_token")?.value;

  const isAccessValid = !isTokenExpired(token);
  const isRefreshValid = !isTokenExpired(refreshToken);
  const isAuthenticated = isAccessValid || isRefreshValid;

  const { pathname } = request.nextUrl;
  const isLogoutOrExpired =
    request.nextUrl.searchParams.has("logout") ||
    request.nextUrl.searchParams.has("expired");

  // Handle /login route
  if (pathname.startsWith("/login")) {
    if (isLogoutOrExpired) {
      const response = NextResponse.next();
      response.cookies.delete("tf_access_token");
      response.cookies.delete("tf_refresh_token");
      return response;
    }
    if (isAuthenticated) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
    return NextResponse.next();
  }

  // Handle root / route
  if (pathname === "/") {
    const targetUrl = new URL(isAuthenticated ? "/dashboard" : "/login", request.url);
    return NextResponse.redirect(targetUrl);
  }

  // Protect internal app routes
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    if (token || refreshToken) {
      response.cookies.delete("tf_access_token");
      response.cookies.delete("tf_refresh_token");
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|woff|woff2|ttf|otf)$).*)",
  ],
};
