import type { SavedComponent } from "@/types/component";
import type { RegistryItem, RegistryFile } from "@/types/registry";
import { REGISTRY_SCHEMA_URL } from "./constants";

export function componentToRegistry(component: SavedComponent): RegistryItem {
  const files: RegistryFile[] = component.files.map((file) => ({
    path: `registry/default/${component.name}/${file.name}`,
    type: "registry:component" as const,
    content: file.content,
  }));

  return {
    $schema: REGISTRY_SCHEMA_URL as "https://ui.shadcn.com/schema/registry-item.json",
    name: component.name,
    type: "registry:component",
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
