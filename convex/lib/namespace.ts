/**
 * Namespace resolution helper
 * Resolves a namespace string (username or org slug) to its owner
 */

import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";

/**
 * Discriminated union type for namespace owners
 */
export type NamespaceOwner =
  | { type: "user"; user: Doc<"users"> }
  | { type: "org"; org: Doc<"organizations"> };

/**
 * Resolves a namespace string to either a user or organization
 *
 * @param ctx - Convex query context
 * @param namespace - The namespace to resolve (may have @ prefix)
 * @returns The namespace owner (user or org) or null if not found
 *
 * Resolution order:
 * 1. Remove @ prefix if present
 * 2. Check users table by username
 * 3. Check organizations table by slug
 */
export async function resolveNamespace(
  ctx: QueryCtx,
  namespace: string
): Promise<NamespaceOwner | null> {
  // Remove @ prefix if present
  const cleanNamespace = namespace.startsWith("@")
    ? namespace.slice(1)
    : namespace;

  // Check users first
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", cleanNamespace))
    .unique();

  if (user) {
    return { type: "user", user };
  }

  // Check organizations
  const org = await ctx.db
    .query("organizations")
    .withIndex("by_slug", (q) => q.eq("slug", cleanNamespace))
    .unique();

  if (org) {
    return { type: "org", org };
  }

  return null;
}
