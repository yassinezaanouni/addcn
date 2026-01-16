import type { SavedComponent } from "@/types/component";

const STORAGE_KEY = "addcn-components";

export function getStoredComponents(): SavedComponent[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return parsed.state?.components || [];
  } catch {
    return [];
  }
}

export function getStoredComponent(id: string): SavedComponent | undefined {
  const components = getStoredComponents();
  return components.find((c) => c.id === id);
}

export function getStoredComponentByName(name: string): SavedComponent | undefined {
  const components = getStoredComponents();
  return components.find((c) => c.name === name);
}
