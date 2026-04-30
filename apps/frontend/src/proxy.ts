import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // cookies
  const accessToken = req.cookies.get("Authorization")?.value;
  const refreshToken = req.cookies.get("refreshToken")?.value;
  const tempToken = req.cookies.get("temptoken")?.value;
  console.log(req.cookies);
  
  console.log(accessToken, refreshToken ,tempToken);
  
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/request-otp") ||
    pathname.startsWith("/verify-otp");

  const isCreateAccountRoute = pathname.startsWith("/create");

  // =========================
  // 1. لو المستخدم عامل login → امنعه يدخل auth pages
  // =========================
  if (accessToken && isAuthRoute) {
    console.log('user login and try access auth pages');
    
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // =========================
  // 2. لو مش عامل login → امنعه يدخل dashboard أو أي protected route
  // =========================
  if (!accessToken && pathname.startsWith("/dashboard")) {
    console.log('try accses dashboard');
    
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // =========================
  // 3. حماية create account (لازم temp token)
  // =========================
  if (isCreateAccountRoute && !tempToken) {
    console.log('no temptoken');
    
    return NextResponse.redirect(new URL("/request-otp", req.url));
  }

  // =========================
  // 4. مسار طبيعي
  // =========================
  return NextResponse.next();
}

// مهم جدًا
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};