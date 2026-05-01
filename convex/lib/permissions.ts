/**
 * Permission checking functions for snippet access
 */

import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";

/**
 * Get the user's membership in an organization
 */
async function getOrgMembership(
  ctx: QueryCtx,
  orgId: Id<"organizations">,
  userId: Id<"users">,
): Promise<Doc<"orgMembers"> | null> {
  return await ctx.db
    .query("orgMembers")
    .withIndex("by_orgId_userId", (q) =>
      q.eq("orgId", orgId).eq("userId", userId),
    )
    .unique();
}

/**
 * Check if a user can access a snippet (view it)
 *
 * Access is granted if:
 * - Snippet is public, OR
 * - User is the owner (personal snippet), OR
 * - User is a member of the owning organization
 */
export async function canAccessSnippet(
  ctx: QueryCtx,
  snippet: Doc<"snippets">,
  userId: Id<"users"> | null,
): Promise<boolean> {
  // Public snippets are always accessible
  if (snippet.isPublic) {
    return true;
  }

  // Anonymous users can't access private snippets
  if (!userId) {
    return false;
  }

  // Personal snippet: check if user is the owner
  if (snippet.userId) {
    return snippet.userId === userId;
  }

  // Org snippet: check if user is a member of the org
  if (snippet.orgId) {
    const membership = await getOrgMembership(ctx, snippet.orgId, userId);
    return membership !== null;
  }

  return false;
}

/**
 * Check if a user can edit a snippet
 *
 * Edit permission is granted if:
 * - Personal snippet: user is the owner
 * - Org snippet: user is admin or owner of the org
 */
export async function canEditSnippet(
  ctx: QueryCtx,
  snippet: Doc<"snippets">,
  userId: Id<"users">,
): Promise<boolean> {
  // Personal snippet: must be the owner
  if (snippet.userId) {
    return snippet.userId === userId;
  }

  // Org snippet: must be admin or owner
  if (snippet.orgId) {
    const membership = await getOrgMembership(ctx, snippet.orgId, userId);
    if (!membership) {
      return false;
    }
    return membership.role === "owner" || membership.role === "admin";
  }

  return false;
}

/**
 * Check if a user can publish a snippet (change visibility)
 * Same rules as editing
 */
export async function canPublishSnippet(
  ctx: QueryCtx,
  snippet: Doc<"snippets">,
  userId: Id<"users">,
): Promise<boolean> {
  return canEditSnippet(ctx, snippet, userId);
}

/**
 * Check if a user can access a command (view it).
 * Mirrors canAccessSnippet — public, owner, or org member.
 */
export async function canAccessCommand(
  ctx: QueryCtx,
  command: Doc<"commands">,
  userId: Id<"users"> | null,
): Promise<boolean> {
  if (command.isPublic) return true;
  if (!userId) return false;

  if (command.userId) return command.userId === userId;

  if (command.orgId) {
    const membership = await getOrgMembership(ctx, command.orgId, userId);
    return membership !== null;
  }

  return false;
}

/**
 * Check if a user can edit a command.
 * Personal: owner only. Org: admin or owner.
 */
export async function canEditCommand(
  ctx: QueryCtx,
  command: Doc<"commands">,
  userId: Id<"users">,
): Promise<boolean> {
  if (command.userId) return command.userId === userId;

  if (command.orgId) {
    const membership = await getOrgMembership(ctx, command.orgId, userId);
    if (!membership) return false;
    return membership.role === "owner" || membership.role === "admin";
  }

  return false;
}

/**
 * Check if a user can transfer a snippet to an organization
 *
 * Transfer is allowed if:
 * - User is the owner of the personal snippet
 * - User is a member of the target organization
 * - No snippet with the same name exists in the target org
 */
export async function canTransferSnippet(
  ctx: QueryCtx,
  snippet: Doc<"snippets">,
  userId: Id<"users">,
  targetOrgId: Id<"organizations">,
): Promise<{ allowed: boolean; reason?: string }> {
  // Snippet must be personal and owned by the user
  if (!snippet.userId || snippet.userId !== userId) {
    return {
      allowed: false,
      reason: "Only the owner can transfer a snippet",
    };
  }

  // User must be a member of the target org
  const membership = await getOrgMembership(ctx, targetOrgId, userId);
  if (!membership) {
    return {
      allowed: false,
      reason: "You must be a member of the target organization",
    };
  }

  // Check for name conflict in target org
  const existingSnippet = await ctx.db
    .query("snippets")
    .withIndex("by_orgId_name", (q) =>
      q.eq("orgId", targetOrgId).eq("name", snippet.name),
    )
    .unique();

  if (existingSnippet) {
    return {
      allowed: false,
      reason: "A snippet with this name already exists in the organization",
    };
  }

  return { allowed: true };
}
