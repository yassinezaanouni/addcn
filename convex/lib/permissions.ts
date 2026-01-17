/**
 * Permission checking functions for component access
 */

import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";

type OrgMemberRole = "owner" | "admin" | "member";

/**
 * Get the user's membership in an organization
 */
async function getOrgMembership(
  ctx: QueryCtx,
  orgId: Id<"organizations">,
  userId: Id<"users">
): Promise<Doc<"orgMembers"> | null> {
  return await ctx.db
    .query("orgMembers")
    .withIndex("by_orgId_userId", (q) =>
      q.eq("orgId", orgId).eq("userId", userId)
    )
    .unique();
}

/**
 * Check if a user can access a component (view it)
 *
 * Access is granted if:
 * - Component is public, OR
 * - User is the owner (personal component), OR
 * - User is a member of the owning organization
 */
export async function canAccessComponent(
  ctx: QueryCtx,
  component: Doc<"components">,
  userId: Id<"users"> | null
): Promise<boolean> {
  // Public components are always accessible
  if (component.isPublic) {
    return true;
  }

  // Anonymous users can't access private components
  if (!userId) {
    return false;
  }

  // Personal component: check if user is the owner
  if (component.userId) {
    return component.userId === userId;
  }

  // Org component: check if user is a member of the org
  if (component.orgId) {
    const membership = await getOrgMembership(ctx, component.orgId, userId);
    return membership !== null;
  }

  return false;
}

/**
 * Check if a user can edit a component
 *
 * Edit permission is granted if:
 * - Personal component: user is the owner
 * - Org component: user is admin or owner of the org
 */
export async function canEditComponent(
  ctx: QueryCtx,
  component: Doc<"components">,
  userId: Id<"users">
): Promise<boolean> {
  // Personal component: must be the owner
  if (component.userId) {
    return component.userId === userId;
  }

  // Org component: must be admin or owner
  if (component.orgId) {
    const membership = await getOrgMembership(ctx, component.orgId, userId);
    if (!membership) {
      return false;
    }
    return membership.role === "owner" || membership.role === "admin";
  }

  return false;
}

/**
 * Check if a user can publish a component (change visibility)
 * Same rules as editing
 */
export async function canPublishComponent(
  ctx: QueryCtx,
  component: Doc<"components">,
  userId: Id<"users">
): Promise<boolean> {
  return canEditComponent(ctx, component, userId);
}

/**
 * Check if a user can transfer a component to an organization
 *
 * Transfer is allowed if:
 * - User is the owner of the personal component
 * - User is a member of the target organization
 * - No component with the same name exists in the target org
 */
export async function canTransferComponent(
  ctx: QueryCtx,
  component: Doc<"components">,
  userId: Id<"users">,
  targetOrgId: Id<"organizations">
): Promise<{ allowed: boolean; reason?: string }> {
  // Component must be personal and owned by the user
  if (!component.userId || component.userId !== userId) {
    return { allowed: false, reason: "Only the owner can transfer a component" };
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
  const existingComponent = await ctx.db
    .query("components")
    .withIndex("by_orgId_name", (q) =>
      q.eq("orgId", targetOrgId).eq("name", component.name)
    )
    .unique();

  if (existingComponent) {
    return {
      allowed: false,
      reason: "A component with this name already exists in the organization",
    };
  }

  return { allowed: true };
}
