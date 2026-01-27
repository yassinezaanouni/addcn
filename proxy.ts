import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth-server";

// Protected routes that require authentication
const protectedRoutes = ["/dashboard", "/onboarding"];
// Public routes that should redirect to dashboard if authenticated
const publicAuthRoutes = ["/login"];

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check if route needs protection
  const isProtectedRoute = protectedRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );
  const isPublicAuthRoute = publicAuthRoutes.includes(path);

  // Skip auth check if route doesn't need it
  if (!isProtectedRoute && !isPublicAuthRoute) {
    return NextResponse.next();
  }

  // Check authentication
  const authed = await isAuthenticated();

  // Redirect to login if accessing protected route while not authenticated
  if (isProtectedRoute && !authed) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if accessing login while authenticated
  if (isPublicAuthRoute && authed) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
