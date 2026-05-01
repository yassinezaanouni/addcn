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

export default http;
