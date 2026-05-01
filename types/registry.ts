export type RegistryFileType =
  | "registry:ui"
  | "registry:component"
  | "registry:hook"
  | "registry:lib"
  | "registry:block"
  | "registry:style"
  | "registry:file";

export interface RegistryFile {
  path: string;
  type: RegistryFileType;
  content: string;
  target?: string; // Optional: explicit output path (only for registry:file type)
}

export type RegistryItemType =
  | "registry:ui"
  | "registry:component"
  | "registry:block";

export interface RegistryItem {
  $schema: "https://ui.shadcn.com/schema/registry-item.json";
  name: string;
  type: RegistryItemType;
  title: string;
  description: string;
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  categories?: string[];
  files: RegistryFile[];
}
