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
}

const REGISTRY_SCHEMA_URL =
  "https://ui.shadcn.com/schema/registry-item.json" as const;

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
  const files: RegistryFile[] = component.files.map((file) => {
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
