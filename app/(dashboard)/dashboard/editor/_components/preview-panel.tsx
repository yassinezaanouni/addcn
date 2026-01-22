"use client";

import React, {
  useMemo,
  useId,
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
  useReducer,
  useMemo as useMemoPrimitive,
  useLayoutEffect,
  useImperativeHandle,
  useDebugValue,
  useDeferredValue,
  useTransition,
  useSyncExternalStore,
  useInsertionEffect,
} from "react";
import { LiveProvider, LivePreview, LiveError } from "react-live";
import { useEditorStore } from "@/stores/editor-store";
import type { ComponentFile } from "@/types/component";

// React scope for react-live - provides React and all hooks
const reactScope: Record<string, unknown> = {
  React,
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
  useReducer,
  useMemo: useMemoPrimitive,
  useLayoutEffect,
  useImperativeHandle,
  useDebugValue,
  useDeferredValue,
  useTransition,
  useSyncExternalStore,
  useInsertionEffect,
};

/**
 * Parse imports from code and extract import names and paths
 */
function parseImports(code: string): Array<{ names: string[]; defaultName?: string; path: string }> {
  const imports: Array<{ names: string[]; defaultName?: string; path: string }> = [];

  // Match various import patterns
  const lines = code.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("import ")) continue;

    // Extract the path
    const pathMatch = trimmed.match(/from\s+["']([^"']+)["']/);
    if (!pathMatch) continue;
    const importPath = pathMatch[1];

    // Extract named imports { foo, bar }
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

    // Extract default import
    const defaultMatch = trimmed.match(/import\s+(\w+)\s+from/);
    const defaultName = defaultMatch?.[1];

    // Also check for: import DefaultName, { named } from
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
function resolveRelativePath(importPath: string, currentFilePath: string): string {
  // Get the directory of the current file
  const currentDir = currentFilePath.split("/").slice(0, -1).join("/");

  // Handle relative paths
  if (importPath.startsWith("./")) {
    // Same directory: ./test -> currentDir/test
    return currentDir ? `${currentDir}/${importPath.slice(2)}` : importPath.slice(2);
  } else if (importPath.startsWith("../")) {
    // Go up directories
    const parts = currentDir.split("/");
    let path = importPath;
    while (path.startsWith("../")) {
      parts.pop();
      path = path.slice(3);
    }
    return parts.length > 0 ? `${parts.join("/")}/${path}` : path;
  }

  // Not a relative path
  return importPath.replace(/^@\//, "");
}

/**
 * Find a file matching the import path
 */
function resolveFile(importPath: string, files: ComponentFile[], currentFilePath?: string): ComponentFile | null {
  // Resolve relative path if we have context
  const resolvedPath = currentFilePath
    ? resolveRelativePath(importPath, currentFilePath)
    : importPath.replace(/^\.\.?\//, "").replace(/^@\//, "");

  console.log("[Preview] Resolving import:", importPath, "->", resolvedPath);

  // Try exact match
  let file = files.find((f) => f.path === resolvedPath);
  if (file) return file;

  // Try with extensions
  for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
    file = files.find((f) => f.path === resolvedPath + ext);
    if (file) return file;
  }

  // Try matching by filename
  const fileName = resolvedPath.split("/").pop() || resolvedPath;

  // Check if it's a folder import (index file)
  file = files.find((f) =>
    f.path === `${resolvedPath}/index.ts` ||
    f.path === `${resolvedPath}/index.tsx`
  );
  if (file) return file;

  // Try matching by name pattern in same directory
  const dir = resolvedPath.split("/").slice(0, -1).join("/");
  if (dir) {
    file = files.find((f) => {
      const fDir = f.path.split("/").slice(0, -1).join("/");
      const fName = f.path.split("/").pop()?.replace(/\.(ts|tsx|js|jsx)$/, "");
      return fDir === dir && fName === fileName;
    });
    if (file) return file;
  }

  // For imports like '../../hooks', look in hooks folder
  if (fileName === "hooks" || fileName === "lib" || fileName === "utils") {
    return null;
  }

  return null;
}

/**
 * Get all files from a folder (for folder imports like './hooks')
 */
function getFilesFromFolder(folderName: string, files: ComponentFile[]): ComponentFile[] {
  const folder = folderName.replace(/^\.\.?\//, "").replace(/^@\//, "");
  return files.filter((f) => f.path.startsWith(folder + "/") || f.path.startsWith(`${folder}/`));
}

/**
 * Strip TypeScript type annotations from code for runtime evaluation
 */
function stripTypeScript(code: string): string {
  // Remove type imports
  code = code.replace(/import\s+type\s+.*?;?\s*$/gm, "");

  // Remove type annotations from function parameters: (ref: Type) -> (ref)
  code = code.replace(/:\s*[A-Za-z<>[\]|&\s.]+(?=[,)])/g, "");

  // Remove return type annotations: ): Type { -> ) {
  code = code.replace(/\):\s*[A-Za-z<>[\]|&\s.]+\s*(?=[{=])/g, ") ");

  // Remove generic type parameters: <T> or <T, U>
  code = code.replace(/<[A-Za-z,\s]+>(?=\s*\()/g, "");

  // Remove type assertions: as Type
  code = code.replace(/\s+as\s+[A-Za-z<>[\]|&\s.]+/g, "");

  // Remove interface/type declarations
  code = code.replace(/^(export\s+)?(interface|type)\s+\w+[\s\S]*?(?=\n\n|\nexport|\nfunction|\nconst|$)/gm, "");

  // Remove React.FC type annotations
  code = code.replace(/:\s*React\.\w+<[^>]*>/g, "");

  // Clean up any leftover type syntax
  code = code.replace(/\|\s*null/g, "");
  code = code.replace(/\|\s*undefined/g, "");

  return code;
}

/**
 * Evaluate a file's code and extract its exports
 */
function evaluateFile(file: ComponentFile, scope: Record<string, unknown>): Record<string, unknown> {
  const exports: Record<string, unknown> = {};

  try {
    // Transform the code for evaluation
    let code = file.content;

    // Remove import statements
    code = code.replace(/^import\s+.*?;?\s*$/gm, "");

    // Track what's being exported before stripping types
    const exportMatches = [...code.matchAll(/export\s+(?:const|function|class)\s+(\w+)/g)];
    const defaultMatch = code.match(/export\s+default\s+(?:function\s+)?(\w+)/);

    // Strip TypeScript syntax
    code = stripTypeScript(code);

    // Remove export keywords
    code = code.replace(/export\s+default\s+/g, "const __default__ = ");
    code = code.replace(/export\s+/g, "");

    // Create function arguments from scope
    const scopeKeys = Object.keys(scope);
    const scopeValues = Object.values(scope);

    // Build the return object
    const exportNames = exportMatches.map((m) => m[1]).filter(Boolean);
    const returnObj = exportNames.length > 0 ? exportNames.join(", ") : "";
    const defaultReturn = defaultMatch ? (returnObj ? `, default: __default__` : `default: __default__`) : "";

    // Build the evaluation function
    const evalCode = `
      "use strict";
      ${code}
      return { ${returnObj}${defaultReturn} };
    `;

    console.log("[Preview] Evaluating code:", evalCode.substring(0, 500));

    // Create and execute the function
    const fn = new Function(...scopeKeys, evalCode);
    const result = fn(...scopeValues);

    Object.assign(exports, result);
  } catch (error) {
    console.warn(`[Preview] Failed to evaluate file ${file.path}:`, error);
  }

  return exports;
}

/**
 * Build scope from local imports
 */
function buildLocalScope(
  mainCode: string,
  files: ComponentFile[],
  mainFilePath: string
): Record<string, unknown> {
  const localScope: Record<string, unknown> = {};
  const imports = parseImports(mainCode);

  // Debug: log available files
  console.log("[Preview] Main file:", mainFilePath);
  console.log("[Preview] Available files:", files.map((f) => f.path));
  console.log("[Preview] Parsed imports:", imports);

  for (const imp of imports) {
    // Skip react imports (already in scope)
    if (imp.path === "react") continue;

    // Skip external packages
    if (!imp.path.startsWith(".") && !imp.path.startsWith("@/")) continue;

    // Resolve the path relative to the main file
    const resolvedPath = resolveRelativePath(imp.path, mainFilePath);
    console.log("[Preview] Import path:", imp.path, "-> resolved:", resolvedPath);

    // Check if it's a folder import
    const folderFiles = getFilesFromFolder(resolvedPath, files);
    console.log("[Preview] Found folder files:", folderFiles.map((f) => f.path));

    if (folderFiles.length > 0) {
      // Evaluate all files in the folder
      for (const file of folderFiles) {
        console.log("[Preview] Evaluating file:", file.path);
        const fileExports = evaluateFile(file, { ...reactScope, ...localScope });
        console.log("[Preview] Exports from", file.path, ":", Object.keys(fileExports));
        Object.assign(localScope, fileExports);
      }
    } else {
      // Try to resolve single file
      const file = resolveFile(imp.path, files, mainFilePath);
      console.log("[Preview] Resolved single file:", file?.path);
      if (file) {
        const fileExports = evaluateFile(file, { ...reactScope, ...localScope });
        console.log("[Preview] Exports:", Object.keys(fileExports));

        // Add requested imports to scope
        for (const name of imp.names) {
          if (fileExports[name]) {
            localScope[name] = fileExports[name];
          }
        }
        if (imp.defaultName && fileExports.default) {
          localScope[imp.defaultName] = fileExports.default;
        }
      }
    }
  }

  console.log("[Preview] Final local scope:", Object.keys(localScope));
  return localScope;
}

/**
 * Extract the component name from code
 */
function getComponentName(code: string): string {
  const functionMatch = code.match(/(?:function|const)\s+(\w+)\s*(?:=|\()/);
  return functionMatch?.[1] || "Component";
}

/**
 * Check if code contains JSX
 */
function containsJsx(code: string): boolean {
  // Simple check for JSX patterns
  return /<[A-Za-z][^>]*>/.test(code) || /<\/[A-Za-z]+>/.test(code);
}

/**
 * Get imported component files that need to be inlined (contain JSX)
 */
function getInlineableImports(
  mainCode: string,
  files: ComponentFile[],
  mainFilePath: string
): Array<{ name: string; code: string }> {
  const inlineable: Array<{ name: string; code: string }> = [];
  const imports = parseImports(mainCode);

  for (const imp of imports) {
    if (imp.path === "react") continue;
    if (!imp.path.startsWith(".") && !imp.path.startsWith("@/")) continue;

    const file = resolveFile(imp.path, files, mainFilePath);
    if (file && containsJsx(file.content)) {
      // This is a component file with JSX - needs to be inlined
      let code = file.content;
      // Remove imports
      code = code.replace(/^import\s+.*?;?\s*$/gm, "");
      // Convert export default to const
      const defaultMatch = code.match(/export\s+default\s+function\s+(\w+)/);
      if (defaultMatch) {
        code = code.replace(/export\s+default\s+function/, "function");
        inlineable.push({ name: defaultMatch[1], code });
      } else {
        // Handle: export default Component or const Component = ...; export default Component
        const exportDefaultMatch = code.match(/export\s+default\s+(\w+)/);
        if (exportDefaultMatch && imp.defaultName) {
          code = code.replace(/export\s+default\s+\w+;?/, "");
          code = code.replace(/export\s+/g, "");
          inlineable.push({ name: imp.defaultName, code });
        }
      }
    }
  }

  return inlineable;
}

/**
 * Transform code for react-live
 */
function transformCode(code: string, inlineComponents: Array<{ name: string; code: string }>): string {
  // Remove imports (react-live doesn't support them natively)
  let transformed = code.replace(/^import\s+.*?;?\s*$/gm, "");

  // Remove export default
  transformed = transformed.replace(/export\s+default\s+/, "");

  // Prepend inlined components
  const inlinedCode = inlineComponents.map((c) => c.code).join("\n\n");
  if (inlinedCode) {
    transformed = `${inlinedCode}\n\n${transformed}`;
  }

  // Get component name and wrap with render call
  const componentName = getComponentName(code);
  transformed = `${transformed}\n\nrender(<${componentName} />);`;

  return transformed;
}

export function PreviewPanel() {
  const files = useEditorStore((state) => state.files);
  const styleId = useId();

  // Get the main component file (first .tsx file)
  const mainFile = useMemo(() => {
    return files.find(
      (f) => f.path.endsWith(".tsx") && f.type === "component"
    );
  }, [files]);

  // Collect all CSS from style files
  const combinedCss = useMemo(() => {
    return files
      .filter((f) => f.type === "style" || f.path.endsWith(".css"))
      .map((f) => f.content)
      .join("\n\n");
  }, [files]);

  // Build scope with React hooks + local imports (hooks, utils, etc.)
  const scope = useMemo(() => {
    if (!mainFile) return reactScope;
    const localScope = buildLocalScope(mainFile.content, files, mainFile.path);
    return { ...reactScope, ...localScope };
  }, [mainFile, files]);

  // Get components that need to be inlined (contain JSX)
  const inlineComponents = useMemo(() => {
    if (!mainFile) return [];
    return getInlineableImports(mainFile.content, files, mainFile.path);
  }, [mainFile, files]);

  const transformedCode = useMemo(() => {
    if (!mainFile) return "";
    return transformCode(mainFile.content, inlineComponents);
  }, [mainFile, inlineComponents]);

  if (!mainFile) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No component file to preview
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">Preview</span>
      </div>
      <div className="flex-1 overflow-auto bg-white p-4 dark:bg-zinc-950">
        {/* Inject CSS from all style files */}
        {combinedCss && (
          <style id={styleId} dangerouslySetInnerHTML={{ __html: combinedCss }} />
        )}
        <LiveProvider code={transformedCode} scope={scope} noInline>
          <LiveError className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400" />
          <LivePreview />
        </LiveProvider>
      </div>
    </div>
  );
}
