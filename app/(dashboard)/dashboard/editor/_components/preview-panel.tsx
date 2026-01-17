"use client";

import { useMemo } from "react";
import { LiveProvider, LivePreview, LiveError } from "react-live";
import { useEditorStore } from "@/stores/editor-store";

// Transform code for react-live
function transformCode(code: string): string {
  // Remove imports (react-live doesn't support them)
  let transformed = code.replace(/^import\s+.*?;?\s*$/gm, "");

  // Remove export default
  transformed = transformed.replace(/export\s+default\s+/, "");

  // Try to detect component name
  const functionMatch = transformed.match(
    /(?:function|const)\s+(\w+)\s*(?:=|\()/
  );
  const componentName = functionMatch?.[1] || "Component";

  // Wrap with render call
  transformed = `${transformed}\n\nrender(<${componentName} />);`;

  return transformed;
}

export function PreviewPanel() {
  const files = useEditorStore((state) => state.files);

  // Get the main component file (first .tsx file)
  const mainFile = useMemo(() => {
    return files.find(
      (f) => f.path.endsWith(".tsx") && f.type === "component"
    );
  }, [files]);

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
        <LiveProvider code={transformedCode} noInline>
          <LiveError className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400" />
          <LivePreview />
        </LiveProvider>
      </div>
    </div>
  );
}
