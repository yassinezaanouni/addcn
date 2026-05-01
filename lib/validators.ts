import { z } from "zod";

// Username validation rules (must match convex/lib/validation.ts)
export const USERNAME_RULES = {
  minLength: 3,
  maxLength: 39,
  pattern: /^[a-z0-9-]+$/,
} as const;

const RESERVED_NAMES = [
  "admin",
  "api",
  "app",
  "auth",
  "billing",
  "blog",
  "cdn",
  "components",
  "config",
  "dashboard",
  "docs",
  "editor",
  "explore",
  "help",
  "invite",
  "login",
  "logout",
  "new",
  "onboarding",
  "orgs",
  "pricing",
  "r",
  "registry",
  "search",
  "settings",
  "signup",
  "snippets",
  "status",
  "support",
  "terms",
  "www",
] as const;

/**
 * Validates username format and returns an error message if invalid.
 * Returns null if valid.
 */
export function validateUsernameFormat(username: string): string | null {
  if (username.length < USERNAME_RULES.minLength) {
    return `Username must be at least ${USERNAME_RULES.minLength} characters`;
  }
  if (username.length > USERNAME_RULES.maxLength) {
    return `Username must be at most ${USERNAME_RULES.maxLength} characters`;
  }
  if (!USERNAME_RULES.pattern.test(username)) {
    return "Only lowercase letters, numbers, and hyphens allowed";
  }
  if (username.startsWith("-") || username.endsWith("-")) {
    return "Cannot start or end with a hyphen";
  }
  if (username.includes("--")) {
    return "Cannot contain consecutive hyphens";
  }
  if (RESERVED_NAMES.includes(username as (typeof RESERVED_NAMES)[number])) {
    return "This username is reserved";
  }
  return null;
}

// Tag validation rules: lowercase letters, numbers, single hyphens, 1-30 chars,
// no leading/trailing or consecutive hyphens. Same shape as username slugs.
export const TAG_RULES = {
  minLength: 1,
  maxLength: 30,
  pattern: /^[a-z0-9-]+$/,
} as const;

export const MAX_TAGS_PER_SNIPPET = 8;

/**
 * Normalize a raw tag input to a valid snippet tag, or return null if it
 * cannot be coerced (empty, too long, invalid characters).
 */
export function normalizeTag(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, "-");
  if (cleaned.length < TAG_RULES.minLength) return null;
  if (cleaned.length > TAG_RULES.maxLength) return null;
  if (!TAG_RULES.pattern.test(cleaned)) return null;
  if (cleaned.startsWith("-") || cleaned.endsWith("-")) return null;
  if (cleaned.includes("--")) return null;
  return cleaned;
}

export const snippetMetadataSchema = z.object({
  name: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must be lowercase letters, numbers, and hyphens only",
    ),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

export type SnippetMetadata = z.infer<typeof snippetMetadataSchema>;

export type SnippetMetadataErrors = {
  [K in keyof SnippetMetadata]?: string;
};

export function validateSnippetMetadata(data: SnippetMetadata): {
  success: boolean;
  errors: SnippetMetadataErrors;
} {
  const result = snippetMetadataSchema.safeParse(data);

  if (result.success) {
    return { success: true, errors: {} };
  }

  const errors: SnippetMetadataErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof SnippetMetadata;
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }

  return { success: false, errors };
}
