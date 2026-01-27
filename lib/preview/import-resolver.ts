import type { ComponentFile } from "@/types/component";

interface ParsedImport {
  names: string[];
  defaultName?: string;
  path: string;
}

/**
 * Parse imports from code and extract import names and paths
 */
export function parseImports(code: string): ParsedImport[] {
  const imports: ParsedImport[] = [];
  const lines = code.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("import ")) continue;

    const pathMatch = trimmed.match(/from\s+["']([^"']+)["']/);
    if (!pathMatch) continue;
    const importPath = pathMatch[1];

    const namedMatch = trimmed.match(/\{([^}]+)\}/);
    const names: string[] = [];
    if (namedMatch) {
      names.push(
        ...namedMatch[1]
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean)
          .map((n) => n.split(" as ").pop()!.trim())
      );
    }

    const defaultMatch = trimmed.match(/import\s+(\w+)\s+from/);
    const defaultName = defaultMatch?.[1];
    const mixedMatch = trimmed.match(/import\s+(\w+)\s*,\s*\{/);
    const mixedDefault = mixedMatch?.[1];

    imports.push({
      names,
      defaultName: mixedDefault || defaultName,
      path: importPath,
    });
  }

  return imports;
}

/**
 * Resolve a relative import path based on the current file's location
 */
export function resolveRelativePath(importPath: string, currentFilePath: string): string {
  const currentDir = currentFilePath.split("/").slice(0, -1).join("/");

  if (importPath.startsWith("./")) {
    return currentDir ? `${currentDir}/${importPath.slice(2)}` : importPath.slice(2);
  } else if (importPath.startsWith("../")) {
    const parts = currentDir.split("/");
    let path = importPath;
    while (path.startsWith("../")) {
      parts.pop();
      path = path.slice(3);
    }
    return parts.length > 0 ? `${parts.join("/")}/${path}` : path;
  }

  return importPath.replace(/^@\//, "");
}

/**
 * Find a file matching the import path
 */
export function resolveFile(
  importPath: string,
  files: ComponentFile[],
  currentFilePath?: string
): ComponentFile | null {
  const resolvedPath = currentFilePath
    ? resolveRelativePath(importPath, currentFilePath)
    : importPath.replace(/^\.\.?\//, "").replace(/^@\//, "");

  let file = files.find((f) => f.path === resolvedPath);
  if (file) return file;

  for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
    file = files.find((f) => f.path === resolvedPath + ext);
    if (file) return file;
  }

  file = files.find(
    (f) => f.path === `${resolvedPath}/index.ts` || f.path === `${resolvedPath}/index.tsx`
  );
  if (file) return file;

  return null;
}

/**
 * Get all files from a folder
 */
export function getFilesFromFolder(folderName: string, files: ComponentFile[]): ComponentFile[] {
  const folder = folderName.replace(/^\.\.?\//, "").replace(/^@\//, "");
  return files.filter((f) => f.path.startsWith(folder + "/"));
}

/**
 * Collect all component files that need to be bundled (main + dependencies)
 */
export function collectAllFiles(
  mainFile: ComponentFile,
  allFiles: ComponentFile[],
  collected: Map<string, ComponentFile> = new Map()
): Map<string, ComponentFile> {
  if (collected.has(mainFile.path)) return collected;
  collected.set(mainFile.path, mainFile);

  const imports = parseImports(mainFile.content);

  for (const imp of imports) {
    if (imp.path === "react" || imp.path.startsWith("react/")) continue;
    if (!imp.path.startsWith(".") && !imp.path.startsWith("@/")) continue;

    // Try to resolve single file
    const file = resolveFile(imp.path, allFiles, mainFile.path);
    if (file) {
      collectAllFiles(file, allFiles, collected);
    }

    // Also check folder imports
    const resolvedPath = resolveRelativePath(imp.path, mainFile.path);
    const folderFiles = getFilesFromFolder(resolvedPath, allFiles);
    for (const f of folderFiles) {
      collectAllFiles(f, allFiles, collected);
    }
  }

  return collected;
}
