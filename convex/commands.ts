import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  query,
  mutation,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { authComponent } from "./auth";
import { canAccessCommand, canEditCommand } from "./lib/permissions";

/**
 * Get current user from auth + our users table. Null if not authenticated
 * or no profile.
 */
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

const stepValidator = v.object({
  inlineCommand: v.optional(v.string()),
  refCommandId: v.optional(v.id("commands")),
  refSnippetId: v.optional(v.id("snippets")),
  operator: v.optional(
    v.union(
      v.literal("&&"),
      v.literal("||"),
      v.literal(";"),
      v.literal("|"),
      v.literal("\n"),
    ),
  ),
});

type Step = {
  inlineCommand?: string;
  refCommandId?: Id<"commands">;
  refSnippetId?: Id<"snippets">;
};

const MAX_STEPS = 20;
const MAX_INLINE_LENGTH = 500;

/**
 * Verify each step has exactly one source set, and inline length is reasonable.
 */
function validateStepShape(steps: Step[]) {
  if (steps.length === 0) {
    throw new ConvexError("A command must have at least one step");
  }
  if (steps.length > MAX_STEPS) {
    throw new ConvexError(`A command can have at most ${MAX_STEPS} steps`);
  }
  for (const [i, step] of steps.entries()) {
    const sources = [
      step.inlineCommand !== undefined,
      step.refCommandId !== undefined,
      step.refSnippetId !== undefined,
    ].filter(Boolean).length;

    if (sources !== 1) {
      throw new ConvexError(
        `Step ${i + 1} must have exactly one source (inline, command, or snippet)`,
      );
    }
    if (
      step.inlineCommand !== undefined &&
      step.inlineCommand.length > MAX_INLINE_LENGTH
    ) {
      throw new ConvexError(
        `Step ${i + 1} command is too long (max ${MAX_INLINE_LENGTH} chars)`,
      );
    }
    if (
      step.inlineCommand !== undefined &&
      step.inlineCommand.trim() === ""
    ) {
      throw new ConvexError(`Step ${i + 1} command is empty`);
    }
  }
}

/**
 * Verify every refCommandId / refSnippetId resolves to something the user
 * can access, and detect command-reference cycles via DFS.
 *
 * `selfId` is the id of the command being saved (null when creating new),
 * passed so we reject self-reference cycles.
 */
async function validateRefsAndCycles(
  ctx: QueryCtx | MutationCtx,
  steps: Step[],
  userId: Id<"users">,
  selfId: Id<"commands"> | null,
) {
  const visited = new Set<string>();
  if (selfId) visited.add(selfId);

  // BFS through every reachable command via refCommandId.
  const stack: Step[] = [...steps];

  while (stack.length > 0) {
    const step = stack.pop()!;

    if (step.refSnippetId) {
      const snippet = await ctx.db.get(step.refSnippetId);
      if (!snippet) {
        throw new ConvexError("A referenced snippet no longer exists");
      }
      // Owner check — keep the model strict: you can only reference snippets
      // you own (personal) or co-own (via org membership).
      const ownsPersonal = snippet.userId && snippet.userId === userId;
      let ownsOrg = false;
      if (!ownsPersonal && snippet.orgId) {
        const membership = await ctx.db
          .query("orgMembers")
          .withIndex("by_orgId_userId", (q) =>
            q.eq("orgId", snippet.orgId!).eq("userId", userId),
          )
          .unique();
        ownsOrg = membership !== null;
      }
      if (!ownsPersonal && !ownsOrg) {
        throw new ConvexError(
          "You can only reference snippets you own or co-own",
        );
      }
    }

    if (step.refCommandId) {
      if (visited.has(step.refCommandId)) {
        throw new ConvexError("This would create a cycle of commands");
      }
      visited.add(step.refCommandId);

      const referenced = await ctx.db.get(step.refCommandId);
      if (!referenced) {
        throw new ConvexError("A referenced command no longer exists");
      }
      // Access check
      const hasAccess = await canAccessCommand(ctx, referenced, userId);
      if (!hasAccess) {
        throw new ConvexError(
          "You don't have access to a referenced command",
        );
      }
      stack.push(...referenced.steps);
    }
  }
}

/**
 * Get all commands the current user can see (personal + their orgs').
 * Sorted by updatedAt desc.
 */
export const getMyCommands = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const personal = await ctx.db
      .query("commands")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const orgCommands = await Promise.all(
      memberships.map((m) =>
        ctx.db
          .query("commands")
          .withIndex("by_orgId", (q) => q.eq("orgId", m.orgId))
          .collect(),
      ),
    );

    const all = [...personal, ...orgCommands.flat()];
    all.sort((a, b) => b.updatedAt - a.updatedAt);
    return all;
  },
});

/**
 * Filtered version: only personal, only one org, or all (default).
 */
