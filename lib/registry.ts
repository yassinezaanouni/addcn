import type { SavedComponent, ComponentFile } from "@/types/component";
import type { RegistryItem, RegistryFile, RegistryFileType } from "@/types/registry";
import { REGISTRY_SCHEMA_URL } from "./constants";

/**
 * Maps internal file type to shadcn registry file type
 */
function getRegistryFileType(file: ComponentFile): RegistryFileType {
  switch (file.type) {
    case "hook":
      return "registry:hook";
    case "util":
      return "registry:lib";
    case "style":
      return "registry:style";
    case "component":
    default:
      // Use registry:ui for components in components/ui path
      if (file.path.startsWith("components/ui/")) {
        return "registry:ui";
      }
      return "registry:component";
  }
}

export function componentToRegistry(component: SavedComponent): RegistryItem {
  const files: RegistryFile[] = component.files.map((file) => ({
    path: file.path,
    type: getRegistryFileType(file),
    content: file.content,
  }));

  return {
    $schema: REGISTRY_SCHEMA_URL as "https://ui.shadcn.com/schema/registry-item.json",
    name: component.name,
    type: "registry:ui",
    title: component.title,
    description: component.description,
    dependencies: component.dependencies.length > 0 ? component.dependencies : undefined,
    registryDependencies:
      component.registryDependencies.length > 0
        ? component.registryDependencies
        : undefined,
    files,
  };
}
