import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { componentFilesValidator } from "./validators";
import { authComponent } from "./auth";
import {
  canAccessComponent,
  canEditComponent,
  canTransferComponent,
} from "./lib/permissions";
import { resolveNamespace } from "./lib/namespace";

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
 * Get all components for the current user (personal + org components).
 */
export const getMyComponents = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    // Get personal components
    const personalComponents = await ctx.db
      .query("components")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    // Get orgs the user is a member of
    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const orgIds = memberships.map((m) => m.orgId);

    // Get org components
    const orgComponents = await Promise.all(
      orgIds.map((orgId) =>
        ctx.db
          .query("components")
          .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
          .collect()
      )
    );

    // Combine and sort by updatedAt desc
    const allComponents = [...personalComponents, ...orgComponents.flat()];
    allComponents.sort((a, b) => b.updatedAt - a.updatedAt);

    return allComponents;
  },
});

/**
 * Create a new component.
 * If orgId is provided, creates an org component; otherwise creates a personal component.
 */
export const create = mutation({
  args: {
    name: v.string(),
    title: v.string(),
    description: v.string(),
    files: componentFilesValidator,
    dependencies: v.array(v.string()),
    registryDependencies: v.array(v.string()),
    orgId: v.optional(v.id("organizations")),
    isPublic: v.boolean(),
    // Preview settings
    previewEnabled: v.optional(v.boolean()),
    previewMediaUrl: v.optional(v.string()),
    previewMediaType: v.optional(
      v.union(v.literal("image"), v.literal("video"))
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
          q.eq("orgId", args.orgId!).eq("userId", user._id)
        )
        .unique();

      if (!membership) {
        throw new ConvexError("You are not a member of this organization");
      }

      // Check for name conflict in org
      const existingComponent = await ctx.db
        .query("components")
        .withIndex("by_orgId_name", (q) =>
          q.eq("orgId", args.orgId!).eq("name", args.name)
        )
        .unique();

      if (existingComponent) {
        throw new ConvexError(
          "A component with this name already exists in the organization"
        );
      }

      return await ctx.db.insert("components", {
        name: args.name,
        title: args.title,
        description: args.description,
        files: args.files,
        dependencies: args.dependencies,
        registryDependencies: args.registryDependencies,
        orgId: args.orgId,
        createdBy: user._id,
        isPublic: args.isPublic,
        downloads: 0,
        createdAt: now,
        updatedAt: now,
        previewEnabled: args.previewEnabled,
        previewMediaUrl: args.previewMediaUrl,
        previewMediaType: args.previewMediaType,
      });
    }

    // Personal component
    // Check for name conflict in user's personal components
    const existingComponent = await ctx.db
      .query("components")
      .withIndex("by_userId_name", (q) =>
        q.eq("userId", user._id).eq("name", args.name)
      )
      .unique();

    if (existingComponent) {
      throw new ConvexError("You already have a component with this name");
    }

    return await ctx.db.insert("components", {
      name: args.name,
      title: args.title,
      description: args.description,
      files: args.files,
      dependencies: args.dependencies,
      registryDependencies: args.registryDependencies,
      userId: user._id,
      createdBy: user._id,
      isPublic: args.isPublic,
      downloads: 0,
      createdAt: now,
      updatedAt: now,
      previewEnabled: args.previewEnabled,
      previewMediaUrl: args.previewMediaUrl,
      previewMediaType: args.previewMediaType,
    });
  },
});

/**
 * Get a component by ID.
 * Checks access permissions.
 */
export const get = query({
  args: { id: v.id("components") },
  handler: async (ctx, args) => {
    const component = await ctx.db.get(args.id);
    if (!component) {
      return null;
    }

    const user = await getCurrentUser(ctx);
    const hasAccess = await canAccessComponent(ctx, component, user?._id ?? null);

    if (!hasAccess) {
      return null;
    }

    return component;
  },
});


/**
 * Search components by title.
 * Only returns components the user has access to.
 */
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const results = await ctx.db
      .query("components")
      .withSearchIndex("search_components", (q) => q.search("title", args.query))
      .collect();

    // Filter by access permissions
    const accessibleComponents = await Promise.all(
      results.map(async (component) => {
        const hasAccess = await canAccessComponent(
          ctx,
          component,
          user?._id ?? null
        );
        return hasAccess ? component : null;
      })
    );

    return accessibleComponents.filter(Boolean);
  },
});

/**
 * Update a component.
 * Requires edit permission.
 */
