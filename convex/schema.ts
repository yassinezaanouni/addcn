import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  components: defineTable({
    name: v.string(),
    title: v.string(),
    description: v.string(),
    files: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
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
  })
    .index("by_name", ["name"])
    .searchIndex("search_components", {
      searchField: "title",
      filterFields: ["name"],
    }),
});
