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

/**
 * Get all members of an organization.
 * Returns members with their user details.
 */
export const getMembers = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Check if org exists
    const org = await ctx.db.get(args.orgId);
    if (!org) {
      throw new ConvexError("Organization not found");
    }

    // Get all members for this org
    const members = await ctx.db
      .query("orgMembers")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Fetch user details for each member
    const membersWithUser = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        if (!user) {
          return null;
        }
        return {
          _id: member._id,
          role: member.role,
          joinedAt: member.joinedAt,
          invitedBy: member.invitedBy,
          user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl,
          },
        };
      })
    );

    // Filter out any null values (deleted users)
    return membersWithUser.filter((m) => m !== null);
  },
});

/**
 * Helper to get the current user's membership in an org.
 */
async function getMembership(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<"organizations">,
  userId: Id<"users">
) {
  return ctx.db
    .query("orgMembers")
    .withIndex("by_orgId_userId", (q) => q.eq("orgId", orgId).eq("userId", userId))
    .unique();
}

/**
 * Add a new member to an organization.
 * Only admins and owners can add members.
 */
export const addMember = mutation({
  args: {
    orgId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx);

    // Check if org exists
    const org = await ctx.db.get(args.orgId);
    if (!org) {
      throw new ConvexError("Organization not found");
    }

    // Check if current user is admin or owner
    const currentMembership = await getMembership(ctx, args.orgId, currentUser._id);
    if (!currentMembership || currentMembership.role === "member") {
      throw new ConvexError("Only admins and owners can add members");
    }

    // Check if target user exists
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new ConvexError("User not found");
    }

    // Check if user is already a member
    const existingMembership = await getMembership(ctx, args.orgId, args.userId);
    if (existingMembership) {
      throw new ConvexError("User is already a member of this organization");
    }

    // Add the member
    await ctx.db.insert("orgMembers", {
      orgId: args.orgId,
      userId: args.userId,
      role: args.role,
      invitedBy: currentUser._id,
      joinedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Remove a member from an organization.
 * Only admins and owners can remove members.
 * Cannot remove the last owner.
 */
export const removeMember = mutation({
  args: {
    orgId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx);

    // Check if org exists
    const org = await ctx.db.get(args.orgId);
    if (!org) {
      throw new ConvexError("Organization not found");
    }

    // Check if current user is admin or owner
    const currentMembership = await getMembership(ctx, args.orgId, currentUser._id);
    if (!currentMembership || currentMembership.role === "member") {
      throw new ConvexError("Only admins and owners can remove members");
    }

    // Check if target user is a member
    const targetMembership = await getMembership(ctx, args.orgId, args.userId);
    if (!targetMembership) {
      throw new ConvexError("User is not a member of this organization");
    }

    // If removing an owner, check if they are the last owner
    if (targetMembership.role === "owner") {
      // Only owners can remove owners
      if (currentMembership.role !== "owner") {
        throw new ConvexError("Only owners can remove other owners");
      }

      // Check if this is the last owner
      const allMembers = await ctx.db
        .query("orgMembers")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect();

      const ownerCount = allMembers.filter((m) => m.role === "owner").length;
      if (ownerCount <= 1) {
        throw new ConvexError("Cannot remove the last owner of an organization");
      }
    }

    // Admins cannot remove other admins (only owners can)
    if (targetMembership.role === "admin" && currentMembership.role !== "owner") {
      throw new ConvexError("Only owners can remove admins");
    }

    // Remove the member
    await ctx.db.delete(targetMembership._id);

    return { success: true };
  },
});

/**
 * Update a member's role in an organization.
 * Only owners can update roles.
 * Cannot change the role of the last owner.
 */
export const updateMemberRole = mutation({
  args: {
    orgId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx);

    // Check if org exists
    const org = await ctx.db.get(args.orgId);
    if (!org) {
      throw new ConvexError("Organization not found");
    }

    // Only owners can update roles
    const currentMembership = await getMembership(ctx, args.orgId, currentUser._id);
    if (!currentMembership || currentMembership.role !== "owner") {
      throw new ConvexError("Only owners can update member roles");
    }

    // Check if target user is a member
    const targetMembership = await getMembership(ctx, args.orgId, args.userId);
    if (!targetMembership) {
      throw new ConvexError("User is not a member of this organization");
    }

    // If demoting an owner, check if they are the last owner
    if (targetMembership.role === "owner" && args.role !== "owner") {
      const allMembers = await ctx.db
        .query("orgMembers")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect();

      const ownerCount = allMembers.filter((m) => m.role === "owner").length;
      if (ownerCount <= 1) {
        throw new ConvexError("Cannot demote the last owner of an organization");
      }
    }

    // Update the role
    await ctx.db.patch(targetMembership._id, { role: args.role });

    return { success: true };
  },
});
