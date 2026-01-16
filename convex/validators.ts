import { v } from "convex/values";

/**
 * Shared validators for Convex schema and mutations
 * Keep in sync with types/component.ts
 */

export const fileTypeValidator = v.union(
  v.literal("component"),
  v.literal("hook"),
  v.literal("util"),
  v.literal("style")
);

export const languageValidator = v.union(
  v.literal("typescript"),
  v.literal("css"),
  v.literal("json")
);

export const componentFileValidator = v.object({
  id: v.string(),
  path: v.string(),
  content: v.string(),
  type: fileTypeValidator,
  language: languageValidator,
});

export const componentFilesValidator = v.array(componentFileValidator);
