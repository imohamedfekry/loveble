import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes accessible without authentication
const publicRoutes = ["/login", "/register", "/request-otp", "/verify-otp"];

// Route that only requires a temp token (not accessToken)
const createAccountRoute = "/create";

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some((route) => pathname.startsWith(route));
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const accessToken = req.cookies.get("Authorization")?.value;
  const tempToken = req.cookies.get("temptoken")?.value;

  const isPublicRoute = matchesRoute(pathname, publicRoutes);
  const isCreateAccountRoute = pathname.startsWith(createAccountRoute);

  // =========================
  // 1. If user is logged in and tries to access auth pages → redirect to dashboard
  // =========================
  if (accessToken && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // =========================
  // 2. Protect create-account route (requires temp token)
  // =========================
  if (isCreateAccountRoute) {
    if (!tempToken) {
      return NextResponse.redirect(new URL("/request-otp", req.url));
    }
    return NextResponse.next(); // allowed to proceed
  }

  // =========================
  // 3. Any route that is not public and not create-account → requires accessToken
  // =========================
  if (!accessToken && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // =========================
  // 4. Normal flow
  // =========================
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};