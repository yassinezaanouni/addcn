import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";
import { authComponent } from "./auth";

/**
 * SHA-256 fingerprint of a bearer token. Convex's V8 isolate exposes
 * SubtleCrypto, so we get a real cryptographic hash — meaningful at-rest
 * protection if the DB ever leaks. Async, so callers must await.
 */
export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

const TOKEN_PREFIX = "addcn_ext_";

/**
 * Generate a high-entropy token using crypto.getRandomValues — available
 * in Convex's runtime. Format: addcn_ext_<32 url-safe chars>.
 */
function generateTokenString(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let body = "";
  for (const b of bytes) {
    body += chars[b % chars.length];
  }
  return TOKEN_PREFIX + body;
}

async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) return null;
  return ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", authUser._id))
    .unique();
}

async function requireCurrentUser(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new ConvexError("Not authenticated");
  return user;
}

/**
 * List the current user's extension tokens (excluding revoked ones).
 * Plaintext tokens are NOT returned here.
 */
export const listMyTokens = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const all = await ctx.db
      .query("extensionTokens")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    return all
      .filter((t) => !t.revokedAt)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((t) => ({
        _id: t._id,
        name: t.name,
        prefix: t.prefix,
        createdAt: t.createdAt,
        lastUsedAt: t.lastUsedAt,
      }));
  },
});

/**
 * Generate a new token. Returns the plaintext value once — the client must
 * surface it immediately because it cannot be retrieved later.
 */
export const generateToken = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const trimmed = args.name.trim();
    if (trimmed.length === 0 || trimmed.length > 60) {
      throw new ConvexError("Token name must be 1-60 characters");
    }
    const token = generateTokenString();
    await ctx.db.insert("extensionTokens", {
      userId: user._id,
      name: trimmed,
      tokenHash: await hashToken(token),
      prefix: token.slice(0, 12),
      createdAt: Date.now(),
    });
    return { token };
  },
});

/**
 * Revoke a token (soft-delete via revokedAt). Subsequent lookups by hash
 * will reject with "revoked".
 */
export const revokeToken = mutation({
  args: { id: v.id("extensionTokens") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError("Token not found");
    if (row.userId !== user._id) {
      throw new ConvexError("Not your token");
    }
    await ctx.db.patch(args.id, { revokedAt: Date.now() });
  },
});

/**
 * Internal: validate a token, return the owning user, and stamp lastUsedAt.
 * Called by the REST API shim on every request.
 *
 * Cannot be a query — we want to update lastUsedAt — so it's an
 * internalMutation. Routes call this via runMutation.
 */
export const validateAndTouch = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!args.token.startsWith(TOKEN_PREFIX)) return null;
    const hash = await hashToken(args.token);
    const row = await ctx.db
      .query("extensionTokens")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", hash))
      .unique();
    if (!row) return null;
    if (row.revokedAt) return null;
    const user = await ctx.db.get(row.userId);
    if (!user) return null;
    await ctx.db.patch(row._id, { lastUsedAt: Date.now() });
    return {
      userId: user._id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
    };
  },
});

/**
 * Internal: distinct tag set for a user across snippets or commands.
 * Powers the extension's tag autocomplete.
 */
export const listTagsForUser = internalQuery({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("snippet"), v.literal("command")),
  },
  handler: async (ctx, args) => {
    if (args.type === "snippet") {
      const personal = await ctx.db
        .query("snippets")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect();
      const memberships = await ctx.db
        .query("orgMembers")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect();
      const orgs = await Promise.all(
        memberships.map((m) =>
          ctx.db
            .query("snippets")
            .withIndex("by_orgId", (q) => q.eq("orgId", m.orgId))
            .collect(),
        ),
      );
      return Array.from(
        new Set([...personal, ...orgs.flat()].flatMap((s) => s.tags ?? [])),
      ).sort();
    }
    const personal = await ctx.db
      .query("commands")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    const orgs = await Promise.all(
      memberships.map((m) =>
        ctx.db
          .query("commands")
          .withIndex("by_orgId", (q) => q.eq("orgId", m.orgId))
          .collect(),
      ),
    );
    return Array.from(
      new Set([...personal, ...orgs.flat()].flatMap((c) => c.tags ?? [])),
    ).sort();
  },
});

/**
 * Internal read-only variant — used in places where we already validated
 * once via the mutation and don't want to re-touch lastUsedAt.
 */
export const validate = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!args.token.startsWith(TOKEN_PREFIX)) return null;
    const hash = await hashToken(args.token);
    const row = await ctx.db
      .query("extensionTokens")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", hash))
      .unique();
    if (!row || row.revokedAt) return null;
    const user = await ctx.db.get(row.userId);
    if (!user) return null;
    return {
      userId: user._id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
    };
  },
});
