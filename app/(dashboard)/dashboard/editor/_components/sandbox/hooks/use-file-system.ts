"use client";

import { useState, useCallback, useRef } from "react";
import {
  listFiles,
  readFile,
  writeFile,
  createDir,
  deleteEntry as deleteEntryApi,
  FileEntry as ApiFileEntry,
} from "../api";

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
  isExpanded?: boolean;
  isFromRegistry?: boolean;
}

export interface UseFileSystemOptions {
  sandboxId: string;
  rootPath?: string;
}

export interface UseFileSystemReturn {
  files: FileEntry[];
  isTreeLoading: boolean;
  isFileLoading: boolean;
  advancedView: boolean;
  setAdvancedView: (value: boolean) => void;
  loadRootDirectory: () => Promise<void>;
  loadDirectoryContents: (dirPath: string) => Promise<void>;
  loadFileContent: (filePath: string) => Promise<string>;
  saveFileContent: (filePath: string, content: string) => Promise<void>;
  createFile: (filePath: string) => Promise<void>;
  createDirectory: (dirPath: string) => Promise<void>;
  deleteEntry: (entryPath: string) => Promise<void>;
  renameEntry: (oldPath: string, newName: string) => Promise<void>;
  toggleDirectory: (dirPath: string) => void;
}

// Default root path for CodeSandbox projects
const DEFAULT_ROOT = "/project";

// Hidden files/directories to filter out
const HIDDEN_ENTRIES = new Set([
  "node_modules",
  ".git",
  ".cache",
  ".next",
  "dist",
  "build",
  ".turbo",
  ".vercel",
  ".pnpm-store",
]);

// Build a tree structure from flat file list
function buildFileTree(
  entries: ApiFileEntry[],
  advancedView: boolean
): FileEntry[] {
  // Filter hidden entries unless in advanced view
  const filtered = advancedView
    ? entries
    : entries.filter(
        (e) => !HIDDEN_ENTRIES.has(e.name) && !e.name.startsWith(".")
      );

  // Sort: directories first, then alphabetically
  const sorted = [...filtered].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return sorted.map((entry) => ({
    name: entry.name,
    path: entry.path,
    isDirectory: entry.isDirectory,
    children: entry.isDirectory ? undefined : undefined,
    isExpanded: false,
  }));
}

