import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth-server";

// Protected routes that require authentication
const protectedRoutes = ["/dashboard", "/onboarding"];
// Public routes that should redirect to dashboard if authenticated
const publicAuthRoutes = ["/login"];

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Handle PostHog proxy requests first (before auth)
  if (path.startsWith("/ph")) {
    const url = request.nextUrl.clone();
    const hostname = path.startsWith("/ph/static/")
      ? "us-assets.i.posthog.com"
      : "us.i.posthog.com";

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("host", hostname);
    requestHeaders.delete("cookie"); // Don't forward auth cookies to PostHog

    url.protocol = "https";
    url.hostname = hostname;
    url.port = "443";
    url.pathname = path.replace(/^\/ph/, "");

    return NextResponse.rewrite(url, {
      headers: requestHeaders,
    });
  }

  // Check if route needs protection
  const isProtectedRoute = protectedRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`),
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
    // PostHog proxy
    "/ph/:path*",
    // Match all paths except static files and api routes
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
