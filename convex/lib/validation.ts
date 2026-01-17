/**
 * Shared validation logic for usernames and org slugs
 */

export const RESERVED_NAMES = [
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
 * Validates username format:
 * - 3-39 characters
 * - Lowercase alphanumeric + hyphens
 * - No consecutive hyphens
 * - Cannot start or end with hyphen
 * - Not a reserved name
 */
export function isValidUsername(username: string): boolean {
  // Length check: 3-39 characters
  if (username.length < 3 || username.length > 39) {
    return false;
  }

  // Only lowercase alphanumeric and hyphens
  if (!/^[a-z0-9-]+$/.test(username)) {
    return false;
  }

  // Cannot start or end with hyphen
  if (username.startsWith("-") || username.endsWith("-")) {
    return false;
  }

  // No consecutive hyphens
  if (username.includes("--")) {
    return false;
  }

  // Not a reserved name
  if (RESERVED_NAMES.includes(username as (typeof RESERVED_NAMES)[number])) {
    return false;
  }

  return true;
}

/**
 * Alias for isValidUsername - org slugs follow the same rules
 */
export const isValidOrgSlug = isValidUsername;
