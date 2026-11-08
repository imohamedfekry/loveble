import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes accessible without a session. Children of these paths are public too.
const publicRoutes = ["/login", "/register"];

// Final step of the sign-up flow: needs the short-lived temp token issued by
// the OTP verification step, not a full session.
const createAccountRoute = "/register/create";

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const accessToken = req.cookies.get("Authorization")?.value;
  const tempToken = req.cookies.get("temptoken")?.value;

  // =========================
  // 1. Sign-up's last step — checked before the public "/register" prefix.
  // =========================
  if (matchesRoute(pathname, [createAccountRoute])) {
    if (accessToken) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (!tempToken) {
      // Temp token missing or expired: restart the flow at its entry point.
      return NextResponse.redirect(new URL("/register", req.url));
    }
    return NextResponse.next();
  }

  const isPublicRoute = matchesRoute(pathname, publicRoutes);

  // =========================
  // 2. Signed-in users have nothing to do on the auth pages.
  // =========================
  if (accessToken && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // =========================
  // 3. Everything else requires an access token.
  // =========================
  if (!accessToken && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
