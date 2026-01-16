export interface RegistryFile {
  path: string;
  type: "registry:component";
  content: string;
}

export interface RegistryItem {
  $schema: "https://ui.shadcn.com/schema/registry-item.json";
  name: string;
  type: "registry:component";
  title: string;
  description: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files: RegistryFile[];
}
