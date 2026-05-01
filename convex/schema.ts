import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { snippetFilesValidator } from "./validators";

export default defineSchema({
  // Users table - stores user profiles
  users: defineTable({
    username: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    externalId: v.string(), // Auth provider ID
    createdAt: v.number(),
  })
    .index("by_username", ["username"])
    .index("by_email", ["email"])
    .index("by_externalId", ["externalId"]),

  // Organizations table
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  // Organization members table
  orgMembers: defineTable({
    orgId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    invitedBy: v.optional(v.id("users")),
    joinedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_userId", ["userId"])
    .index("by_orgId_userId", ["orgId", "userId"]),

  // Invites table for organization invitations
  invites: defineTable({
    orgId: v.id("organizations"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    invitedBy: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_token", ["token"])
    .index("by_email", ["email"]),

  // Snippets table - registry items, can hold any file type
  snippets: defineTable({
    name: v.string(),
    title: v.string(),
    description: v.string(),
    files: snippetFilesValidator,
    dependencies: v.array(v.string()),
    devDependencies: v.optional(v.array(v.string())),
    registryDependencies: v.array(v.string()),
    // Multi-user fields
    userId: v.optional(v.id("users")), // Owner if personal snippet
    orgId: v.optional(v.id("organizations")), // Owner if org snippet
    createdBy: v.id("users"), // User who created the snippet
    isPublic: v.boolean(),
    downloads: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Preview settings
    previewEnabled: v.optional(v.boolean()), // default: false (live preview disabled)
    previewMediaUrl: v.optional(v.string()), // R2 URL for fallback image/video
    previewMediaType: v.optional(
      v.union(v.literal("image"), v.literal("video")),
    ),
    // Combined search field (name + title + description) for full-text search
    searchText: v.string(),
  })
    .index("by_name", ["name"])
    .index("by_userId", ["userId"])
    .index("by_orgId", ["orgId"])
    .index("by_userId_name", ["userId", "name"])
    .index("by_orgId_name", ["orgId", "name"])
    .searchIndex("search_snippets", {
      searchField: "searchText",
      filterFields: ["name"],
    }),

  // Download attempts for deduplication
  // Tracks recent downloads per IP to prevent multiple counts from CLI burst requests
  downloadAttempts: defineTable({
    snippetId: v.id("snippets"),
    fingerprint: v.string(), // IP address
    timestamp: v.number(),
  }).index("by_snippet_fingerprint", ["snippetId", "fingerprint"]),
});
