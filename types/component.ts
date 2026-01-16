export interface ComponentFile {
  id: string;
  name: string;
  content: string;
  type: "component" | "hook" | "util" | "style";
  language: "typescript" | "css" | "json";
}

export interface SavedComponent {
  id: string;
  name: string;
  title: string;
  description: string;
  files: ComponentFile[];
  dependencies: string[];
  registryDependencies: string[];
  createdAt: string;
  updatedAt: string;
}
