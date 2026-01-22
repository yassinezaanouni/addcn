"use client";

import { useMemo, useId } from "react";
import { LiveProvider, LivePreview, LiveError } from "react-live";
import { useEditorStore } from "@/stores/editor-store";
import type { ComponentFile } from "@/types/component";

/**
 * Extract the component name from code
 */
function getComponentName(code: string): string {
  const functionMatch = code.match(/(?:function|const)\s+(\w+)\s*(?:=|\()/);
  return functionMatch?.[1] || "Component";
}

/**
 * Parse imports from code and return import info
 */
function parseImports(code: string): Array<{ names: string[]; path: string }> {
  const imports: Array<{ names: string[]; path: string }> = [];
  const importRegex = /^import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+["']([^"']+)["'];?\s*$/gm;

  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const namedImports = match[1];
    const defaultImport = match[2];
    const importPath = match[3];

    const names: string[] = [];
    if (namedImports) {
      names.push(...namedImports.split(",").map((n) => n.trim().split(" as ").pop()!.trim()));
    }
    if (defaultImport) {
      names.push(defaultImport);
    }

    imports.push({ names, path: importPath });
  }

  return imports;
}

/**
 * Resolve an import path to a file in the project
 */
function resolveImport(importPath: string, files: ComponentFile[]): ComponentFile | null {
  // Handle relative imports like "./utils" or "../hooks/useButton"
  const cleanPath = importPath.replace(/^\.\//, "").replace(/^\.\.\//, "");

  // Try exact match first
  let file = files.find((f) => f.path === cleanPath || f.path === `${cleanPath}.ts` || f.path === `${cleanPath}.tsx`);

  if (file) return file;

  // Try matching by filename
  const fileName = cleanPath.split("/").pop();
  file = files.find((f) => {
    const fName = f.path.split("/").pop();
    return fName === fileName || fName === `${fileName}.ts` || fName === `${fileName}.tsx`;
  });

  return file || null;
}

/**
 * Extract exports from a file's code
 */
function extractExports(code: string): Record<string, string> {
  const exports: Record<string, string> = {};

  // Match: export function name() or export const name =
  const exportRegex = /export\s+(?:function|const)\s+(\w+)/g;
  let match;
  while ((match = exportRegex.exec(code)) !== null) {
    exports[match[1]] = match[1];
  }

  // Match: export default function name() or export default name
  const defaultMatch = code.match(/export\s+default\s+(?:function\s+)?(\w+)/);
  if (defaultMatch) {
    exports["default"] = defaultMatch[1];
  }

  return exports;
}

/**
 * Build scope object from imported files
 */
function buildScope(mainCode: string, files: ComponentFile[]): Record<string, unknown> {
  const scope: Record<string, unknown> = {};
  const imports = parseImports(mainCode);

  for (const imp of imports) {
    // Skip external package imports
    if (!imp.path.startsWith(".") && !imp.path.startsWith("@/")) continue;

    const file = resolveImport(imp.path, files);
    if (!file) continue;

    // For utility files, try to evaluate and extract exports
    try {
      // Remove imports and exports, wrap in function
      let utilCode = file.content
        .replace(/^import\s+.*?;?\s*$/gm, "")
        .replace(/export\s+default\s+/, "const __default__ = ")
        .replace(/export\s+/g, "");

      // Create a simple evaluation context
      const exports = extractExports(file.content);

      // For each named import, try to find a matching export
      for (const name of imp.names) {
        if (exports[name]) {
          // The export exists, but we can't easily evaluate it
          // For now, just skip - complex evaluation would need a proper bundler
        }
      }
    } catch {
      // Evaluation failed, skip this import
    }
  }

  return scope;
}

/**
 * Transform code for react-live
 */
function transformCode(code: string): string {
  // Remove imports (react-live doesn't support them natively)
  let transformed = code.replace(/^import\s+.*?;?\s*$/gm, "");

  // Remove export default
  transformed = transformed.replace(/export\s+default\s+/, "");

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

  // Build scope from imported files
  const scope = useMemo(() => {
    if (!mainFile) return {};
    return buildScope(mainFile.content, files);
  }, [mainFile, files]);

  const transformedCode = useMemo(() => {
    if (!mainFile) return "";
    return transformCode(mainFile.content);
  }, [mainFile]);

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
