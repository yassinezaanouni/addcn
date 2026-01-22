import { ConvexError, v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { authComponent } from "./auth";

/**
 * Get current user from auth and our users table.
 */
async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", authUser._id))
    .unique();

  return user;
}

/**
 * Get current user, throwing if not authenticated.
 */
async function requireCurrentUser(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new ConvexError("Not authenticated");
  }
  return user;
}

// Create a new sandbox record (actual CodeSandbox creation happens via API route)
export const create = mutation({
  args: {
    codesandboxId: v.string(),
    name: v.optional(v.string()),
    componentId: v.optional(v.id("components")),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const sandboxId = await ctx.db.insert("sandboxes", {
      userId: user._id,
      codesandboxId: args.codesandboxId,
      name: args.name ?? "Untitled Sandbox",
      componentId: args.componentId,
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return sandboxId;
  },
});

// Get a sandbox by its short ID
export const getByShortId = query({
  args: {
    shortId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }

    // Find sandbox by codesandboxId (short ID is derived from this)
    const sandboxes = await ctx.db
      .query("sandboxes")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    // Find the one that matches the short ID
    const sandbox = sandboxes.find((s) => {
      // Convert UUID to short ID and compare
      const shortIdFromUuid = s.codesandboxId?.replace(/-/g, "").slice(0, 8);
      return shortIdFromUuid === args.shortId || s.codesandboxId === args.shortId;
    });

    return sandbox ?? null;
  },
});

// Get a sandbox by Convex ID
export const get = query({
  args: {
    id: v.id("sandboxes"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }

    const sandbox = await ctx.db.get(args.id);
    if (!sandbox || sandbox.userId !== user._id) {
      return null;
    }

    return sandbox;
  },
});

// Get sandbox by CodeSandbox ID
export const getByCodesandboxId = query({
  args: {
    codesandboxId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }

    const sandbox = await ctx.db
      .query("sandboxes")
      .filter((q) =>
        q.and(
          q.eq(q.field("codesandboxId"), args.codesandboxId),
          q.eq(q.field("userId"), user._id)
        )
      )
      .first();

    return sandbox;
  },
});

// List all sandboxes for the current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const sandboxes = await ctx.db
      .query("sandboxes")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .collect();

    return sandboxes;
  },
});

// Update sandbox metadata
export const update = mutation({
  args: {
    id: v.id("sandboxes"),
    name: v.optional(v.string()),
    status: v.optional(v.string()),
    componentId: v.optional(v.id("components")),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const sandbox = await ctx.db.get(args.id);
    if (!sandbox || sandbox.userId !== user._id) {
      throw new ConvexError("Sandbox not found or unauthorized");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.status !== undefined) updates.status = args.status;
    if (args.componentId !== undefined) updates.componentId = args.componentId;

    await ctx.db.patch(args.id, updates);

    return { success: true };
  },
});

// Delete a sandbox
export const remove = mutation({
  args: {
    id: v.id("sandboxes"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const sandbox = await ctx.db.get(args.id);
    if (!sandbox || sandbox.userId !== user._id) {
      throw new ConvexError("Sandbox not found or unauthorized");
    }

    await ctx.db.delete(args.id);

    return { success: true };
  },
});

// Update sandbox status to "on_review" (publish)
export const publish = mutation({
  args: {
    id: v.id("sandboxes"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const sandbox = await ctx.db.get(args.id);
    if (!sandbox || sandbox.userId !== user._id) {
      throw new ConvexError("Sandbox not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      status: "on_review",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
