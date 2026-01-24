import { create } from "zustand";
import { persist } from "zustand/middleware";

type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

interface PreferencesState {
  packageManager: PackageManager;
  setPackageManager: (pm: PackageManager) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      packageManager: "pnpm",
      setPackageManager: (pm) => set({ packageManager: pm }),
    }),
    {
      name: "addcn-preferences",
    }
  )
);
