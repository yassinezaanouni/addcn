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
  previewFileId: string | null;

  // Dependencies
  dependencies: string[];
  registryDependencies: string[];

  // Preview settings
  previewEnabled: boolean;
  previewMediaUrl: string | null; // R2 URL (after save)
  previewMediaType: "image" | "video" | null;

  // Pending media (before save)
  pendingMediaFile: File | null;
  pendingMediaLocalUrl: string | null; // Blob URL for preview

  // State
  isDirty: boolean;

  // Actions
  setConvexId: (id: Id<"components"> | null) => void;
  setMetadata: (data: { name?: string; title?: string; description?: string }) => void;
  setActiveFile: (fileId: string | null) => void;
  setPreviewFile: (fileId: string | null) => void;
  updateFileContent: (fileId: string, content: string) => void;
  addFile: (path: string) => void;
  removeFile: (fileId: string) => void;
  renamePath: (fileId: string, newPath: string) => void;
  addDependency: (dep: string) => void;
  removeDependency: (dep: string) => void;
  addRegistryDependency: (dep: string) => void;
  removeRegistryDependency: (dep: string) => void;
  setIsDirty: (dirty: boolean) => void;
  setPreviewEnabled: (enabled: boolean) => void;
  setPreviewMedia: (url: string | null, type: "image" | "video" | null) => void;
  setPendingMedia: (file: File | null) => void;
  clearPendingMedia: () => void;
  commitPendingMedia: (r2Url: string) => void;
  reset: () => void;
  loadComponent: (component: {
    _id: Id<"components">;
    name: string;
    title: string;
    description: string;
    files: ComponentFile[];
    dependencies: string[];
    registryDependencies: string[];
    previewEnabled?: boolean;
    previewMediaUrl?: string;
    previewMediaType?: "image" | "video";
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
  previewFileId: defaultFiles[0].id,
  dependencies: [],
  registryDependencies: [],
  previewEnabled: false,
  previewMediaUrl: null,
  previewMediaType: null,
  pendingMediaFile: null,
  pendingMediaLocalUrl: null,
  isDirty: false,
};

export const useEditorStore = create<EditorState>()((set) => ({
  ...initialState,
  activeFileId: initialState.files[0].id,
  previewFileId: initialState.files[0].id,

  setConvexId: (id) => set({ convexId: id }),

  setMetadata: (data) =>
    set(() => ({
      ...data,
      isDirty: true,
    })),

  setActiveFile: (fileId) => set({ activeFileId: fileId }),

  setPreviewFile: (fileId) => set({ previewFileId: fileId }),

  updateFileContent: (fileId, content) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId ? { ...f, content } : f
      ),
      isDirty: true,
    })),

  addFile: (path) => {
    let content = "";
    if (path.endsWith(".css")) {
      content = "/* Add your styles here */\n";
    } else if (path.endsWith(".tsx")) {
      content = `export default function Component() {
  return <></>;
}
`;
    } else if (path.endsWith(".ts")) {
      content = "";
    }

    const newFile: ComponentFile = {
      id: generateId(),
      path,
      content,
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
      const newPreviewId =
        state.previewFileId === fileId
          ? newFiles.find((f) => f.path.endsWith(".tsx"))?.id ?? null
          : state.previewFileId;
      return {
        files: newFiles,
        activeFileId: newActiveId,
        previewFileId: newPreviewId,
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

  setPreviewEnabled: (enabled) =>
    set(() => ({
      previewEnabled: enabled,
      isDirty: true,
    })),

  setPreviewMedia: (url, type) =>
    set(() => ({
      previewMediaUrl: url,
      previewMediaType: type,
      isDirty: true,
    })),

  setPendingMedia: (file) =>
    set((state) => {
      // Revoke old blob URL if exists
      if (state.pendingMediaLocalUrl) {
        URL.revokeObjectURL(state.pendingMediaLocalUrl);
      }

      if (!file) {
        return {
          pendingMediaFile: null,
          pendingMediaLocalUrl: null,
          previewMediaType: null,
          isDirty: true,
        };
      }

      // Create new blob URL for preview
      const localUrl = URL.createObjectURL(file);
      const type = file.type.startsWith("video/") ? "video" : "image";

      return {
        pendingMediaFile: file,
        pendingMediaLocalUrl: localUrl,
        previewMediaType: type,
        // Clear existing R2 URL since we have new pending media
        previewMediaUrl: null,
        isDirty: true,
      };
    }),

  clearPendingMedia: () =>
    set((state) => {
      if (state.pendingMediaLocalUrl) {
        URL.revokeObjectURL(state.pendingMediaLocalUrl);
      }
      return {
        pendingMediaFile: null,
        pendingMediaLocalUrl: null,
        previewMediaType: state.previewMediaUrl ? state.previewMediaType : null,
      };
    }),

  commitPendingMedia: (r2Url) =>
    set((state) => {
      // Revoke blob URL after successful upload
      if (state.pendingMediaLocalUrl) {
        URL.revokeObjectURL(state.pendingMediaLocalUrl);
      }
      return {
        previewMediaUrl: r2Url,
        pendingMediaFile: null,
        pendingMediaLocalUrl: null,
      };
    }),

  reset: () => {
    const files = createDefaultFiles();
    set((state) => {
      // Cleanup blob URL
      if (state.pendingMediaLocalUrl) {
        URL.revokeObjectURL(state.pendingMediaLocalUrl);
      }
      return {
        ...initialState,
        files,
        activeFileId: files[0].id,
        previewFileId: files[0].id,
      };
    });
  },

  loadComponent: (component) => {
    const firstTsxFile = component.files.find((f) => f.path.endsWith(".tsx"));
    const activeFileId = component.files[0]?.id ?? null;
    const previewFileId = firstTsxFile?.id ?? activeFileId;
    set((state) => {
      // Cleanup blob URL
      if (state.pendingMediaLocalUrl) {
        URL.revokeObjectURL(state.pendingMediaLocalUrl);
      }
      return {
        convexId: component._id,
        name: component.name,
        title: component.title,
        description: component.description,
        files: component.files,
        activeFileId,
        previewFileId,
        dependencies: component.dependencies,
        registryDependencies: component.registryDependencies,
        previewEnabled: component.previewEnabled ?? false,
        previewMediaUrl: component.previewMediaUrl ?? null,
        previewMediaType: component.previewMediaType ?? null,
        pendingMediaFile: null,
        pendingMediaLocalUrl: null,
        isDirty: false,
      };
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
