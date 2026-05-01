import { promises as fs } from "fs";
import path from "path";
import type { SavedSnippet } from "@/types/snippet";

const DATA_DIR = path.join(process.cwd(), ".addcn-data");
const SNIPPETS_FILE = path.join(DATA_DIR, "snippets.json");

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory exists
  }
}

export async function getServerSnippets(): Promise<SavedSnippet[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(SNIPPETS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveServerSnippet(
  snippet: SavedSnippet,
): Promise<void> {
  await ensureDataDir();
  const snippets = await getServerSnippets();

  const existingIndex = snippets.findIndex((s) => s.id === snippet.id);
  if (existingIndex >= 0) {
    snippets[existingIndex] = snippet;
  } else {
    snippets.push(snippet);
  }

  await fs.writeFile(SNIPPETS_FILE, JSON.stringify(snippets, null, 2));
}

export async function getServerSnippetByName(
  name: string,
): Promise<SavedSnippet | undefined> {
  const snippets = await getServerSnippets();
  return snippets.find((s) => s.name === name);
}

export async function getServerSnippetById(
  id: string,
): Promise<SavedSnippet | undefined> {
  const snippets = await getServerSnippets();
  return snippets.find((s) => s.id === id);
}

export async function deleteServerSnippet(id: string): Promise<void> {
  await ensureDataDir();
  const snippets = await getServerSnippets();
  const filtered = snippets.filter((s) => s.id !== id);
  await fs.writeFile(SNIPPETS_FILE, JSON.stringify(filtered, null, 2));
}
