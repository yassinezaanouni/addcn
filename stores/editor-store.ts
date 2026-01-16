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
  setMetadata: (data: Partial<Omit<EditorState, "files" | "setMetadata" | "setActiveFile" | "updateFileContent" | "addFile" | "removeFile" | "renameFile" | "reset" | "loadComponent">>) => void;
  setActiveFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  addFile: (file?: Partial<ComponentFile>) => void;
  removeFile: (id: string) => void;
  renameFile: (id: string, name: string) => void;
  reset: () => void;
  loadComponent: (component: SavedComponent) => void;
}

const createDefaultFile = (): ComponentFile => ({
  id: uuid(),
  name: "component.tsx",
  content: DEFAULT_FILE_CONTENT,
  type: "component",
  language: "typescript",
});

const initialState = {
  componentId: null,
  name: "",
  title: "",
  description: "",
  files: [createDefaultFile()],
  activeFileId: null,
  dependencies: [],
  registryDependencies: [],
  isDirty: false,
};

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialState,
  activeFileId: initialState.files[0].id,

  setMetadata: (data) =>
    set((state) => ({ ...state, ...data, isDirty: true })),

  setActiveFile: (id) => set({ activeFileId: id }),

  updateFileContent: (id, content) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, content } : f)),
      isDirty: true,
    })),

  addFile: (file) => {
    const newFile: ComponentFile = {
      id: uuid(),
      name: file?.name || "new-file.tsx",
      content: file?.content || "",
      type: file?.type || "component",
      language: file?.language || "typescript",
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

  renameFile: (id, name) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, name } : f)),
      isDirty: true,
    })),

  reset: () => {
    const defaultFile = createDefaultFile();
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
