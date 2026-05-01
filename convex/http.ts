import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";
import { snippetToRegistryJson } from "./registry";

const http = httpRouter();

// Register Better Auth routes with CORS enabled for client-side framework compatibility
authComponent.registerRoutes(http, createAuth, { cors: true });

// CORS headers for registry endpoints (used by shadcn CLI)
const REGISTRY_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
} as const;

/**
 * Registry endpoint for shadcn CLI
 * URL format: /r/{namespace}/{name}.json
 * Optional auth: /r/{namespace}/{name}.json?token={registryToken}
 *
 * Examples:
 *   /r/johndoe/button.json (user namespace, public)
 *   /r/acme-corp/button.json?token=abc123 (org namespace, authenticated)
 */
http.route({
  pathPrefix: "/r/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Extract namespace and name from URL
    // Path is /r/{namespace}/{name}.json
    const url = new URL(request.url);
    const pathAfterPrefix = url.pathname.slice("/r/".length); // "namespace/name.json"
    const parts = pathAfterPrefix.split("/");

    if (parts.length !== 2 || !parts[1].endsWith(".json")) {
      return new Response(
        JSON.stringify({
          error: "Invalid path",
          message: "Expected format: /r/{namespace}/{name}.json",
        }),
        {
          status: 400,
          headers: REGISTRY_CORS_HEADERS,
        },
      );
    }

    const namespace = decodeURIComponent(parts[0]);
    const name = parts[1].replace(/\.json$/, "");

    // Check for authentication token in query params (Better Auth JWT)
    const token = url.searchParams.get("token");
    let userId = null;

    if (token) {
      // Validate JWT and get user ID
      userId = await ctx.runQuery(internal.users.validateAuthToken, {
        token,
      });
    }

    // Fetch snippet with auth context
    const snippet = await ctx.runQuery(
      internal.registry.getSnippetWithAuth,
      {
        namespace,
        name,
        userId,
      },
    );

    if (!snippet) {
      return new Response(
        JSON.stringify({
          error: "Snippet not found",
          message: `No snippet found at ${namespace}/${name}`,
        }),
        {
          status: 404,
          headers: REGISTRY_CORS_HEADERS,
        },
      );
    }

    // Increment download count with IP fingerprint for deduplication
    const fingerprint = request.headers.get("x-forwarded-for") || "unknown";
    await ctx.runMutation(internal.registry.incrementDownloads, {
      snippetId: snippet._id,
      fingerprint,
    });

    // Convert to registry JSON and return
    const registryJson = snippetToRegistryJson(snippet);

    return new Response(JSON.stringify(registryJson, null, 2), {
      status: 200,
      headers: REGISTRY_CORS_HEADERS,
    });
  }),
});

// CORS preflight handler for registry endpoint
http.route({
  pathPrefix: "/r/",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: REGISTRY_CORS_HEADERS,
    });
  }),
});

/* -------------------------------------------------------------------------- */
/* Extension API                                                              */
/* -------------------------------------------------------------------------- */

const EXT_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
} as const;

function extJson(
  body: unknown,
  init?: { status?: number },
): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: EXT_CORS_HEADERS,
  });
}

function bearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth) return null;
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return match ? match[1].trim() : null;
}

async function authedUser(ctx: Parameters<Parameters<typeof httpAction>[0]>[0], req: Request) {
  const token = bearerToken(req);
  if (!token) return null;
  return await ctx.runMutation(internal.extensionTokens.validateAndTouch, {
    token,
  });
}

// Preflight for the whole extension surface.
http.route({
  pathPrefix: "/api/extension/",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: EXT_CORS_HEADERS });
  }),
});

