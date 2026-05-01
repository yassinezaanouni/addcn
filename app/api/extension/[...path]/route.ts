import { NextRequest, NextResponse } from "next/server";

/**
 * Catch-all proxy: forwards `/api/extension/*` from the addcn domain to the
 * Convex HTTP deployment, where the actual auth + data lives. Mirrors the
 * `/r/[namespace]/[name]/route.ts` proxy pattern.
 *
 * Why a proxy at all? So extension users only need ONE config value (the
 * addcn host), not two (host + Convex URL). The user pastes their token,
 * the extension hits https://addcn.dev/api/extension/me, and we relay.
 */

const CONVEX_SITE = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

async function forward(req: NextRequest, pathParts: string[]) {
  if (!CONVEX_SITE) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500, headers: CORS },
    );
  }
  const search = req.nextUrl.search ?? "";
  const target = `${CONVEX_SITE}/api/extension/${pathParts.join("/")}${search}`;
  const auth = req.headers.get("authorization") ?? undefined;

  const init: RequestInit = {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: auth } : {}),
    },
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  try {
    const res = await fetch(target, init);
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        "Content-Type":
          res.headers.get("content-type") ?? "application/json",
        ...CORS,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to reach extension API",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502, headers: CORS },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return forward(req, path);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return forward(req, path);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
