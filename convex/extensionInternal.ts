/**
 * Internal queries and mutations behind the extension HTTP API. Each one
 * accepts the resolved `userId` (already validated upstream by the
 * httpAction's bearer-token check) and returns a JSON-shaped payload the
 * extension can render directly.
 */
import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { snippetFilesValidator } from "./validators";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

/* -------------------------------------------------------------------------- */
/* Snippets                                                                   */
/* -------------------------------------------------------------------------- */

export const listSnippets = internalQuery({
  args: { userId: v.id("users"), context: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return [];

    let snippets: Doc<"snippets">[] = [];
    let namespace = user.username;
    let resultContext: "personal" | "org" = "personal";

    if (args.context === "personal" || args.context === "") {
      snippets = await ctx.db
        .query("snippets")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect();
    } else {
      const orgId = args.context as Id<"organizations">;
      const membership = await ctx.db
        .query("orgMembers")
        .withIndex("by_orgId_userId", (q) =>
          q.eq("orgId", orgId).eq("userId", args.userId),
        )
        .unique();
      if (!membership) return [];
      const org = await ctx.db.get(orgId);
      if (!org) return [];
      namespace = org.slug;
      resultContext = "org";
      snippets = await ctx.db
        .query("snippets")
        .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
        .collect();
    }

    snippets.sort((a, b) => b.updatedAt - a.updatedAt);

    return snippets.map((s) => ({
      _id: s._id,
      name: s.name,
      title: s.title,
      description: s.description,
      isPublic: s.isPublic,
      downloads: s.downloads,
      tags: s.tags ?? [],
      updatedAt: s.updatedAt,
      installUrl: `${SITE_URL}/r/${namespace}/${s.name}.json`,
      namespace,
      context: resultContext,
    }));
  },
});

export const searchPublicSnippets = internalQuery({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const trimmed = args.query.trim();
    let candidates: Doc<"snippets">[];
    if (trimmed) {
      candidates = await ctx.db
        .query("snippets")
        .withSearchIndex("search_snippets", (q) =>
          q.search("searchText", trimmed),
        )
        .take(50);
    } else {
      candidates = await ctx.db.query("snippets").order("desc").take(40);
    }
    const publics = candidates.filter((s) => s.isPublic);

    const userMap = new Map<string, string>();
    const orgMap = new Map<string, string>();
    for (const s of publics) {
      if (s.userId && !userMap.has(s.userId)) {
        const u = await ctx.db.get(s.userId);
        if (u) userMap.set(s.userId, u.username);
      }
      if (s.orgId && !orgMap.has(s.orgId)) {
        const o = await ctx.db.get(s.orgId);
        if (o) orgMap.set(s.orgId, o.slug);
      }
    }

    return publics.map((s) => {
      const namespace = s.userId
        ? (userMap.get(s.userId) ?? "")
        : s.orgId
          ? (orgMap.get(s.orgId) ?? "")
          : "";
      return {
        _id: s._id,
        name: s.name,
        title: s.title,
        description: s.description,
        downloads: s.downloads,
        tags: s.tags ?? [],
        updatedAt: s.updatedAt,
        namespace,
        installUrl: `${SITE_URL}/r/${namespace}/${s.name}.json`,
      };
    });
  },
});

export const createSnippet = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    title: v.string(),
    description: v.string(),
    files: snippetFilesValidator,
    dependencies: v.array(v.string()),
    devDependencies: v.array(v.string()),
    registryDependencies: v.array(v.string()),
    tags: v.array(v.string()),
    orgId: v.optional(v.id("organizations")),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.orgId) {
      const membership = await ctx.db
        .query("orgMembers")
        .withIndex("by_orgId_userId", (q) =>
          q.eq("orgId", args.orgId!).eq("userId", args.userId),
        )
        .unique();
      if (!membership) {
        throw new ConvexError("You are not a member of this organization");
      }
      const conflict = await ctx.db
        .query("snippets")
        .withIndex("by_orgId_name", (q) =>
          q.eq("orgId", args.orgId!).eq("name", args.name),
        )
        .unique();
      if (conflict) {
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
        tags: args.tags,
        orgId: args.orgId,
        createdBy: args.userId,
        isPublic: args.isPublic,
        downloads: 0,
        createdAt: now,
        updatedAt: now,
        searchText: `${args.name} ${args.title} ${args.description}`,
      });
    }
    const conflict = await ctx.db
      .query("snippets")
      .withIndex("by_userId_name", (q) =>
        q.eq("userId", args.userId).eq("name", args.name),
      )
      .unique();
    if (conflict) {
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
      tags: args.tags,
      userId: args.userId,
      createdBy: args.userId,
      isPublic: args.isPublic,
      downloads: 0,
      createdAt: now,
      updatedAt: now,
      searchText: `${args.name} ${args.title} ${args.description}`,
    });
  },
});

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