export function useFileSystem({
  sandboxId,
  rootPath = DEFAULT_ROOT,
}: UseFileSystemOptions): UseFileSystemReturn {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isTreeLoading, setIsTreeLoading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [advancedView, setAdvancedView] = useState(false);

  // Cache loaded directories to avoid repeated API calls
  const loadedDirs = useRef<Set<string>>(new Set());

  // Use ref for advancedView to avoid recreating callbacks
  const advancedViewRef = useRef(advancedView);
  advancedViewRef.current = advancedView;

  // Load root directory - stable function that doesn't change with advancedView
  const loadRootDirectory = useCallback(async () => {
    setIsTreeLoading(true);
    loadedDirs.current.clear();

    try {
      const result = await listFiles(sandboxId, rootPath);
      const tree = buildFileTree(result.files, advancedViewRef.current);
      setFiles(tree);
      loadedDirs.current.add(rootPath);
    } catch (error) {
      console.error("Failed to load root directory:", error);
      setFiles([]);
    } finally {
      setIsTreeLoading(false);
    }
  }, [sandboxId, rootPath]);

  // Load contents of a specific directory
  const loadDirectoryContents = useCallback(
    async (dirPath: string) => {
      if (loadedDirs.current.has(dirPath)) {
        return; // Already loaded
      }

      try {
        const result = await listFiles(sandboxId, dirPath);
        const children = buildFileTree(result.files, advancedViewRef.current);

        setFiles((prev) => {
          // Deep clone and update the tree
          const updateTree = (entries: FileEntry[]): FileEntry[] => {
            return entries.map((entry) => {
              if (entry.path === dirPath) {
                return { ...entry, children, isExpanded: true };
              }
              if (entry.children) {
                return { ...entry, children: updateTree(entry.children) };
              }
              return entry;
            });
          };
          return updateTree(prev);
        });

        loadedDirs.current.add(dirPath);
      } catch (error) {
        console.error("Failed to load directory:", error);
      }
    },
    [sandboxId]
  );

  // Toggle directory expanded state
  const toggleDirectory = useCallback(
    (dirPath: string) => {
      setFiles((prev) => {
        const toggleInTree = (entries: FileEntry[]): FileEntry[] => {
          return entries.map((entry) => {
            if (entry.path === dirPath) {
              const newExpanded = !entry.isExpanded;
              // Load contents if expanding and not loaded yet
              if (newExpanded && !loadedDirs.current.has(dirPath)) {
                loadDirectoryContents(dirPath);
              }
              return { ...entry, isExpanded: newExpanded };
            }
            if (entry.children) {
              return { ...entry, children: toggleInTree(entry.children) };
            }
            return entry;
          });
        };
        return toggleInTree(prev);
      });
    },
    [loadDirectoryContents]
  );

  // Load file content
  const loadFileContent = useCallback(
    async (filePath: string): Promise<string> => {
      setIsFileLoading(true);
      try {
        const result = await readFile(sandboxId, filePath);
        return result.content;
      } finally {
        setIsFileLoading(false);
      }
    },
    [sandboxId]
  );

  // Save file content
  const saveFileContent = useCallback(
    async (filePath: string, content: string): Promise<void> => {
      await writeFile(sandboxId, filePath, content);
    },
    [sandboxId]
  );

  // Create a new file
  const createFile = useCallback(
    async (filePath: string): Promise<void> => {
      await writeFile(sandboxId, filePath, "");

      // Refresh the parent directory
      const parentPath = filePath.substring(0, filePath.lastIndexOf("/")) || rootPath;
      loadedDirs.current.delete(parentPath);
      await loadDirectoryContents(parentPath);
    },
    [sandboxId, rootPath, loadDirectoryContents]
  );

  // Create a new directory
  const createDirectory = useCallback(
    async (dirPath: string): Promise<void> => {
      await createDir(sandboxId, dirPath);

      // Refresh the parent directory
      const parentPath = dirPath.substring(0, dirPath.lastIndexOf("/")) || rootPath;
      loadedDirs.current.delete(parentPath);
      await loadDirectoryContents(parentPath);
    },
    [sandboxId, rootPath, loadDirectoryContents]
  );

  // Delete a file or directory
  const deleteEntry = useCallback(
    async (entryPath: string): Promise<void> => {
      await deleteEntryApi(sandboxId, entryPath);

      // Remove from tree
      setFiles((prev) => {
        const removeFromTree = (entries: FileEntry[]): FileEntry[] => {
          return entries
            .filter((entry) => entry.path !== entryPath)
            .map((entry) => ({
              ...entry,
              children: entry.children
                ? removeFromTree(entry.children)
                : undefined,
            }));
        };
        return removeFromTree(prev);
      });
    },
    [sandboxId]
  );

  // Rename a file or directory
  const renameEntry = useCallback(
    async (oldPath: string, newName: string): Promise<void> => {
      // Read the content if it's a file
      const parentPath = oldPath.substring(0, oldPath.lastIndexOf("/"));
      const newPath = `${parentPath}/${newName}`;

      // For files, we need to copy content and delete old
      // For directories, this is more complex - skip for now
      // TODO: Implement proper rename in CodeSandbox SDK if available

      try {
        const content = await readFile(sandboxId, oldPath);
        await writeFile(sandboxId, newPath, content.content);
        await deleteEntryApi(sandboxId, oldPath);

        // Refresh parent directory
        loadedDirs.current.delete(parentPath || rootPath);
        await loadDirectoryContents(parentPath || rootPath);
      } catch (error) {
        console.error("Failed to rename:", error);
        throw error;
      }
    },
    [sandboxId, rootPath, loadDirectoryContents]
  );

  return {
    files,
    isTreeLoading,
    isFileLoading,
    advancedView,
    setAdvancedView,
    loadRootDirectory,
    loadDirectoryContents,
    loadFileContent,
    saveFileContent,
    createFile,
    createDirectory,
    deleteEntry,
    renameEntry,
    toggleDirectory,
  };
}
