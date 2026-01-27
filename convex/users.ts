import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import { internalQuery, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { isValidUsername } from "./lib/validation";

/**
 * Get the current authenticated user from our users table.
 * Returns null if user is not authenticated or has no profile yet.
 */
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    // Look up our user by the Better Auth user ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", authUser._id))
      .unique();

    return user;
  },
});

/**
 * Update the current user's profile (username, avatarUrl).
 */
export const updateMe = mutation({
  args: {
    username: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", authUser._id))
      .unique();

    if (!user) {
      throw new ConvexError("User profile not found");
    }

    const updates: { username?: string; avatarUrl?: string } = {};

    if (args.username !== undefined) {
      // Validate username format
      if (!isValidUsername(args.username)) {
        throw new ConvexError(
          "Invalid username. Must be 3-39 characters, lowercase alphanumeric and hyphens only, no consecutive hyphens.",
        );
      }

      // Check if username is already taken (by another user)
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", args.username!))
        .unique();

      if (existingUser && existingUser._id !== user._id) {
        throw new ConvexError("Username is already taken");
      }

      // Check if username conflicts with an org slug
      const existingOrg = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", args.username!))
        .unique();

      if (existingOrg) {
        throw new ConvexError(
          "Username conflicts with an existing organization",
        );
      }

      updates.username = args.username;
    }

    if (args.avatarUrl !== undefined) {
      updates.avatarUrl = args.avatarUrl;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(user._id, updates);
    }

    return ctx.db.get(user._id);
  },
});

/**
 * Set username for a new user (used during onboarding).
 * Creates a user profile if it doesn't exist.
 */
export const setUsername = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);

    // Validate username format
    if (!isValidUsername(args.username)) {
      throw new ConvexError(
        "Invalid username. Must be 3-39 characters, lowercase alphanumeric and hyphens only, no consecutive hyphens.",
      );
    }

    // Check if username is already taken
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (existingUser) {
      throw new ConvexError("Username is already taken");
    }

    // Check if username conflicts with an org slug
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.username))
      .unique();

    if (existingOrg) {
      throw new ConvexError("Username conflicts with an existing organization");
    }

    // Check if user already has a profile
    const existingProfile = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", authUser._id))
      .unique();

    if (existingProfile) {
      // Update existing profile with new username
      await ctx.db.patch(existingProfile._id, { username: args.username });
      return ctx.db.get(existingProfile._id);
    }

    // Create new user profile
    const userId = await ctx.db.insert("users", {
      username: args.username,
      email: authUser.email,
      avatarUrl: authUser.image ?? undefined,
      externalId: authUser._id,
      createdAt: Date.now(),
    });

    return ctx.db.get(userId);
  },
});

/**
 * Get a user's public profile by username.
 * Returns only public information.
 */
export const getByUsername = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (!user) {
      return null;
    }

    // Return only public profile information
    return {
      _id: user._id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  },
});

/**
 * Validate a session ID and return the user ID.
 * Used by HTTP action for authenticated registry access.
 *
 * Security model:
 * - Session IDs are cryptographically random and unguessable
 * - Sessions are managed by Better Auth (expiration, revocation on logout)
 * - Only users with valid sessions can access private registry components
 */
export const validateAuthToken = internalQuery({
  args: {
    token: v.string(), // This is actually the session ID
  },
  handler: async (ctx, args) => {
    try {
      const sessionId = args.token;

      if (!sessionId || sessionId.length < 10) {
        return null;
      }

      // Validate session exists and is not expired
      const session = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "session",
          where: [{ field: "_id", operator: "eq", value: sessionId }],
        },
      );

      if (!session) {
        return null;
      }

      // Check if session is expired
      if (session.expiresAt && session.expiresAt < Date.now()) {
        return null;
      }

      // Get the Better Auth user ID from the session
      const authUserId = session.userId;
      if (!authUserId) {
        return null;
      }

      // Look up our user by Better Auth user ID (stored as externalId)
      const user = await ctx.db
        .query("users")
        .withIndex("by_externalId", (q) => q.eq("externalId", authUserId))
        .unique();

      if (!user) {
        return null;
      }

      return user._id;
    } catch {
      return null;
    }
  },
});
