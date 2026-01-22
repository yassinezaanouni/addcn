import { create } from "zustand";
import type { ComponentFile } from "@/types/component";
import type { Id } from "@/convex/_generated/dataModel";

const DEFAULT_FILE_CONTENT = `export default function Component() {
  return (
    <div className="p-4 rounded-lg border">
      <h1 className="text-xl font-bold">Hello World</h1>
      <p className="text-muted-foreground">Edit this component to get started.</p>
    </div>
  );
}`;

const DEFAULT_GLOBALS_CSS = `/* Styles will be appended to globals.css when installed */
@layer components {
  /* Add your component-specific styles here */
}
`;

interface EditorState {
  // Convex ID (null for new components)
  convexId: Id<"components"> | null;

  // Component metadata
  name: string;
  title: string;
  description: string;

  // Files
  files: ComponentFile[];
  activeFileId: string | null;

  // Dependencies
  dependencies: string[];
  registryDependencies: string[];

  // State
  isDirty: boolean;

  // Actions
  setConvexId: (id: Id<"components"> | null) => void;
  setMetadata: (data: { name?: string; title?: string; description?: string }) => void;
  setActiveFile: (fileId: string | null) => void;
  updateFileContent: (fileId: string, content: string) => void;
  addFile: (path: string) => void;
  removeFile: (fileId: string) => void;
  renamePath: (fileId: string, newPath: string) => void;
  addDependency: (dep: string) => void;
  removeDependency: (dep: string) => void;
  addRegistryDependency: (dep: string) => void;
  removeRegistryDependency: (dep: string) => void;
  setIsDirty: (dirty: boolean) => void;
  reset: () => void;
  loadComponent: (component: {
    _id: Id<"components">;
    name: string;
    title: string;
    description: string;
    files: ComponentFile[];
    dependencies: string[];
    registryDependencies: string[];
  }) => void;
}

// Helper functions
function getLanguage(path: string): ComponentFile["language"] {
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  return "typescript";
}

function getFileType(path: string): ComponentFile["type"] {
  if (path.endsWith(".css")) return "style";
  if (path.includes("/hooks/") || path.startsWith("hooks/")) return "hook";
  if (path.includes("/lib/") || path.startsWith("lib/")) return "util";
  return "component";
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function createDefaultFile(): ComponentFile {
  return {
    id: generateId(),
    path: "components/ui/component.tsx",
    content: DEFAULT_FILE_CONTENT,
    type: "component",
    language: "typescript",
  };
}

function createDefaultGlobalsCss(): ComponentFile {
  return {
    id: generateId(),
    path: "globals.css",
    content: DEFAULT_GLOBALS_CSS,
    type: "style",
    language: "css",
  };
}

function createDefaultFiles(): ComponentFile[] {
  return [createDefaultFile(), createDefaultGlobalsCss()];
}

const defaultFiles = createDefaultFiles();

const initialState = {
  convexId: null,
  name: "",
  title: "",
  description: "",
  files: defaultFiles,
  activeFileId: defaultFiles[0].id,
  dependencies: [],
  registryDependencies: [],
  isDirty: false,
};

export const useEditorStore = create<EditorState>()((set) => ({
  ...initialState,
  activeFileId: initialState.files[0].id,

  setConvexId: (id) => set({ convexId: id }),

  setMetadata: (data) =>
    set(() => ({
      ...data,
      isDirty: true,
    })),

  setActiveFile: (fileId) => set({ activeFileId: fileId }),

  updateFileContent: (fileId, content) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId ? { ...f, content } : f
      ),
      isDirty: true,
    })),

  addFile: (path) => {
    const newFile: ComponentFile = {
      id: generateId(),
      path,
      content: path.endsWith(".css") ? "/* Add your styles here */\n" : DEFAULT_FILE_CONTENT,
      type: getFileType(path),
      language: getLanguage(path),
    };
    set((state) => ({
      files: [...state.files, newFile],
      activeFileId: newFile.id,
      isDirty: true,
    }));
  },

  removeFile: (fileId) =>
    set((state) => {
      const newFiles = state.files.filter((f) => f.id !== fileId);
      const newActiveId =
        state.activeFileId === fileId
          ? newFiles[0]?.id ?? null
          : state.activeFileId;
      return {
        files: newFiles,
        activeFileId: newActiveId,
        isDirty: true,
      };
    }),

  renamePath: (fileId, newPath) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId
          ? {
              ...f,
              path: newPath,
              type: getFileType(newPath),
              language: getLanguage(newPath),
            }
          : f
      ),
      isDirty: true,
    })),

  addDependency: (dep) =>
    set((state) => ({
      dependencies: state.dependencies.includes(dep)
        ? state.dependencies
        : [...state.dependencies, dep],
      isDirty: true,
    })),

  removeDependency: (dep) =>
    set((state) => ({
      dependencies: state.dependencies.filter((d) => d !== dep),
      isDirty: true,
    })),

  addRegistryDependency: (dep) =>
    set((state) => ({
      registryDependencies: state.registryDependencies.includes(dep)
        ? state.registryDependencies
        : [...state.registryDependencies, dep],
      isDirty: true,
    })),

  removeRegistryDependency: (dep) =>
    set((state) => ({
      registryDependencies: state.registryDependencies.filter((d) => d !== dep),
      isDirty: true,
    })),

  setIsDirty: (dirty) => set({ isDirty: dirty }),

  reset: () => {
    const files = createDefaultFiles();
    set({
      ...initialState,
      files,
      activeFileId: files[0].id,
    });
  },

  loadComponent: (component) => {
    const activeFileId = component.files[0]?.id ?? null;
    set({
      convexId: component._id,
      name: component.name,
      title: component.title,
      description: component.description,
      files: component.files,
      activeFileId,
      dependencies: component.dependencies,
      registryDependencies: component.registryDependencies,
      isDirty: false,
    });
  },
}));

// Utility to get computed state
export const useIsNewComponent = () =>
  useEditorStore((state) => state.convexId === null);

// Utility to build folder tree from flat file list
export interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  file?: ComponentFile;
}

export function buildFolderTree(files: ComponentFile[]): FolderNode[] {
  const root: FolderNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");

      let node = current.find((n) => n.name === part);
      if (!node) {
        node = {
          name: part,
          path,
          children: [],
          file: isFile ? file : undefined,
        };
        current.push(node);
      }
      current = node.children;
    }
  }

  return root;
}
