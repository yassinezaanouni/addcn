import type { SavedSnippet, SnippetFile } from "@/types/snippet";
import type {
  RegistryItem,
  RegistryFile,
  RegistryFileType,
} from "@/types/registry";
import { REGISTRY_SCHEMA_URL } from "./constants";

/**
 * Get the filename from a path
 */
function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

/**
 * Maps internal file type to shadcn registry file type and determines if target is needed
 */
function getRegistryFileInfo(file: SnippetFile): {
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

export function snippetToRegistry(snippet: SavedSnippet): RegistryItem {
  const files: RegistryFile[] = snippet.files.map((file) => {
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
    $schema:
      REGISTRY_SCHEMA_URL as "https://ui.shadcn.com/schema/registry-item.json",
    name: snippet.name,
    type: "registry:ui",
    title: snippet.title,
    description: snippet.description,
    dependencies:
      snippet.dependencies.length > 0 ? snippet.dependencies : undefined,
    registryDependencies:
      snippet.registryDependencies.length > 0
        ? snippet.registryDependencies
        : undefined,
    files,
  };
}
