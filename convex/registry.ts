/**
 * Registry internal functions for HTTP action endpoint
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import { resolveNamespace } from "./lib/namespace";
import { Doc } from "./_generated/dataModel";

/**
 * shadcn registry file type
 */
type RegistryFileType =
  | "registry:ui"
  | "registry:component"
  | "registry:hook"
  | "registry:lib"
  | "registry:block"
  | "registry:style"
  | "registry:file";

/**
 * shadcn registry file structure
 */
interface RegistryFile {
  path: string;
  type: RegistryFileType;
  content: string;
  target?: string;
}

/**
 * shadcn registry item structure
 */
interface RegistryItem {
  $schema: "https://ui.shadcn.com/schema/registry-item.json";
  name: string;
  type: "registry:ui" | "registry:component" | "registry:block";
  title: string;
  description: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files: RegistryFile[];
  css?: CssObject;
}

const REGISTRY_SCHEMA_URL =
  "https://ui.shadcn.com/schema/registry-item.json" as const;

/**
 * Simple CSS parser that converts raw CSS to the shadcn registry css field format.
 * This enables CSS to be appended to the user's globals.css instead of replacing it.
 *
 * Handles:
 * - @layer rules (base, components, utilities)
 * - @keyframes animations
 * - Regular CSS selectors with properties
 */
type CssValue = string | Record<string, string>;
type CssObject = Record<string, CssValue | Record<string, CssValue>>;

