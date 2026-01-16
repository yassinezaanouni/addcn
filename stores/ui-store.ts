import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark" | "system";

interface UIState {
  theme: Theme;
  sidebarCollapsed: boolean;
  previewVisible: boolean;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  togglePreview: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "system",
      sidebarCollapsed: false,
      previewVisible: true,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      togglePreview: () =>
        set((state) => ({ previewVisible: !state.previewVisible })),
    }),
    { name: "addcn-ui" }
  )
);
