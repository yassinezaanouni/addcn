import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { snippetFilesValidator } from "./validators";
import { authComponent } from "./auth";
import {
  canAccessSnippet,
  canEditSnippet,
  canTransferSnippet,
} from "./lib/permissions";
import { resolveNamespace } from "./lib/namespace";
import { r2Client } from "./r2";

/**
 * Get current user from auth and our users table.
 * Returns null if not authenticated or no profile exists.
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

/**
 * Get all snippets for the current user (personal + org snippets).
 */
export const getMySnippets = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    // Get personal snippets
    const personalSnippets = await ctx.db
      .query("snippets")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    // Get orgs the user is a member of
    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const orgIds = memberships.map((m) => m.orgId);

    // Get org snippets
    const orgSnippets = await Promise.all(
      orgIds.map((orgId) =>
        ctx.db
          .query("snippets")
          .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
          .collect(),
      ),
    );

    // Combine and sort by updatedAt desc
    const allSnippets = [...personalSnippets, ...orgSnippets.flat()];
    allSnippets.sort((a, b) => b.updatedAt - a.updatedAt);

    return allSnippets;
  },
});

/**
 * Create a new snippet.
 * If orgId is provided, creates an org snippet; otherwise creates a personal snippet.
 */
export const create = mutation({
  args: {
    name: v.string(),
    title: v.string(),
    description: v.string(),
    files: snippetFilesValidator,
    dependencies: v.array(v.string()),
    devDependencies: v.array(v.string()),
    registryDependencies: v.array(v.string()),
    orgId: v.optional(v.id("organizations")),
    isPublic: v.boolean(),
    // Preview media
    previewMediaUrl: v.optional(v.string()),
    previewMediaType: v.optional(
      v.union(v.literal("image"), v.literal("video")),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();

    // If orgId is provided, verify user is a member
    if (args.orgId) {
      const membership = await ctx.db
        .query("orgMembers")
        .withIndex("by_orgId_userId", (q) =>
          q.eq("orgId", args.orgId!).eq("userId", user._id),
        )
        .unique();

      if (!membership) {
        throw new ConvexError("You are not a member of this organization");
      }

      // Check for name conflict in org
      const existingSnippet = await ctx.db
        .query("snippets")
        .withIndex("by_orgId_name", (q) =>
          q.eq("orgId", args.orgId!).eq("name", args.name),
        )
        .unique();

      if (existingSnippet) {
        throw new ConvexError(
          "A snippet with this name already exists in the organization",
        );
      }

      return await ctx.db.insert("snippets", {
        name: args.name,
        title: args.title,
        description: args.description,
        files: args.files,
        dependencies: args.dependencies,
        devDependencies: args.devDependencies,
        registryDependencies: args.registryDependencies,
        orgId: args.orgId,
        createdBy: user._id,
        isPublic: args.isPublic,
        downloads: 0,
        createdAt: now,
        updatedAt: now,
        previewMediaUrl: args.previewMediaUrl,
        previewMediaType: args.previewMediaType,
        searchText: `${args.name} ${args.title} ${args.description}`,
      });
    }

    // Personal snippet
    // Check for name conflict in user's personal snippets
    const existingSnippet = await ctx.db
      .query("snippets")
      .withIndex("by_userId_name", (q) =>
        q.eq("userId", user._id).eq("name", args.name),
      )
      .unique();

    if (existingSnippet) {
      throw new ConvexError("You already have a snippet with this name");
    }

    return await ctx.db.insert("snippets", {
      name: args.name,
      title: args.title,
      description: args.description,
      files: args.files,
      dependencies: args.dependencies,
      devDependencies: args.devDependencies,
      registryDependencies: args.registryDependencies,
      userId: user._id,
      createdBy: user._id,
      isPublic: args.isPublic,
      downloads: 0,
      createdAt: now,
      updatedAt: now,
      previewMediaUrl: args.previewMediaUrl,
      previewMediaType: args.previewMediaType,
      searchText: `${args.name} ${args.title} ${args.description}`,
    });
  },
});

/**
 * Get a snippet by ID.
 * Checks access permissions.
 */
export const get = query({
  args: { id: v.id("snippets") },
  handler: async (ctx, args) => {
    const snippet = await ctx.db.get(args.id);
    if (!snippet) {
      return null;
    }

    const user = await getCurrentUser(ctx);
    const hasAccess = await canAccessSnippet(
      ctx,
      snippet,
      user?._id ?? null,
    );

    if (!hasAccess) {
      return null;
    }

    return snippet;
  },
});

/**
 * Search snippets by name, title, and description.
 * Only returns snippets the user has access to.
 */
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const results = await ctx.db
      .query("snippets")
      .withSearchIndex("search_snippets", (q) =>
        q.search("searchText", args.query),
      )
      .collect();

    // Filter by access permissions
    const accessibleSnippets = await Promise.all(
      results.map(async (snippet) => {
        const hasAccess = await canAccessSnippet(
          ctx,
          snippet,
          user?._id ?? null,
        );
        return hasAccess ? snippet : null;
      }),
    );

    return accessibleSnippets.filter(Boolean);
  },
});

