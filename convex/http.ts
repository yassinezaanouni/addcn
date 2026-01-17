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
 *   /r/@johndoe/button.json (user namespace with @ prefix)
 *   /r/acme-corp/button.json (org namespace)
 */
http.route({
  path: "/r/{namespace}/{name}.json",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Extract namespace and name from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // Path is /r/{namespace}/{name}.json
    // pathParts = ["", "r", "{namespace}", "{name}.json"]
    const namespace = decodeURIComponent(pathParts[2]);
    const nameWithExt = pathParts[3];
    const name = nameWithExt.replace(/\.json$/, "");

    // Fetch the public component
    const component = await ctx.runQuery(internal.registry.getPublicComponent, {
      namespace,
      name,
    });

    if (!component) {
      return new Response(
        JSON.stringify({
          error: "Component not found",
          message: `No public component found at @${namespace}/${name}`,
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
  path: "/r/{namespace}/{name}.json",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: REGISTRY_CORS_HEADERS,
    });
  }),
});

export default http;