export const update = mutation({
  args: {
    id: v.id("components"),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    files: v.optional(componentFilesValidator),
    dependencies: v.optional(v.array(v.string())),
    registryDependencies: v.optional(v.array(v.string())),
    isPublic: v.optional(v.boolean()),
    // Preview settings
    previewEnabled: v.optional(v.boolean()),
    previewMediaUrl: v.optional(v.string()),
    previewMediaType: v.optional(
      v.union(v.literal("image"), v.literal("video"))
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const component = await ctx.db.get(args.id);
    if (!component) {
      throw new ConvexError("Component not found");
    }

    const hasPermission = await canEditComponent(ctx, component, user._id);
    if (!hasPermission) {
      throw new ConvexError("You don't have permission to edit this component");
    }

    // Check name conflict if name is being updated
    if (args.name && args.name !== component.name) {
      if (component.userId) {
        // Personal component - check user's components
        const existingComponent = await ctx.db
          .query("components")
          .withIndex("by_userId_name", (q) =>
            q.eq("userId", component.userId!).eq("name", args.name!)
          )
          .unique();

        if (existingComponent && existingComponent._id !== component._id) {
          throw new ConvexError("You already have a component with this name");
        }
      } else if (component.orgId) {
        // Org component - check org's components
        const existingComponent = await ctx.db
          .query("components")
          .withIndex("by_orgId_name", (q) =>
            q.eq("orgId", component.orgId!).eq("name", args.name!)
          )
          .unique();

        if (existingComponent && existingComponent._id !== component._id) {
          throw new ConvexError(
            "A component with this name already exists in the organization"
          );
        }
      }
    }

    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    await ctx.db.patch(id, { ...filtered, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

/**
 * Delete a component.
 * Requires edit permission.
 */
export const remove = mutation({
  args: { id: v.id("components") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const component = await ctx.db.get(args.id);
    if (!component) {
      throw new ConvexError("Component not found");
    }

    const hasPermission = await canEditComponent(ctx, component, user._id);
    if (!hasPermission) {
      throw new ConvexError(
        "You don't have permission to delete this component"
      );
    }

    await ctx.db.delete(args.id);
  },
});

/**
 * Transfer a personal component to an organization.
 */
export const transfer = mutation({
  args: {
    id: v.id("components"),
    targetOrgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const component = await ctx.db.get(args.id);
    if (!component) {
      throw new ConvexError("Component not found");
    }

    const { allowed, reason } = await canTransferComponent(
      ctx,
      component,
      user._id,
      args.targetOrgId
    );

    if (!allowed) {
      throw new ConvexError(reason ?? "Transfer not allowed");
    }

    // Transfer the component: remove userId, add orgId
    await ctx.db.patch(args.id, {
      userId: undefined,
      orgId: args.targetOrgId,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Get components filtered by context (personal or org).
 * If context is "personal", returns only personal components.
 * If context is an org ID, returns only that org's components.
 * If no context, returns all components (personal + orgs).
 */
export const getMyComponentsFiltered = query({
  args: {
    context: v.optional(v.union(v.literal("personal"), v.id("organizations"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    // If context is "personal", only return personal components
    if (args.context === "personal") {
      const personalComponents = await ctx.db
        .query("components")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();
      return personalComponents.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    // If context is an org ID, only return that org's components
    if (args.context) {
      // Verify user is a member of this org
      const membership = await ctx.db
        .query("orgMembers")
        .withIndex("by_orgId_userId", (q) =>
          q.eq("orgId", args.context as Id<"organizations">).eq("userId", user._id)
        )
        .unique();

      if (!membership) {
        return [];
      }

      const orgComponents = await ctx.db
        .query("components")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.context as Id<"organizations">))
        .collect();
      return orgComponents.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    // No context specified - return all components (personal + orgs)
    const personalComponents = await ctx.db
      .query("components")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const orgIds = memberships.map((m) => m.orgId);

    const orgComponents = await Promise.all(
      orgIds.map((orgId) =>
        ctx.db
          .query("components")
          .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
          .collect()
      )
    );

    const allComponents = [...personalComponents, ...orgComponents.flat()];
    return allComponents.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/**
 * Paginated version of getMyComponentsFiltered.
 * Returns components with cursor-based pagination.
 */
export const getMyComponentsPaginated = query({
  args: {
    context: v.union(v.literal("personal"), v.id("organizations")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    // Personal components
    if (args.context === "personal") {
      return await ctx.db
        .query("components")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    // Org components - verify membership first
    const membership = await ctx.db
      .query("orgMembers")
      .withIndex("by_orgId_userId", (q) =>
        q.eq("orgId", args.context as Id<"organizations">).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    return await ctx.db
      .query("components")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.context as Id<"organizations">))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Get public components for a specific user.
 * Used on public profile pages.
 */
export const getPublicByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const components = await ctx.db
      .query("components")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter to only public components and sort by updatedAt desc
    return components
      .filter((c) => c.isPublic)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/**
 * Get a public component by namespace and name.
 * Used on component detail pages.
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

    let component = null;

    if (owner.type === "user") {
      component = await ctx.db
        .query("components")
        .withIndex("by_userId_name", (q) =>
          q.eq("userId", owner.user._id).eq("name", args.name)
        )
        .unique();
    } else {
      component = await ctx.db
        .query("components")
        .withIndex("by_orgId_name", (q) =>
          q.eq("orgId", owner.org._id).eq("name", args.name)
        )
        .unique();
    }

    // Only return public components
    if (!component || !component.isPublic) {
      return null;
    }

    return component;
  },
});