type Operator = "&&" | "||" | ";" | "|" | "\n";

function joinSteps(
  steps: Doc<"commands">["steps"],
  resolveCommand: (id: Id<"commands">) => Doc<"commands"> | null,
  resolveSnippetInstall: (id: Id<"snippets">) => string | null,
  visited: Set<string>,
): string {
  if (steps.length === 0) return "";
  return steps.reduce<string>((acc, step, i) => {
    const rendered = renderStep(
      step,
      resolveCommand,
      resolveSnippetInstall,
      visited,
    );
    if (i === 0) return rendered;
    const prevOp: Operator = (steps[i - 1].operator as Operator) ?? "&&";
    if (prevOp === "\n") return `${acc}\n${rendered}`;
    return `${acc} ${prevOp} ${rendered}`;
  }, "");
}

function renderStep(
  step: Doc<"commands">["steps"][number],
  resolveCommand: (id: Id<"commands">) => Doc<"commands"> | null,
  resolveSnippetInstall: (id: Id<"snippets">) => string | null,
  visited: Set<string>,
): string {
  if (step.inlineCommand !== undefined) return step.inlineCommand;
  if (step.refSnippetId) {
    return resolveSnippetInstall(step.refSnippetId) ?? "<broken-reference>";
  }
  if (step.refCommandId) {
    if (visited.has(step.refCommandId)) return "<broken-reference>";
    const referenced = resolveCommand(step.refCommandId);
    if (!referenced) return "<broken-reference>";
    const next = new Set(visited);
    next.add(step.refCommandId);
    const expanded = joinSteps(
      referenced.steps,
      resolveCommand,
      resolveSnippetInstall,
      next,
    );
    return referenced.steps.length > 1 ? `(${expanded})` : expanded;
  }
  return "<broken-reference>";
}

export const listCommands = internalQuery({
  args: { userId: v.id("users"), context: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return [];

    let commands: Doc<"commands">[] = [];
    let resultContext: "personal" | "org" = "personal";

    if (args.context === "personal" || args.context === "") {
      commands = await ctx.db
        .query("commands")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect();
    } else {
      const orgId = args.context as Id<"organizations">;
      const membership = await ctx.db
        .query("orgMembers")
        .withIndex("by_orgId_userId", (q) =>
          q.eq("orgId", orgId).eq("userId", args.userId),
        )
        .unique();
      if (!membership) return [];
      resultContext = "org";
      commands = await ctx.db
        .query("commands")
        .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
        .collect();
    }

    commands.sort((a, b) => b.updatedAt - a.updatedAt);

    const commandMap = new Map<string, Doc<"commands">>(
      commands.map((c) => [c._id, c]),
    );
    const snippetIdSet = new Set<Id<"snippets">>();
    for (const c of commands) {
      for (const s of c.steps) {
        if (s.refSnippetId) snippetIdSet.add(s.refSnippetId);
      }
    }
    const snippetMap = new Map<string, Doc<"snippets">>();
    for (const id of snippetIdSet) {
      const s = await ctx.db.get(id);
      if (s) snippetMap.set(id, s);
    }
    const userMap = new Map<string, string>();
    const orgMap = new Map<string, string>();
    for (const s of snippetMap.values()) {
      if (s.userId && !userMap.has(s.userId)) {
        const u = await ctx.db.get(s.userId);
        if (u) userMap.set(s.userId, u.username);
      }
      if (s.orgId && !orgMap.has(s.orgId)) {
        const o = await ctx.db.get(s.orgId);
        if (o) orgMap.set(s.orgId, o.slug);
      }
    }
    const resolveCommand = (id: Id<"commands">) =>
      commandMap.get(id) ?? null;
    const resolveSnippetInstall = (id: Id<"snippets">) => {
      const s = snippetMap.get(id);
      if (!s) return null;
      const ns = s.userId
        ? (userMap.get(s.userId) ?? "")
        : s.orgId
          ? (orgMap.get(s.orgId) ?? "")
          : "";
      return `pnpm dlx shadcn@latest add ${SITE_URL}/r/${ns}/${s.name}.json`;
    };

    return commands.map((c) => ({
      _id: c._id,
      name: c.name,
      description: c.description,
      steps: c.steps.length,
      tags: c.tags ?? [],
      joined: joinSteps(
        c.steps,
        resolveCommand,
        resolveSnippetInstall,
        new Set([c._id]),
      ),
      updatedAt: c.updatedAt,
      context: resultContext,
    }));
  },
});

/* -------------------------------------------------------------------------- */
/* Misc                                                                       */
/* -------------------------------------------------------------------------- */

export const getMyOrgs = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    const orgs = await Promise.all(
      memberships.map(async (m) => {
        const o = await ctx.db.get(m.orgId);
        return o ? { ...o, role: m.role } : null;
      }),
    );
    return orgs.filter(
      (o): o is NonNullable<typeof o> => o !== null,
    );
  },
});
