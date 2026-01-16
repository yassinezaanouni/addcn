"use client";

import { useMemo } from "react";
import { LiveProvider, LivePreview, LiveError } from "react-live";
import { useEditorStore } from "@/stores/editor-store";

// Scope of available components/utilities for the preview
const scope = {
  // React is automatically available in react-live
};

export function PreviewPanel() {
  const { files } = useEditorStore();

  // Find the main component file
  const mainFile = files.find((f) => f.path.endsWith(".tsx")) || files[0];

  // Transform the code for react-live
  const transformedCode = useMemo(() => {
    if (!mainFile) return "";

    let code = mainFile.content;

    // Remove import statements (react-live doesn't support them)
    code = code.replace(/^import\s+.*?;?\s*$/gm, "");

    // Remove export default and export statements, capture the component
    code = code.replace(/export\s+default\s+/, "");
    code = code.replace(/^export\s+/gm, "");

    // If code has a function component, wrap it to render
    // Check if it's a function declaration
    const functionMatch = code.match(/function\s+(\w+)/);
    const constMatch = code.match(/const\s+(\w+)\s*=/);

    const componentName = functionMatch?.[1] || constMatch?.[1];

    if (componentName) {
      // Add render call at the end
      code = `${code}\n\nrender(<${componentName} />);`;
    }

    return code.trim();
  }, [mainFile]);

  if (files.length === 0 || !mainFile) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">No files to preview</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">Preview</span>
      </div>
      <div className="flex-1 overflow-auto bg-white p-4 dark:bg-zinc-950">
        <LiveProvider code={transformedCode} scope={scope} noInline>
          <LiveError className="mb-4 rounded-md bg-red-50 p-3 font-mono text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400" />
          <LivePreview className="preview-content" />
        </LiveProvider>
      </div>
    </div>
  );
}
