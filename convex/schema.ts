import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { componentFilesValidator } from "./validators";

export default defineSchema({
  components: defineTable({
    name: v.string(),
    title: v.string(),
    description: v.string(),
    files: componentFilesValidator,
    dependencies: v.array(v.string()),
    registryDependencies: v.array(v.string()),
  })
    .index("by_name", ["name"])
    .searchIndex("search_components", {
      searchField: "title",
      filterFields: ["name"],
    }),
});
