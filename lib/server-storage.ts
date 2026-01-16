import { promises as fs } from "fs";
import path from "path";
import type { SavedComponent } from "@/types/component";

const DATA_DIR = path.join(process.cwd(), ".addcn-data");
const COMPONENTS_FILE = path.join(DATA_DIR, "components.json");

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory exists
  }
}

export async function getServerComponents(): Promise<SavedComponent[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(COMPONENTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveServerComponent(component: SavedComponent): Promise<void> {
  await ensureDataDir();
  const components = await getServerComponents();

  const existingIndex = components.findIndex((c) => c.id === component.id);
  if (existingIndex >= 0) {
    components[existingIndex] = component;
  } else {
    components.push(component);
  }

  await fs.writeFile(COMPONENTS_FILE, JSON.stringify(components, null, 2));
}

export async function getServerComponentByName(name: string): Promise<SavedComponent | undefined> {
  const components = await getServerComponents();
  return components.find((c) => c.name === name);
}

export async function getServerComponentById(id: string): Promise<SavedComponent | undefined> {
  const components = await getServerComponents();
  return components.find((c) => c.id === id);
}

export async function deleteServerComponent(id: string): Promise<void> {
  await ensureDataDir();
  const components = await getServerComponents();
  const filtered = components.filter((c) => c.id !== id);
  await fs.writeFile(COMPONENTS_FILE, JSON.stringify(filtered, null, 2));
}
