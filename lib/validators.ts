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

export const componentMetadataSchema = z.object({
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

export type ComponentMetadata = z.infer<typeof componentMetadataSchema>;

export type ComponentMetadataErrors = {
  [K in keyof ComponentMetadata]?: string;
};

export function validateComponentMetadata(data: ComponentMetadata): {
  success: boolean;
  errors: ComponentMetadataErrors;
} {
  const result = componentMetadataSchema.safeParse(data);

  if (result.success) {
    return { success: true, errors: {} };
  }

  const errors: ComponentMetadataErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof ComponentMetadata;
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }

  return { success: false, errors };
}