function parseCssToRegistryFormat(cssContent: string): CssObject | null {
  const result: CssObject = {};

  // Remove comments
  const cleanCss = cssContent.replace(/\/\*[\s\S]*?\*\//g, "").trim();

  if (!cleanCss) return null;

  // Match top-level blocks: @layer, @keyframes, or selectors
  const blockRegex = /(@[\w-]+\s+[\w-]+|[^{}]+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let match;

  while ((match = blockRegex.exec(cleanCss)) !== null) {
    const [, selector, content] = match;
    const trimmedSelector = selector.trim();
    const trimmedContent = content.trim();

    if (trimmedSelector.startsWith("@layer") || trimmedSelector.startsWith("@keyframes")) {
      // Handle @layer and @keyframes - parse nested content
      const nested = parseNestedCss(trimmedContent);
      // Only include if there's actual content (skip empty layers)
      if (Object.keys(nested).length > 0) {
        result[trimmedSelector] = nested;
      }
    } else {
      // Regular selector - parse properties
      const props = parseProperties(trimmedContent);
      // Only include if there are actual properties
      if (Object.keys(props).length > 0) {
        result[trimmedSelector] = props;
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Parse nested CSS content (inside @layer or @keyframes)
 */
function parseNestedCss(content: string): Record<string, string | Record<string, string>> {
  const result: Record<string, string | Record<string, string>> = {};
  const nestedBlockRegex = /([^{}]+)\s*\{([^{}]*)\}/g;
  let match;

  while ((match = nestedBlockRegex.exec(content)) !== null) {
    const [, selector, properties] = match;
    result[selector.trim()] = parseProperties(properties.trim());
  }

  return result;
}

/**
 * Parse CSS properties into key-value pairs
 */
function parseProperties(propertiesStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  const properties = propertiesStr.split(";").filter((p) => p.trim());

  for (const prop of properties) {
    const colonIndex = prop.indexOf(":");
    if (colonIndex > -1) {
      const key = prop.slice(0, colonIndex).trim();
      const value = prop.slice(colonIndex + 1).trim();
      if (key && value) {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Get the filename from a path
 */
function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

/**
 * Maps internal file type to shadcn registry file type and determines if target is needed
 */
function getRegistryFileInfo(file: Doc<"components">["files"][number]): {
  type: RegistryFileType;
  target?: string;
} {
  // For standard shadcn paths, use appropriate types (shadcn resolves based on user config)
  if (file.path.startsWith("components/ui/")) {
    return { type: "registry:ui" };
  }
  if (file.path.startsWith("hooks/") || file.type === "hook") {
    return { type: "registry:hook" };
  }
  if (
    file.path.startsWith("lib/") ||
    file.path.startsWith("utils/") ||
    file.type === "util"
  ) {
    return { type: "registry:lib" };
  }
  if (file.type === "style" || file.path.endsWith(".css")) {
    return { type: "registry:style" };
  }

  // For custom paths, use registry:file with explicit target
  // Use ~/ prefix to indicate project root (per shadcn docs)
  return {
    type: "registry:file",
    target: `~/${file.path}`,
  };
}

/**
 * Converts a Convex component document to shadcn registry JSON format
 */
export function componentToRegistryJson(
  component: Doc<"components">
): RegistryItem {
  // Separate CSS files from other files
  const cssFiles = component.files.filter(
    (file) => file.type === "style" || file.path.endsWith(".css")
  );
  const nonCssFiles = component.files.filter(
    (file) => file.type !== "style" && !file.path.endsWith(".css")
  );

  // Convert non-CSS files to registry format
  const files: RegistryFile[] = nonCssFiles.map((file) => {
    const { type, target } = getRegistryFileInfo(file);

    const registryFile: RegistryFile = {
      // For standard types, just use filename - shadcn resolves the directory
      // For registry:file, use full path
      path: type === "registry:file" ? file.path : getFileName(file.path),
      type,
      content: file.content,
    };

    // Only include target for registry:file type
    if (target) {
      registryFile.target = target;
    }

    return registryFile;
  });

  // Parse CSS files and merge into a single css object
  // This enables CSS to be appended to globals.css instead of replacing it
  let css: CssObject | undefined;
  for (const cssFile of cssFiles) {
    const parsed = parseCssToRegistryFormat(cssFile.content);
    if (parsed) {
      css = css ? { ...css, ...parsed } : parsed;
    }
  }

  return {
    $schema: REGISTRY_SCHEMA_URL,
    name: component.name,
    type: "registry:ui",
    title: component.title,
    description: component.description,
    dependencies:
      component.dependencies.length > 0 ? component.dependencies : undefined,
    registryDependencies:
      component.registryDependencies.length > 0
        ? component.registryDependencies
        : undefined,
    files,
    css,
  };
}

/**
 * Get a public component by namespace and name.
 * Used by the HTTP action endpoint.
 */
export const getPublicComponent = internalQuery({
  args: {
    namespace: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = await resolveNamespace(ctx, args.namespace);

    if (!owner) {
      return null;
    }

    let component: Doc<"components"> | null = null;

    if (owner.type === "user") {
      component = await ctx.db
        .query("components")
        .withIndex("by_userId_name", (q) =>
          q.eq("userId", owner.user._id).eq("name", args.name)
        )
        .unique();
    } else {
      component = await ctx.db
        .query("components")
        .withIndex("by_orgId_name", (q) =>
          q.eq("orgId", owner.org._id).eq("name", args.name)
        )
        .unique();
    }

    // Only return public components
    if (!component || !component.isPublic) {
      return null;
    }

    return component;
  },
});

/**
 * Increment the download count for a component.
 * Called fire-and-forget by the HTTP action.
 */
export const incrementDownloads = internalMutation({
  args: {
    componentId: v.id("components"),
  },
  handler: async (ctx, args) => {
    const component = await ctx.db.get(args.componentId);
    if (!component) {
      return;
    }

    await ctx.db.patch(args.componentId, {
      downloads: component.downloads + 1,
    });
  },
});

/**
 * Get a component with authentication context.
 * Returns component if:
 * - Component is public, OR
 * - User is authenticated AND has access (owner or org member)
 */
export const getComponentWithAuth = internalQuery({
  args: {
    namespace: v.string(),
    name: v.string(),
    userId: v.union(v.id("users"), v.null()),
  },
  handler: async (ctx, args) => {
    const owner = await resolveNamespace(ctx, args.namespace);

    if (!owner) {
      return null;
    }

    let component: Doc<"components"> | null = null;

    if (owner.type === "user") {
      component = await ctx.db
        .query("components")
        .withIndex("by_userId_name", (q) =>
          q.eq("userId", owner.user._id).eq("name", args.name)
        )
        .unique();
    } else {
      component = await ctx.db
        .query("components")
        .withIndex("by_orgId_name", (q) =>
          q.eq("orgId", owner.org._id).eq("name", args.name)
        )
        .unique();
    }

    if (!component) {
      return null;
    }

    // Public components are always accessible
    if (component.isPublic) {
      return component;
    }

    // Private component - need authentication
    if (!args.userId) {
      return null;
    }

    // Check access permissions
    // Personal component: user must be owner
    if (component.userId) {
      if (component.userId !== args.userId) {
        return null;
      }
      return component;
    }

    // Org component: user must be a member
    if (component.orgId) {
      const membership = await ctx.db
        .query("orgMembers")
        .withIndex("by_orgId_userId", (q) =>
          q.eq("orgId", component.orgId!).eq("userId", args.userId!)
        )
        .unique();

      if (!membership) {
        return null;
      }
      return component;
    }

    return null;
  },
});
