import { ConvexError, v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { authComponent } from "./auth";
import { isValidOrgSlug } from "./lib/validation";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Helper to get the current user from auth.
 * Returns null if not authenticated.
 */
async function safeGetCurrentUser(ctx: QueryCtx | MutationCtx) {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) {
    return null;
  }

  return ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", authUser._id))
    .unique();
}

/**
 * Helper to require the current user.
 * Throws if not authenticated.
 */
async function requireCurrentUser(ctx: QueryCtx | MutationCtx) {
  const user = await safeGetCurrentUser(ctx);
  if (!user) {
    throw new ConvexError("Not authenticated");
  }
  return user;
}

/**
 * Get all organizations where the current user is a member.
 * Returns orgs with the user's role in each.
 */
export const getMyOrgs = query({
  args: {},
  handler: async (ctx) => {
    const user = await safeGetCurrentUser(ctx);
    if (!user) {
      return [];
    }

    // Get all memberships for this user
    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    // Fetch org details for each membership
    const orgsWithRole = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.orgId);
        if (!org) {
          return null;
        }
        return {
          ...org,
          role: membership.role,
        };
      })
    );

    // Filter out any null values (deleted orgs)
    return orgsWithRole.filter(
      (org): org is Doc<"organizations"> & { role: "owner" | "admin" | "member" } =>
        org !== null
    );
  },
});

/**
 * Create a new organization.
 * The creator becomes the owner.
 */
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    // Validate slug format
    if (!isValidOrgSlug(args.slug)) {
      throw new ConvexError(
        "Invalid slug. Must be 3-39 characters, lowercase alphanumeric and hyphens only, no consecutive hyphens."
      );
    }

    // Check if slug is already taken by another org
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existingOrg) {
      throw new ConvexError("Slug is already taken by another organization");
    }

    // Check if slug conflicts with a username
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.slug))
      .unique();

    if (existingUser) {
      throw new ConvexError("Slug conflicts with an existing username");
    }

    // Create the organization
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      avatarUrl: args.avatarUrl,
      createdAt: Date.now(),
    });

    // Add creator as owner
    await ctx.db.insert("orgMembers", {
      orgId,
      userId: user._id,
      role: "owner",
      joinedAt: Date.now(),
    });

    return ctx.db.get(orgId);
  },
});

/**
 * Get an organization by its slug.
 * Returns null if not found.
 */
export const getBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    return org;
  },
});

/**
 * Remove an organization.
 * Only the owner can delete an organization.
 */
export const remove = mutation({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    // Check if org exists
    const org = await ctx.db.get(args.orgId);
    if (!org) {
      throw new ConvexError("Organization not found");
    }

    // Check if user is owner
    const membership = await ctx.db
      .query("orgMembers")
      .withIndex("by_orgId_userId", (q) =>
        q.eq("orgId", args.orgId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role !== "owner") {
      throw new ConvexError("Only the owner can delete an organization");
    }

    // Delete all members
    const members = await ctx.db
      .query("orgMembers")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Delete all invites
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();

    for (const invite of invites) {
      await ctx.db.delete(invite._id);
    }

    // Delete the organization
    await ctx.db.delete(args.orgId);

    return { success: true };
  },
});