// GET /api/extension/me — validate token, return user + orgs.
http.route({
  path: "/api/extension/me",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const user = await authedUser(ctx, req);
    if (!user) return extJson({ error: "Invalid token" }, { status: 401 });
    const orgs = await ctx.runQuery(internal.extensionInternal.getMyOrgs, {
      userId: user.userId,
    });
    return extJson({
      user: {
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
      },
      orgs: orgs.map((o) => ({
        _id: o._id,
        name: o.name,
        slug: o.slug,
        role: o.role,
      })),
    });
  }),
});

// GET /api/extension/snippets?context=personal|<orgId>
http.route({
  path: "/api/extension/snippets",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const user = await authedUser(ctx, req);
    if (!user) return extJson({ error: "Invalid token" }, { status: 401 });
    const url = new URL(req.url);
    const context = url.searchParams.get("context") ?? "personal";
    const snippets = await ctx.runQuery(
      internal.extensionInternal.listSnippets,
      { userId: user.userId, context },
    );
    return extJson({ snippets });
  }),
});

// POST /api/extension/snippets — create from VS Code.
http.route({
  path: "/api/extension/snippets",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const user = await authedUser(ctx, req);
    if (!user) return extJson({ error: "Invalid token" }, { status: 401 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return extJson({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      name,
      title,
      description = "",
      files,
      dependencies = [],
      devDependencies = [],
      registryDependencies = [],
      tags = [],
      orgId,
      isPublic = false,
    } = (body ?? {}) as {
      name?: string;
      title?: string;
      description?: string;
      files?: Array<{
        path: string;
        content: string;
        type: "component" | "hook" | "util" | "style";
        language: "typescript" | "css" | "json";
      }>;
      dependencies?: string[];
      devDependencies?: string[];
      registryDependencies?: string[];
      tags?: string[];
      orgId?: string;
      isPublic?: boolean;
    };

    if (!name || !title || !Array.isArray(files) || files.length === 0) {
      return extJson(
        { error: "Missing required fields: name, title, files" },
        { status: 400 },
      );
    }

    try {
      const id = await ctx.runMutation(
        internal.extensionInternal.createSnippet,
        {
          userId: user.userId,
          name,
          title,
          description,
          files: files.map((f, i) => ({
            id: `ext_${Date.now()}_${i}`,
            path: f.path,
            content: f.content,
            type: f.type,
            language: f.language,
          })),
          dependencies,
          devDependencies,
          registryDependencies,
          tags,
          orgId: orgId
            ? (orgId as unknown as never)
            : undefined,
          isPublic,
        },
      );
      return extJson({ id }, { status: 201 });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create snippet";
      return extJson({ error: message }, { status: 400 });
    }
  }),
});

// GET /api/extension/snippets/public?q=<query>
http.route({
  path: "/api/extension/snippets/public",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const user = await authedUser(ctx, req);
    if (!user) return extJson({ error: "Invalid token" }, { status: 401 });
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const snippets = await ctx.runQuery(
      internal.extensionInternal.searchPublicSnippets,
      { query: q },
    );
    return extJson({ snippets });
  }),
});

// GET /api/extension/commands?context=personal|<orgId>
http.route({
  path: "/api/extension/commands",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const user = await authedUser(ctx, req);
    if (!user) return extJson({ error: "Invalid token" }, { status: 401 });
    const url = new URL(req.url);
    const context = url.searchParams.get("context") ?? "personal";
    const commands = await ctx.runQuery(
      internal.extensionInternal.listCommands,
      { userId: user.userId, context },
    );
    return extJson({ commands });
  }),
});

// GET /api/extension/tags?type=snippet|command
http.route({
  path: "/api/extension/tags",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const user = await authedUser(ctx, req);
    if (!user) return extJson({ error: "Invalid token" }, { status: 401 });
    const url = new URL(req.url);
    const type =
      url.searchParams.get("type") === "command" ? "command" : "snippet";
    const tags = await ctx.runQuery(
      internal.extensionTokens.listTagsForUser,
      { userId: user.userId, type },
    );
    return extJson({ tags });
  }),
});

export default http;
