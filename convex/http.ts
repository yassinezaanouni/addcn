import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";
import { componentToRegistryJson } from "./registry";

const http = httpRouter();

// Register Better Auth routes with CORS enabled for client-side framework compatibility
authComponent.registerRoutes(http, createAuth, { cors: true });

// CORS headers for registry endpoints (used by shadcn CLI)
const REGISTRY_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
} as const;

/**
 * Registry endpoint for shadcn CLI
 * URL format: /r/{namespace}/{name}.json
 *
 * Examples:
 *   /r/johndoe/button.json (user namespace)
 *   /r/acme-corp/button.json (org namespace)
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
        }
      );
    }

    const namespace = decodeURIComponent(parts[0]);
    const name = parts[1].replace(/\.json$/, "");

    // Fetch the public component
    const component = await ctx.runQuery(internal.registry.getPublicComponent, {
      namespace,
      name,
    });

    if (!component) {
      return new Response(
        JSON.stringify({
          error: "Component not found",
          message: `No public component found at ${namespace}/${name}`,
        }),
        {
          status: 404,
          headers: REGISTRY_CORS_HEADERS,
        }
      );
    }

    // Increment download count (fire and forget - don't await)
    ctx.runMutation(internal.registry.incrementDownloads, {
      componentId: component._id,
    });

    // Convert to registry JSON and return
    const registryJson = componentToRegistryJson(component);

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