/**
 * Update a snippet.
 * Requires edit permission.
 */
export const update = mutation({
  args: {
    id: v.id("snippets"),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    files: v.optional(snippetFilesValidator),
    dependencies: v.optional(v.array(v.string())),
    devDependencies: v.optional(v.array(v.string())),
    registryDependencies: v.optional(v.array(v.string())),
    isPublic: v.optional(v.boolean()),
    // Preview media
    previewMediaUrl: v.optional(v.string()),
    previewMediaType: v.optional(
      v.union(v.literal("image"), v.literal("video")),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const snippet = await ctx.db.get(args.id);
    if (!snippet) {
      throw new ConvexError("Snippet not found");
    }

    const hasPermission = await canEditSnippet(ctx, snippet, user._id);
    if (!hasPermission) {
      throw new ConvexError("You don't have permission to edit this snippet");
    }

    // Check name conflict if name is being updated
    if (args.name && args.name !== snippet.name) {
      if (snippet.userId) {
        // Personal snippet - check user's snippets
        const existingSnippet = await ctx.db
          .query("snippets")
          .withIndex("by_userId_name", (q) =>
            q.eq("userId", snippet.userId!).eq("name", args.name!),
          )
          .unique();

        if (existingSnippet && existingSnippet._id !== snippet._id) {
          throw new ConvexError("You already have a snippet with this name");
        }
      } else if (snippet.orgId) {
        // Org snippet - check org's snippets
        const existingSnippet = await ctx.db
          .query("snippets")
          .withIndex("by_orgId_name", (q) =>
            q.eq("orgId", snippet.orgId!).eq("name", args.name!),
          )
          .unique();

        if (existingSnippet && existingSnippet._id !== snippet._id) {
          throw new ConvexError(
            "A snippet with this name already exists in the organization",
          );
        }
      }
    }

    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );

    // Update searchText if name, title, or description changed
    const newName = args.name ?? snippet.name;
    const newTitle = args.title ?? snippet.title;
    const newDescription = args.description ?? snippet.description;
    const searchText = `${newName} ${newTitle} ${newDescription}`;

    await ctx.db.patch(id, { ...filtered, searchText, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

/**
 * Extract R2 key from a public URL.
 * URL format: https://domain.com/key
 */
function extractR2Key(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Remove leading slash from pathname
    return parsed.pathname.slice(1) || null;
  } catch {
    return null;
  }
}

/**
 * Delete a snippet.
 * Requires edit permission.
 * Also cleans up any associated R2 media.
 */
export const remove = mutation({
  args: { id: v.id("snippets") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const snippet = await ctx.db.get(args.id);
    if (!snippet) {
      throw new ConvexError("Snippet not found");
    }

    const hasPermission = await canEditSnippet(ctx, snippet, user._id);
    if (!hasPermission) {
      throw new ConvexError(
        "You don't have permission to delete this snippet",
      );
    }

    // Delete R2 media if it exists
    if (snippet.previewMediaUrl) {
      const key = extractR2Key(snippet.previewMediaUrl);
      if (key) {
        await r2Client.deleteObject(ctx, key);
      }
    }

    await ctx.db.delete(args.id);
  },
});

/**
 * Transfer a personal snippet to an organization.
 */
export const transfer = mutation({
  args: {
    id: v.id("snippets"),
    targetOrgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const snippet = await ctx.db.get(args.id);
    if (!snippet) {
      throw new ConvexError("Snippet not found");
    }

    const { allowed, reason } = await canTransferSnippet(
      ctx,
      snippet,
      user._id,
      args.targetOrgId,
    );

    if (!allowed) {
      throw new ConvexError(reason ?? "Transfer not allowed");
    }

    // Transfer the snippet: remove userId, add orgId
    await ctx.db.patch(args.id, {
      userId: undefined,
      orgId: args.targetOrgId,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Get snippets filtered by context (personal or org).
 * If context is "personal", returns only personal snippets.
 * If context is an org ID, returns only that org's snippets.
 * If no context, returns all snippets (personal + orgs).
 */
export const getMySnippetsFiltered = query({
  args: {
    context: v.optional(v.union(v.literal("personal"), v.id("organizations"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    // If context is "personal", only return personal snippets
    if (args.context === "personal") {
      const personalSnippets = await ctx.db
        .query("snippets")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();
      return personalSnippets.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    // If context is an org ID, only return that org's snippets
    if (args.context) {
      // Verify user is a member of this org
      const membership = await ctx.db
        .query("orgMembers")
        .withIndex("by_orgId_userId", (q) =>
          q
            .eq("orgId", args.context as Id<"organizations">)
            .eq("userId", user._id),
        )
        .unique();

      if (!membership) {
        return [];
      }

      const orgSnippets = await ctx.db
        .query("snippets")
        .withIndex("by_orgId", (q) =>
          q.eq("orgId", args.context as Id<"organizations">),
        )
        .collect();
      return orgSnippets.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    // No context specified - return all snippets (personal + orgs)
    const personalSnippets = await ctx.db
      .query("snippets")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const orgIds = memberships.map((m) => m.orgId);

    const orgSnippets = await Promise.all(
      orgIds.map((orgId) =>
        ctx.db
          .query("snippets")
          .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
          .collect(),
      ),
    );

    const allSnippets = [...personalSnippets, ...orgSnippets.flat()];
    return allSnippets.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/**
 * Paginated version of getMySnippetsFiltered.
 * Returns snippets with cursor-based pagination.
 */
export const getMySnippetsPaginated = query({
  args: {
    context: v.union(v.literal("personal"), v.id("organizations")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    // Personal snippets
    if (args.context === "personal") {
      return await ctx.db
        .query("snippets")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    // Org snippets - verify membership first
    const membership = await ctx.db
      .query("orgMembers")
      .withIndex("by_orgId_userId", (q) =>
        q
          .eq("orgId", args.context as Id<"organizations">)
          .eq("userId", user._id),
      )
      .unique();

    if (!membership) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    return await ctx.db
      .query("snippets")
      .withIndex("by_orgId", (q) =>
        q.eq("orgId", args.context as Id<"organizations">),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Get public snippets for a specific user.
 * Used on public profile pages.
 */
export const getPublicByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const snippets = await ctx.db
      .query("snippets")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter to only public snippets and sort by updatedAt desc
    return snippets
      .filter((s) => s.isPublic)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/**
 * Get a public snippet by namespace and name.
 * Used on snippet detail pages.
 * Returns null if not found or private.
 */
export const getByNamespaceAndName = query({
  args: {
    namespace: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = await resolveNamespace(ctx, args.namespace);

    if (!owner) {
      return null;
    }

    let snippet = null;

    if (owner.type === "user") {
      snippet = await ctx.db
        .query("snippets")
        .withIndex("by_userId_name", (q) =>
          q.eq("userId", owner.user._id).eq("name", args.name),
        )
        .unique();
    } else {
      snippet = await ctx.db
        .query("snippets")
        .withIndex("by_orgId_name", (q) =>
          q.eq("orgId", owner.org._id).eq("name", args.name),
        )
        .unique();
    }

    // Only return public snippets
    if (!snippet || !snippet.isPublic) {
      return null;
    }

    return snippet;
  },
});
