import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

/**
 * Fast, edge-safe gate for admin routes: redirects at the HTTP level when
 * the session cookie is simply absent, so logged-out requests get a real
 * 307 instead of relying on the (admin) layout's redirect() — which, once
 * app/loading.tsx starts streaming the shell, can only redirect client-side.
 *
 * This does not validate the session against the database (that stays in
 * lib/auth.ts's getAdminFromSession, used by the layout and every API
 * route) — it only short-circuits the common case of no cookie at all.
 */
export function proxy(req: NextRequest) {
  const hasSession = req.cookies.has(SESSION_COOKIE_NAME);

  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/schedules/:path*",
    "/content/:path*",
    "/academic/:path*",
    "/students/:path*",
    "/playlists/:path*",
    "/screens/:path*",
    "/integrations/:path*",
    "/preview",
    "/emergency",
    // `:path*` juga cocok dengan path dasarnya, jadi subhalaman seperti
    // /settings/general dan /settings/security ikut tersaring.
    "/activity-logs/:path*",
    "/settings/:path*",
  ],
};
