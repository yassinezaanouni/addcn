import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy registry requests to Convex HTTP endpoint
 * This allows using the main domain (addcn.dev) for registry URLs
 * instead of the Convex site URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ namespace: string; name: string }> }
) {
  try {
    const { namespace, name } = await params;
    const token = request.nextUrl.searchParams.get("token");

    const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
    if (!convexSiteUrl) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Build Convex URL (name already includes .json extension)
    const convexUrl = `${convexSiteUrl}/r/${namespace}/${name}${token ? `?token=${token}` : ""}`;

    // Extract client IP for download deduplication
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Proxy to Convex
    const response = await fetch(convexUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Forwarded-For": clientIp,
      },
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Registry proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from registry" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
