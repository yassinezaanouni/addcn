import { create } from "zustand";
import type { ComponentFile, SavedComponent } from "@/types/component";
import { v4 as uuid } from "uuid";
import { DEFAULT_FILE_CONTENT } from "@/lib/constants";

interface EditorState {
  componentId: string | null;
  name: string;
  title: string;
  description: string;
  files: ComponentFile[];
  activeFileId: string | null;
  dependencies: string[];
  registryDependencies: string[];
  isDirty: boolean;
  setMetadata: (data: Partial<Pick<EditorState, "name" | "title" | "description" | "componentId" | "isDirty" | "dependencies" | "registryDependencies">>) => void;
  setActiveFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  addFile: (path: string) => void;
  removeFile: (id: string) => void;
  renamePath: (id: string, newPath: string) => void;
  reset: () => void;
  loadComponent: (component: SavedComponent) => void;
}

function getLanguage(path: string): ComponentFile["language"] {
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  return "typescript";
}

function getFileType(path: string): ComponentFile["type"] {
  if (path.includes("/hooks/") || path.startsWith("hooks/")) return "hook";
  if (path.includes("/lib/") || path.startsWith("lib/") || path.includes("/utils/") || path.startsWith("utils/")) return "util";
  if (path.endsWith(".css")) return "style";
  return "component";
}

const createDefaultFile = (componentName: string): ComponentFile => ({
  id: uuid(),
  path: `components/ui/${componentName || "component"}.tsx`,
  content: DEFAULT_FILE_CONTENT,
  type: "component",
  language: "typescript",
});

const initialState = {
  componentId: null,
  name: "",
  title: "",
  description: "",
  files: [] as ComponentFile[],
  activeFileId: null,
  dependencies: [],
  registryDependencies: [],
  isDirty: false,
};

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialState,

  setMetadata: (data) =>
    set((state) => ({ ...state, ...data, isDirty: true })),

  setActiveFile: (id) => set({ activeFileId: id }),

  updateFileContent: (id, content) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, content } : f)),
      isDirty: true,
    })),

  addFile: (path) => {
    const newFile: ComponentFile = {
      id: uuid(),
      path,
      content: "",
      type: getFileType(path),
      language: getLanguage(path),
    };
    set((state) => ({
      files: [...state.files, newFile],
      activeFileId: newFile.id,
      isDirty: true,
    }));
  },


  removeFile: (id) =>
    set((state) => {
      const newFiles = state.files.filter((f) => f.id !== id);
      const newActiveId =
        state.activeFileId === id
          ? newFiles[0]?.id || null
          : state.activeFileId;
      return { files: newFiles, activeFileId: newActiveId, isDirty: true };
    }),

  renamePath: (id, newPath) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id
          ? { ...f, path: newPath, type: getFileType(newPath), language: getLanguage(newPath) }
          : f
      ),
      isDirty: true,
    })),

  reset: () => {
    const defaultFile = createDefaultFile("component");
    set({
      ...initialState,
      files: [defaultFile],
      activeFileId: defaultFile.id,
    });
  },

  loadComponent: (component) =>
    set({
      componentId: component.id,
      name: component.name,
      title: component.title,
      description: component.description,
      files: component.files,
      activeFileId: component.files[0]?.id || null,
      dependencies: component.dependencies,
      registryDependencies: component.registryDependencies,
      isDirty: false,
    }),
}));

// Helper to get filename from path
export function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

// Helper to get directory from path
export function getDirectory(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash > 0 ? path.substring(0, lastSlash) : "";
}

// Helper to build folder tree from flat file list
export interface FolderNode {
  name: string;
  path: string;
  type: "folder" | "file";
  children?: FolderNode[];
  file?: ComponentFile;
}

export function buildFolderTree(files: ComponentFile[]): FolderNode[] {
  const root: FolderNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = i === parts.length - 1;

      let node = current.find((n) => n.name === part);

      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "folder",
          children: isFile ? undefined : [],
          file: isFile ? file : undefined,
        };
        current.push(node);
      }

      if (!isFile && node.children) {
        current = node.children;
      }
    }
  }

  // Sort: folders first, then files, alphabetically
  const sortNodes = (nodes: FolderNode[]): FolderNode[] => {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map((node) => ({
      ...node,
      children: node.children ? sortNodes(node.children) : undefined,
    }));
  };

  return sortNodes(root);
}
