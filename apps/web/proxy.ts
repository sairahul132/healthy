import { NextResponse, type NextRequest } from "next/server";

/**
 * Name of the refresh-session cookie the backend sets as httpOnly + Secure
 * (docs/SPEC.md §106) — matches apps/api's REFRESH_COOKIE_NAME
 * (app/api/v1/deps.py). `/s/[token]` (the recipient-facing share view) is
 * deliberately NOT in this list — a recipient never has a patient session.
 */
const SESSION_COOKIE_NAME = "hfy_refresh";

const PROTECTED_PATHS = ["/dashboard", "/profile", "/reports", "/timeline", "/share"];

/**
 * This is an optimistic UX redirect only, not an authorization boundary —
 * cookie *presence* doesn't prove a valid session. Every real authorization
 * decision must still be enforced by the API itself (§67 zero-trust
 * frontend rule): if the cookie is stale, the page will get 401s from
 * apiFetch and the session context will bounce the user to /login anyway.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);
  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/reports/:path*",
    "/timeline/:path*",
    "/share/:path*",
  ],
};
