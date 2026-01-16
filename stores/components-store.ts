import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SavedComponent } from "@/types/component";

interface ComponentsState {
  components: SavedComponent[];
  addComponent: (component: SavedComponent) => void;
  updateComponent: (id: string, data: Partial<SavedComponent>) => void;
  deleteComponent: (id: string) => void;
  getComponent: (id: string) => SavedComponent | undefined;
}

export const useComponentsStore = create<ComponentsState>()(
  persist(
    (set, get) => ({
      components: [],
      addComponent: (component) =>
        set((state) => ({ components: [...state.components, component] })),
      updateComponent: (id, data) =>
        set((state) => ({
          components: state.components.map((c) =>
            c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
          ),
        })),
      deleteComponent: (id) =>
        set((state) => ({
          components: state.components.filter((c) => c.id !== id),
        })),
      getComponent: (id) => get().components.find((c) => c.id === id),
    }),
    { name: "addcn-components" }
  )
);