export const getMyCommandsFiltered = query({
  args: {
    context: v.optional(v.union(v.literal("personal"), v.id("organizations"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    if (args.context === "personal") {
      const personal = await ctx.db
        .query("commands")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();
      return personal.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    if (args.context) {
      const membership = await ctx.db
        .query("orgMembers")
        .withIndex("by_orgId_userId", (q) =>
          q
            .eq("orgId", args.context as Id<"organizations">)
            .eq("userId", user._id),
        )
        .unique();
      if (!membership) return [];
      const orgCommands = await ctx.db
        .query("commands")
        .withIndex("by_orgId", (q) =>
          q.eq("orgId", args.context as Id<"organizations">),
        )
        .collect();
      return orgCommands.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    // No context — return everything the user can see.
    const personal = await ctx.db
      .query("commands")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    const orgs = await Promise.all(
      memberships.map((m) =>
        ctx.db
          .query("commands")
          .withIndex("by_orgId", (q) => q.eq("orgId", m.orgId))
          .collect(),
      ),
    );
    const all = [...personal, ...orgs.flat()];
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/**
 * Paginated version powering the list page's infinite scroll.
 */
export const getMyCommandsPaginated = query({
  args: {
    context: v.union(v.literal("personal"), v.id("organizations")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { page: [], isDone: true, continueCursor: "" };

    if (args.context === "personal") {
      return await ctx.db
        .query("commands")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .order("desc")
        .paginate(args.paginationOpts);
    }

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
      .query("commands")
      .withIndex("by_orgId", (q) =>
        q.eq("orgId", args.context as Id<"organizations">),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Get a single command by id, with access check.
 */
export const get = query({
  args: { id: v.id("commands") },
  handler: async (ctx, args) => {
    const command = await ctx.db.get(args.id);
    if (!command) return null;
    const user = await getCurrentUser(ctx);
    const hasAccess = await canAccessCommand(ctx, command, user?._id ?? null);
    return hasAccess ? command : null;
  },
});

/**
 * Search commands the current user can access.
 */
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const results = await ctx.db
      .query("commands")
      .withSearchIndex("search_commands", (q) =>
        q.search("searchText", args.query),
      )
      .collect();
    const accessible = await Promise.all(
      results.map(async (cmd) => {
        const hasAccess = await canAccessCommand(
          ctx,
          cmd,
          user?._id ?? null,
        );
        return hasAccess ? cmd : null;
      }),
    );
    return accessible.filter(Boolean);
  },
});

/**
 * Create a new command.
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    steps: v.array(stepValidator),
    tags: v.array(v.string()),
    orgId: v.optional(v.id("organizations")),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();

    validateStepShape(args.steps);
    await validateRefsAndCycles(ctx, args.steps, user._id, null);

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
      const conflict = await ctx.db
        .query("commands")
        .withIndex("by_orgId_name", (q) =>
          q.eq("orgId", args.orgId!).eq("name", args.name),
        )
        .unique();
      if (conflict) {
        throw new ConvexError(
          "A command with this name already exists in the organization",
        );
      }
      return await ctx.db.insert("commands", {
        name: args.name,
        description: args.description,
        steps: args.steps,
        tags: args.tags,
        orgId: args.orgId,
        createdBy: user._id,
        isPublic: args.isPublic,
        createdAt: now,
        updatedAt: now,
        searchText: `${args.name} ${args.description}`,
      });
    }

    const conflict = await ctx.db
      .query("commands")
      .withIndex("by_userId_name", (q) =>
        q.eq("userId", user._id).eq("name", args.name),
      )
      .unique();
    if (conflict) {
      throw new ConvexError("You already have a command with this name");
    }

    return await ctx.db.insert("commands", {
      name: args.name,
      description: args.description,
      steps: args.steps,
      tags: args.tags,
      userId: user._id,
      createdBy: user._id,
      isPublic: args.isPublic,
      createdAt: now,
      updatedAt: now,
      searchText: `${args.name} ${args.description}`,
    });
  },
});

/**
 * Update an existing command.
 */
export const update = mutation({
  args: {
    id: v.id("commands"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    steps: v.optional(v.array(stepValidator)),
    tags: v.optional(v.array(v.string())),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const command = await ctx.db.get(args.id);
    if (!command) throw new ConvexError("Command not found");

    const hasPermission = await canEditCommand(ctx, command, user._id);
    if (!hasPermission) {
      throw new ConvexError("You don't have permission to edit this command");
    }

    if (args.steps) {
      validateStepShape(args.steps);
      await validateRefsAndCycles(ctx, args.steps, user._id, args.id);
    }

    if (args.name && args.name !== command.name) {
      if (command.userId) {
        const conflict = await ctx.db
          .query("commands")
          .withIndex("by_userId_name", (q) =>
            q.eq("userId", command.userId!).eq("name", args.name!),
          )
          .unique();
        if (conflict && conflict._id !== command._id) {
          throw new ConvexError("You already have a command with this name");
        }
      } else if (command.orgId) {
        const conflict = await ctx.db
          .query("commands")
          .withIndex("by_orgId_name", (q) =>
            q.eq("orgId", command.orgId!).eq("name", args.name!),
          )
          .unique();
        if (conflict && conflict._id !== command._id) {
          throw new ConvexError(
            "A command with this name already exists in the organization",
          );
        }
      }
    }

    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );

    const newName = args.name ?? command.name;
    const newDescription = args.description ?? command.description;
    const searchText = `${newName} ${newDescription}`;

    await ctx.db.patch(id, { ...filtered, searchText, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

/**
 * Delete a command.
 */
export const remove = mutation({
  args: { id: v.id("commands") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const command = await ctx.db.get(args.id);
    if (!command) throw new ConvexError("Command not found");
    const hasPermission = await canEditCommand(ctx, command, user._id);
    if (!hasPermission) {
      throw new ConvexError(
        "You don't have permission to delete this command",
      );
    }
    await ctx.db.delete(args.id);
  },
});

/**
 * Distinct sorted set of tags this user has used across personal + org
 * commands. Powers the autocomplete in the editor's tag input.
 */
export const getMyCommandTags = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const personal = await ctx.db
      .query("commands")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const orgCommands = await Promise.all(
      memberships.map((m) =>
        ctx.db
          .query("commands")
          .withIndex("by_orgId", (q) => q.eq("orgId", m.orgId))
          .collect(),
      ),
    );

    const all: Doc<"commands">[] = [...personal, ...orgCommands.flat()];
    return Array.from(new Set(all.flatMap((c) => c.tags ?? []))).sort();
  },
});
