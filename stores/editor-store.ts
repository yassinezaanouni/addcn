import { create } from "zustand";
import type { SnippetFile } from "@/types/snippet";
import type { Id } from "@/convex/_generated/dataModel";
import { MAX_TAGS_PER_SNIPPET, normalizeTag } from "@/lib/validators";

const DEFAULT_GLOBALS_CSS = `/* Styles will be appended to globals.css when installed */
@layer components {
  /* Add your snippet-specific styles here */
}
`;

interface EditorState {
  // Convex ID (null for new snippets)
  convexId: Id<"snippets"> | null;

  // Snippet metadata
  name: string;
  title: string;
  description: string;

  // Files
  files: SnippetFile[];
  activeFileId: string | null;

  // Dependencies
  dependencies: string[];
  devDependencies: string[];
  registryDependencies: string[];

  // Tags (free-form taxonomy, serialized as `categories` in registry JSON)
  tags: string[];

  // Preview media (static image/video shown on the snippet card)
  previewMediaUrl: string | null; // R2 URL (after save)
  previewMediaType: "image" | "video" | null;

  // Pending media (before save)
  pendingMediaFile: File | null;
  pendingMediaLocalUrl: string | null; // Blob URL for preview

  // State
  isDirty: boolean;
  validationDialogOpen: boolean;

  // Actions
  setConvexId: (id: Id<"snippets"> | null) => void;
  setValidationDialogOpen: (open: boolean) => void;
  setMetadata: (data: {
    name?: string;
    title?: string;
    description?: string;
  }) => void;
  setActiveFile: (fileId: string | null) => void;
  updateFileContent: (fileId: string, content: string) => void;
  addFile: (path: string) => void;
  removeFile: (fileId: string) => void;
  renamePath: (fileId: string, newPath: string) => void;
  addDependency: (dep: string) => void;
  removeDependency: (dep: string) => void;
  addDevDependency: (dep: string) => void;
  removeDevDependency: (dep: string) => void;
  addRegistryDependency: (dep: string) => void;
  removeRegistryDependency: (dep: string) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  setIsDirty: (dirty: boolean) => void;
  setPreviewMedia: (url: string | null, type: "image" | "video" | null) => void;
  setPendingMedia: (file: File | null) => void;
  clearPendingMedia: () => void;
  commitPendingMedia: (r2Url: string) => void;
  reset: () => void;
  loadSnippet: (snippet: {
    _id: Id<"snippets">;
    name: string;
    title: string;
    description: string;
    files: SnippetFile[];
    dependencies: string[];
    devDependencies?: string[];
    registryDependencies: string[];
    tags?: string[];
    previewMediaUrl?: string;
    previewMediaType?: "image" | "video";
  }) => void;
}

// Helper functions
function getLanguage(path: string): SnippetFile["language"] {
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  return "typescript";
}

function getFileType(path: string): SnippetFile["type"] {
  if (path.endsWith(".css")) return "style";
  if (path.includes("/hooks/") || path.startsWith("hooks/")) return "hook";
  if (path.includes("/lib/") || path.startsWith("lib/")) return "util";
  return "component";
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function createDefaultFiles(): SnippetFile[] {
  return [
    {
      id: generateId(),
      path: "globals.css",
      content: DEFAULT_GLOBALS_CSS,
      type: "style",
      language: "css",
    },
  ];
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
  devDependencies: [],
  registryDependencies: [],
  tags: [],
  previewMediaUrl: null,
  previewMediaType: null,
  pendingMediaFile: null,
  pendingMediaLocalUrl: null,
  isDirty: false,
  validationDialogOpen: false,
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
      files: state.files.map((f) => (f.id === fileId ? { ...f, content } : f)),
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

    const newFile: SnippetFile = {
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
          ? (newFiles[0]?.id ?? null)
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
          : f,
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

  addDevDependency: (dep) =>
    set((state) => ({
      devDependencies: state.devDependencies.includes(dep)
        ? state.devDependencies
        : [...state.devDependencies, dep],
      isDirty: true,
    })),

  removeDevDependency: (dep) =>
    set((state) => ({
      devDependencies: state.devDependencies.filter((d) => d !== dep),
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

  addTag: (raw) =>
    set((state) => {
      const tag = normalizeTag(raw);
      if (!tag) return {};
      if (state.tags.includes(tag)) return {};
      if (state.tags.length >= MAX_TAGS_PER_SNIPPET) return {};
      return {
        tags: [...state.tags, tag],
        isDirty: true,
      };
    }),

  removeTag: (tag) =>
    set((state) => ({
      tags: state.tags.filter((t) => t !== tag),
      isDirty: true,
    })),

  setIsDirty: (dirty) => set({ isDirty: dirty }),

  setValidationDialogOpen: (open) => set({ validationDialogOpen: open }),

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
      };
    });
  },

  loadSnippet: (snippet) => {
    const activeFileId = snippet.files[0]?.id ?? null;
    set((state) => {
      // Cleanup blob URL
      if (state.pendingMediaLocalUrl) {
        URL.revokeObjectURL(state.pendingMediaLocalUrl);
      }
      return {
        convexId: snippet._id,
        name: snippet.name,
        title: snippet.title,
        description: snippet.description,
        files: snippet.files,
        activeFileId,
        dependencies: snippet.dependencies,
        devDependencies: snippet.devDependencies ?? [],
        registryDependencies: snippet.registryDependencies,
        tags: snippet.tags ?? [],
        previewMediaUrl: snippet.previewMediaUrl ?? null,
        previewMediaType: snippet.previewMediaType ?? null,
        pendingMediaFile: null,
        pendingMediaLocalUrl: null,
        isDirty: false,
        validationDialogOpen: false,
      };
    });
  },
}));

// Utility to get computed state
export const useIsNewSnippet = () =>
  useEditorStore((state) => state.convexId === null);

// Utility to build folder tree from flat file list
export interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  file?: SnippetFile;
}

export function buildFolderTree(files: SnippetFile[]): FolderNode[] {
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
