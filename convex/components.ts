import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("components").order("desc").collect();
  },
});

export const get = query({
  args: { id: v.id("components") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("components")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("components")
      .withSearchIndex("search_components", (q) => q.search("title", args.query))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    title: v.string(),
    description: v.string(),
    files: v.array(
      v.object({
        id: v.string(),
        path: v.string(),
        content: v.string(),
        type: v.union(
          v.literal("component"),
          v.literal("hook"),
          v.literal("util"),
          v.literal("style")
        ),
        language: v.union(
          v.literal("typescript"),
          v.literal("css"),
          v.literal("json")
        ),
      })
    ),
    dependencies: v.array(v.string()),
    registryDependencies: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("components", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("components"),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    files: v.optional(
      v.array(
        v.object({
          id: v.string(),
          path: v.string(),
          content: v.string(),
          type: v.union(
            v.literal("component"),
            v.literal("hook"),
            v.literal("util"),
            v.literal("style")
          ),
          language: v.union(
            v.literal("typescript"),
            v.literal("css"),
            v.literal("json")
          ),
        })
      )
    ),
    dependencies: v.optional(v.array(v.string())),
    registryDependencies: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );
    await ctx.db.patch(id, filtered);
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("components") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
