import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth routes with CORS enabled for client-side framework compatibility
authComponent.registerRoutes(http, createAuth, { cors: true });

// CORS headers for registry endpoints (used by shadcn CLI)
export const REGISTRY_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export default http;
