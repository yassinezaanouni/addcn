"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { useDropzone } from "react-dropzone";
import { motion, LayoutGroup } from "motion/react";
import { useEditorStore } from "@/stores/editor-store";
import { analyzeMultipleFiles } from "@/lib/import-analyzer";
import { validateFile, isImageType } from "@/lib/upload-constants";
import { processImageFile } from "@/lib/image-utils";
import type { ComponentFile } from "@/types/component";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  IconInfoCircle,
  IconAlertTriangle,
  IconX,
  IconUpload,
} from "@tabler/icons-react";
import { toast } from "sonner";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Parse imports from code and extract import names and paths
 */
function parseImports(code: string): Array<{ names: string[]; defaultName?: string; path: string }> {
  const imports: Array<{ names: string[]; defaultName?: string; path: string }> = [];
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
function resolveRelativePath(importPath: string, currentFilePath: string): string {
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
function resolveFile(importPath: string, files: ComponentFile[], currentFilePath?: string): ComponentFile | null {
  const resolvedPath = currentFilePath
    ? resolveRelativePath(importPath, currentFilePath)
    : importPath.replace(/^\.\.?\//, "").replace(/^@\//, "");

  let file = files.find((f) => f.path === resolvedPath);
  if (file) return file;

  for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
    file = files.find((f) => f.path === resolvedPath + ext);
    if (file) return file;
  }

  file = files.find((f) =>
    f.path === `${resolvedPath}/index.ts` ||
    f.path === `${resolvedPath}/index.tsx`
  );
  if (file) return file;

  return null;
}

/**
 * Get all files from a folder
 */
function getFilesFromFolder(folderName: string, files: ComponentFile[]): ComponentFile[] {
  const folder = folderName.replace(/^\.\.?\//, "").replace(/^@\//, "");
  return files.filter((f) => f.path.startsWith(folder + "/"));
}

/**
 * Collect all component files that need to be bundled (main + dependencies)
 */
function collectAllFiles(
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

/**
 * Transform CSS for iframe preview
 */
function transformCss(rawCss: string): string {
  return rawCss
    // Remove @import statements
    .replace(/@import\s+["'][^"']+["'];?\s*/g, "")
    // Remove @custom-variant (handled by CDN config)
    .replace(/@custom-variant[^;]+;?\s*/g, "")
    // Remove @theme blocks (we'll define theme in iframe)
    .replace(/@theme\s+inline\s*\{[\s\S]*?\n\}/g, "");
}

/**
 * Extract component name from code
 */
function getComponentName(code: string): string {
  // Look for export default function ComponentName
  const defaultFuncMatch = code.match(/export\s+default\s+function\s+(\w+)/);
  if (defaultFuncMatch) return defaultFuncMatch[1];

  // Look for function ComponentName followed by export default
  const funcMatch = code.match(/function\s+(\w+)\s*\(/);
  if (funcMatch) return funcMatch[1];

  // Look for const ComponentName =
  const constMatch = code.match(/(?:export\s+)?const\s+(\w+)\s*=/);
  if (constMatch) return constMatch[1];

  return "Component";
}

/**
 * Generate the iframe HTML document
 */
function generateIframeHtml(
  files: Map<string, ComponentFile>,
  mainFilePath: string,
  cssContent: string,
  theme: string
): string {
  // Build the component code by combining all files
  const fileContents: string[] = [];
  const mainFile = files.get(mainFilePath);

  if (!mainFile) return "";

  // Process files in dependency order (main file last)
  const processedPaths = new Set<string>();

  function processFile(path: string) {
    if (processedPaths.has(path)) return;
    const file = files.get(path);
    if (!file) return;

    // Process dependencies first
    const imports = parseImports(file.content);
    for (const imp of imports) {
      if (imp.path === "react" || !imp.path.startsWith(".") && !imp.path.startsWith("@/")) continue;
      const depFile = resolveFile(imp.path, Array.from(files.values()), path);
      if (depFile && files.has(depFile.path)) {
        processFile(depFile.path);
      }
    }

    processedPaths.add(path);

    // Transform the code
    let code = file.content;

    // Remove "use client" directive
    code = code.replace(/["']use client["'];?/g, "");

    // Remove all import statements (handles single line imports)
    // Process line by line for better control
    const lines = code.split('\n');
    const filteredLines: string[] = [];
    let inMultilineImport = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Check if we're starting a multiline import
      if (trimmed.startsWith('import ') && !trimmed.includes(' from ')) {
        inMultilineImport = true;
        continue;
      }

      // Check if we're ending a multiline import
      if (inMultilineImport) {
        if (trimmed.includes(' from ')) {
          inMultilineImport = false;
        }
        continue;
      }

      // Skip single-line imports
      if (trimmed.startsWith('import ')) {
        continue;
      }

      filteredLines.push(line);
    }

    code = filteredLines.join('\n');

    // Remove export keywords
    code = code.replace(/export\s+default\s+/g, "");
    code = code.replace(/export\s+/g, "");

    // Strip TypeScript syntax (Babel react preset doesn't handle TS)
    // Remove type annotations after colons (: Type)
    code = code.replace(/:\s*[A-Z][a-zA-Z0-9<>,\s\[\]|&]*(?=\s*[=,\)\}\]])/g, "");
    // Remove generic type parameters on function calls like useRef<Type>(
    code = code.replace(/(<[A-Z][a-zA-Z0-9<>,\s\[\]|&]*>)(\s*\()/g, "$2");
    // Remove type assertions (as Type)
    code = code.replace(/\s+as\s+[A-Z][a-zA-Z0-9<>,\s\[\]|&]*/g, "");
    // Remove interface and type declarations
    code = code.replace(/^(interface|type)\s+\w+[\s\S]*?(?=\n\n|\nexport|\nfunction|\nconst|\nclass)/gm, "");
    // Remove generic type parameters on function declarations
    code = code.replace(/function\s+(\w+)\s*<[^>]+>/g, "function $1");
    // Remove React.FC and similar type annotations
    code = code.replace(/:\s*React\.\w+<[^>]*>/g, "");
    // Remove standalone type imports that might have been missed
    code = code.replace(/^type\s+\{[^}]+\}\s*=.*$/gm, "");

    fileContents.push(`// File: ${path}\n${code}`);
  }

  // Process all files
  for (const path of files.keys()) {
    if (path !== mainFilePath) {
      processFile(path);
    }
  }
  // Main file last
  processFile(mainFilePath);

  const componentName = getComponentName(mainFile.content);
  const combinedCode = fileContents.join("\n\n");

  return `<!DOCTYPE html>
<html lang="en" class="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style type="text/tailwindcss">
    @custom-variant dark (&:is(.dark *));
    @theme inline {
      --color-background: var(--background);
      --color-foreground: var(--foreground);
      --color-card: var(--card);
      --color-card-foreground: var(--card-foreground);
      --color-popover: var(--popover);
      --color-popover-foreground: var(--popover-foreground);
      --color-primary: var(--primary);
      --color-primary-foreground: var(--primary-foreground);
      --color-secondary: var(--secondary);
      --color-secondary-foreground: var(--secondary-foreground);
      --color-muted: var(--muted);
      --color-muted-foreground: var(--muted-foreground);
      --color-accent: var(--accent);
      --color-accent-foreground: var(--accent-foreground);
      --color-destructive: var(--destructive);
      --color-border: var(--border);
      --color-input: var(--input);
      --color-ring: var(--ring);
      --color-chart-1: var(--chart-1);
      --color-chart-2: var(--chart-2);
      --color-chart-3: var(--chart-3);
      --color-chart-4: var(--chart-4);
      --color-chart-5: var(--chart-5);
      --color-sidebar: var(--sidebar);
      --color-sidebar-foreground: var(--sidebar-foreground);
      --color-sidebar-primary: var(--sidebar-primary);
      --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
      --color-sidebar-accent: var(--sidebar-accent);
      --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
      --color-sidebar-border: var(--sidebar-border);
      --color-sidebar-ring: var(--sidebar-ring);
      --radius-sm: calc(var(--radius) - 4px);
      --radius-md: calc(var(--radius) - 2px);
      --radius-lg: var(--radius);
      --radius-xl: calc(var(--radius) + 4px);
    }

    /* shadcn default theme - light mode */
    :root {
      --background: oklch(1 0 0);
      --foreground: oklch(0.145 0 0);
      --card: oklch(1 0 0);
      --card-foreground: oklch(0.145 0 0);
      --popover: oklch(1 0 0);
      --popover-foreground: oklch(0.145 0 0);
      --primary: oklch(0.205 0 0);
      --primary-foreground: oklch(0.985 0 0);
      --secondary: oklch(0.97 0 0);
      --secondary-foreground: oklch(0.205 0 0);
      --muted: oklch(0.97 0 0);
      --muted-foreground: oklch(0.556 0 0);
      --accent: oklch(0.205 0 0);
      --accent-foreground: oklch(0.985 0 0);
      --destructive: oklch(0.58 0.22 27);
      --border: oklch(0.922 0 0);
      --input: oklch(0.922 0 0);
      --ring: oklch(0.708 0 0);
      --chart-1: oklch(0.809 0.105 251.813);
      --chart-2: oklch(0.623 0.214 259.815);
      --chart-3: oklch(0.546 0.245 262.881);
      --chart-4: oklch(0.488 0.243 264.376);
      --chart-5: oklch(0.424 0.199 265.638);
      --radius: 0.625rem;
      --sidebar: oklch(0.985 0 0);
      --sidebar-foreground: oklch(0.145 0 0);
      --sidebar-primary: oklch(0.205 0 0);
      --sidebar-primary-foreground: oklch(0.985 0 0);
      --sidebar-accent: oklch(0.205 0 0);
      --sidebar-accent-foreground: oklch(0.985 0 0);
      --sidebar-border: oklch(0.922 0 0);
      --sidebar-ring: oklch(0.708 0 0);
    }

    /* shadcn default theme - dark mode */
    .dark {
      --background: oklch(0.145 0 0);
      --foreground: oklch(0.985 0 0);
      --card: oklch(0.205 0 0);
      --card-foreground: oklch(0.985 0 0);
      --popover: oklch(0.205 0 0);
      --popover-foreground: oklch(0.985 0 0);
      --primary: oklch(0.87 0 0);
      --primary-foreground: oklch(0.205 0 0);
      --secondary: oklch(0.269 0 0);
      --secondary-foreground: oklch(0.985 0 0);
      --muted: oklch(0.269 0 0);
      --muted-foreground: oklch(0.708 0 0);
      --accent: oklch(0.87 0 0);
      --accent-foreground: oklch(0.205 0 0);
      --destructive: oklch(0.704 0.191 22.216);
      --border: oklch(1 0 0 / 10%);
      --input: oklch(1 0 0 / 15%);
      --ring: oklch(0.556 0 0);
      --chart-1: oklch(0.809 0.105 251.813);
      --chart-2: oklch(0.623 0.214 259.815);
      --chart-3: oklch(0.546 0.245 262.881);
      --chart-4: oklch(0.488 0.243 264.376);
      --chart-5: oklch(0.424 0.199 265.638);
      --sidebar: oklch(0.205 0 0);
      --sidebar-foreground: oklch(0.985 0 0);
      --sidebar-primary: oklch(0.488 0.243 264.376);
      --sidebar-primary-foreground: oklch(0.985 0 0);
      --sidebar-accent: oklch(0.87 0 0);
      --sidebar-accent-foreground: oklch(0.205 0 0);
      --sidebar-border: oklch(1 0 0 / 10%);
      --sidebar-ring: oklch(0.556 0 0);
    }

    @layer base {
      * {
        @apply border-border outline-ring/50;
      }
      body {
        @apply bg-background text-foreground;
      }
    }
  </style>
  <style type="text/tailwindcss">
${cssContent}
  </style>
  <style>
    /* Base body styles - colors come from user CSS or theme */
    body {
      margin: 0;
      padding: 16px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .error-display {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      padding: 16px;
      color: rgb(239, 68, 68);
      font-family: monospace;
      font-size: 14px;
      white-space: pre-wrap;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div id="root">Loading preview...</div>
  <script>
    // Global error handler to catch Babel compilation errors
    window.onerror = function(msg, url, line, col, error) {
      document.getElementById('root').innerHTML =
        '<div class="error-display"><strong>Script Error:</strong>\\n' +
        (error?.message || msg) + '</div>';
      // Notify parent window of error
      window.parent.postMessage({ type: 'preview-error', error: error?.message || msg }, '*');
      return true;
    };
  </script>
  <script type="text/babel" data-presets="react">
    console.log('Babel script starting...');

    // Provide React hooks and utilities globally
    const { useState, useEffect, useRef, useCallback, useContext, useReducer, useMemo,
            useLayoutEffect, useImperativeHandle, useDebugValue, useDeferredValue,
            useTransition, useSyncExternalStore, useInsertionEffect, forwardRef,
            createContext, Children, cloneElement, isValidElement, Fragment, memo,
            lazy, Suspense, createElement } = React;

    // cn utility (clsx + tailwind-merge simplified)
    function cn(...inputs) {
      return inputs.filter(Boolean).join(' ');
    }

    // cva stub (simplified)
    function cva(base, config) {
      return (props) => {
        let classes = base || '';
        if (config?.variants && props) {
          for (const [key, value] of Object.entries(props)) {
            if (config.variants[key]?.[value]) {
              classes += ' ' + config.variants[key][value];
            }
          }
        }
        if (config?.defaultVariants) {
          for (const [key, value] of Object.entries(config.defaultVariants)) {
            if (!props?.[key] && config.variants?.[key]?.[value]) {
              classes += ' ' + config.variants[key][value];
            }
          }
        }
        return classes;
      };
    }

    // Slot component (simplified) - only pass ref to elements that support it
    const Slot = forwardRef(({ children, ...props }, ref) => {
      if (React.isValidElement(children)) {
        // Only pass ref if the child is a DOM element or forwardRef component
        const childType = children.type;
        const isForwardRef = childType?.$$typeof === Symbol.for('react.forward_ref');
        const isIntrinsic = typeof childType === 'string';
        const childProps = isForwardRef || isIntrinsic ? { ...props, ref } : props;
        return React.cloneElement(children, childProps);
      }
      return <span {...props} ref={ref}>{children}</span>;
    });

    // Base UI utilities
    function mergeProps(...propsList) {
      return propsList.reduce((acc, props) => ({ ...acc, ...props }), {});
    }

    function useRender() {
      return { renderElement: (props) => createElement('span', props) };
    }

    // Base UI primitive stubs - these are simplified implementations
    // that provide the basic structure for preview purposes

    const ButtonPrimitive = forwardRef(({ render, disabled, ...props }, ref) => {
      const Component = render ? 'span' : 'button';
      return <Component ref={ref} disabled={disabled} {...props} />;
    });
    ButtonPrimitive.Props = {};

    const InputPrimitive = forwardRef((props, ref) => <input ref={ref} {...props} />);
    InputPrimitive.Props = {};

    const SeparatorPrimitive = forwardRef(({ orientation = 'horizontal', ...props }, ref) => (
      <div ref={ref} role="separator" aria-orientation={orientation} {...props} />
    ));
    SeparatorPrimitive.Props = {};

    // Tabs primitive
    const TabsPrimitive = {
      Root: forwardRef((props, ref) => <div ref={ref} {...props} />),
      List: forwardRef((props, ref) => <div ref={ref} role="tablist" {...props} />),
      Tab: forwardRef(({ value, ...props }, ref) => <button ref={ref} role="tab" {...props} />),
      Panel: forwardRef(({ value, ...props }, ref) => <div ref={ref} role="tabpanel" {...props} />),
      Indicator: forwardRef((props, ref) => <span ref={ref} {...props} />),
    };

    // Dialog/Sheet primitive
    const DialogPrimitive = {
      Root: ({ children, open, onOpenChange, ...props }) => open ? <>{children}</> : null,
      Trigger: forwardRef((props, ref) => <button ref={ref} {...props} />),
      Portal: ({ children }) => <>{children}</>,
      Backdrop: forwardRef((props, ref) => <div ref={ref} {...props} />),
      Popup: forwardRef((props, ref) => <div ref={ref} role="dialog" {...props} />),
      Title: forwardRef((props, ref) => <h2 ref={ref} {...props} />),
      Description: forwardRef((props, ref) => <p ref={ref} {...props} />),
      Close: forwardRef((props, ref) => <button ref={ref} {...props} />),
    };
    const SheetPrimitive = DialogPrimitive;

    // Tooltip primitive
    const TooltipPrimitive = {
      Provider: ({ children }) => <>{children}</>,
      Root: ({ children }) => <>{children}</>,
      Trigger: forwardRef((props, ref) => <span ref={ref} {...props} />),
      Portal: ({ children }) => <>{children}</>,
      Positioner: forwardRef((props, ref) => <div ref={ref} {...props} />),
      Popup: forwardRef((props, ref) => <div ref={ref} role="tooltip" {...props} />),
      Arrow: forwardRef((props, ref) => <div ref={ref} {...props} />),
    };

    // Select primitive
    const SelectPrimitive = {
      Root: ({ children, value, onValueChange, ...props }) => <div {...props}>{children}</div>,
      Trigger: forwardRef((props, ref) => <button ref={ref} {...props} />),
      Value: forwardRef((props, ref) => <span ref={ref} {...props} />),
      Icon: forwardRef((props, ref) => <span ref={ref} {...props} />),
      Portal: ({ children }) => <>{children}</>,
      Backdrop: forwardRef((props, ref) => <div ref={ref} {...props} />),
      Positioner: forwardRef((props, ref) => <div ref={ref} {...props} />),
      Popup: forwardRef((props, ref) => <div ref={ref} {...props} />),
      Arrow: forwardRef((props, ref) => <div ref={ref} {...props} />),
      Item: forwardRef(({ value, ...props }, ref) => <div ref={ref} role="option" {...props} />),
      ItemText: forwardRef((props, ref) => <span ref={ref} {...props} />),
      ItemIndicator: forwardRef((props, ref) => <span ref={ref} {...props} />),
      Group: forwardRef((props, ref) => <div ref={ref} role="group" {...props} />),
      GroupLabel: forwardRef((props, ref) => <span ref={ref} {...props} />),
      Separator: forwardRef((props, ref) => <hr ref={ref} {...props} />),
      ScrollUpArrow: forwardRef((props, ref) => <div ref={ref} {...props} />),
      ScrollDownArrow: forwardRef((props, ref) => <div ref={ref} {...props} />),
    };

    // Menu/DropdownMenu primitive
    const MenuPrimitive = {
      Root: ({ children }) => <>{children}</>,
      Trigger: forwardRef((props, ref) => <button ref={ref} {...props} />),
      Portal: ({ children }) => <>{children}</>,
      Backdrop: forwardRef((props, ref) => <div ref={ref} {...props} />),
      Positioner: forwardRef((props, ref) => <div ref={ref} {...props} />),
      Popup: forwardRef((props, ref) => <div ref={ref} role="menu" {...props} />),
      Arrow: forwardRef((props, ref) => <div ref={ref} {...props} />),
      Item: forwardRef((props, ref) => <div ref={ref} role="menuitem" {...props} />),
      Group: forwardRef((props, ref) => <div ref={ref} role="group" {...props} />),
      GroupLabel: forwardRef((props, ref) => <span ref={ref} {...props} />),
      CheckboxItem: forwardRef(({ checked, onCheckedChange, ...props }, ref) => (
        <div ref={ref} role="menuitemcheckbox" aria-checked={checked} {...props} />
      )),
      RadioGroup: forwardRef((props, ref) => <div ref={ref} role="group" {...props} />),
      RadioItem: forwardRef(({ value, ...props }, ref) => (
        <div ref={ref} role="menuitemradio" {...props} />
      )),
      ItemIndicator: forwardRef((props, ref) => <span ref={ref} {...props} />),
      Separator: forwardRef((props, ref) => <hr ref={ref} role="separator" {...props} />),
      SubmenuTrigger: forwardRef((props, ref) => <div ref={ref} {...props} />),
    };

    // ScrollArea primitive
    const ScrollAreaPrimitive = {
      Root: forwardRef((props, ref) => <div ref={ref} {...props} style={{ overflow: 'auto', ...props.style }} />),
      Viewport: forwardRef((props, ref) => <div ref={ref} {...props} />),
      Scrollbar: forwardRef(({ orientation, ...props }, ref) => <div ref={ref} {...props} />),
      Thumb: forwardRef((props, ref) => <div ref={ref} {...props} />),
      Corner: forwardRef((props, ref) => <div ref={ref} {...props} />),
    };

    // Avatar primitive
    const AvatarPrimitive = {
      Root: forwardRef((props, ref) => <span ref={ref} {...props} />),
      Image: forwardRef((props, ref) => <img ref={ref} {...props} />),
      Fallback: forwardRef((props, ref) => <span ref={ref} {...props} />),
    };

    // Error boundary component
    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }
      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }
      componentDidCatch(error, errorInfo) {
        console.error('Preview error:', error, errorInfo);
        // Notify parent window of error
        window.parent.postMessage({ type: 'preview-error', error: error?.message || 'Unknown error' }, '*');
      }
      render() {
        if (this.state.hasError) {
          return (
            <div className="error-display">
              <strong>Error:</strong>\\n{this.state.error?.message || 'Unknown error'}
            </div>
          );
        }
        return this.props.children;
      }
    }

    try {
      console.log('Defining user components...');

      // User component code
${combinedCode.split('\n').map(line => '      ' + line).join('\n')}

      console.log('User components defined, rendering ${componentName}...');
      console.log('Component exists:', typeof ${componentName});

      // Render the component
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(
        <ErrorBoundary>
          <${componentName} />
        </ErrorBoundary>
      );
      console.log('Render called successfully');
      // Notify parent of successful render
      window.parent.postMessage({ type: 'preview-success' }, '*');
    } catch (error) {
      document.getElementById('root').innerHTML =
        '<div class="error-display"><strong>Compilation Error:</strong>\\n' +
        error.message.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
      console.error('Compilation error:', error);
      // Notify parent window of error
      window.parent.postMessage({ type: 'preview-error', error: error.message }, '*');
    }

    // Listen for theme changes from parent
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'theme-change') {
        document.documentElement.className = event.data.theme;
      }
    });
  </script>
</body>
</html>`;
}

// Info content for the tooltip
const PREVIEW_INFO = `Live Preview works with:
• React, Tailwind, shadcn/ui

Won't work with:
• External npm packages (framer-motion, etc.)
• API calls or data fetching`;

export function PreviewPanel() {
  const files = useEditorStore((state) => state.files);
  const previewFileId = useEditorStore((state) => state.previewFileId);
  const previewEnabled = useEditorStore((state) => state.previewEnabled);
  const previewMediaUrl = useEditorStore((state) => state.previewMediaUrl);
  const previewMediaType = useEditorStore((state) => state.previewMediaType);
  const pendingMediaLocalUrl = useEditorStore((state) => state.pendingMediaLocalUrl);
  const setPreviewEnabled = useEditorStore((state) => state.setPreviewEnabled);
  const setPendingMedia = useEditorStore((state) => state.setPendingMedia);
  const setPreviewMedia = useEditorStore((state) => state.setPreviewMedia);

  const { resolvedTheme } = useTheme();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showWarningDetails, setShowWarningDetails] = useState(false);

  // The display URL is either the pending local blob or the saved R2 URL
  const displayMediaUrl = pendingMediaLocalUrl || previewMediaUrl;

  // Process and add a media file
  const handleMediaFile = useCallback(
    async (file: File) => {
      // Validate file type and size
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error("Invalid file", { description: validation.error });
        return;
      }

      // Convert images to WebP
      if (isImageType(file.type)) {
        try {
          const { file: processedFile, wasConverted } = await processImageFile(file);
          setPendingMedia(processedFile);
          toast.success("Image added", {
            description: wasConverted
              ? "Converted to WebP. Will upload on save."
              : "Will upload on save.",
          });
        } catch (error) {
          toast.error("Failed to process image", {
            description: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } else {
        setPendingMedia(file);
        toast.success("Video added", { description: "Will upload on save." });
      }
    },
    [setPendingMedia]
  );

  // Dropzone setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) handleMediaFile(file);
    },
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/avif": [".avif"],
      "video/mp4": [".mp4"],
      "video/webm": [".webm"],
      "video/quicktime": [".mov"],
    },
    maxFiles: 1,
    multiple: false,
  });

  // Analyze imports for warnings
  const importAnalysis = useMemo(() => {
    return analyzeMultipleFiles(files);
  }, [files]);

  // Get the preview file (selected by user or first .tsx file)
  const mainFile = useMemo(() => {
    if (previewFileId) {
      const file = files.find((f) => f.id === previewFileId);
      if (file?.path.endsWith(".tsx")) return file;
    }
    return files.find((f) => f.path.endsWith(".tsx"));
  }, [files, previewFileId]);

  // Collect all CSS from style files
  const cssContent = useMemo(() => {
    const rawCss = files
      .filter((f) => f.type === "style" || f.path.endsWith(".css"))
      .map((f) => f.content)
      .join("\n\n");
    return transformCss(rawCss);
  }, [files]);

  // Collect all component files
  const componentFiles = useMemo(() => {
    if (!mainFile) return new Map<string, ComponentFile>();
    return collectAllFiles(mainFile, files);
  }, [mainFile, files]);

  // Generate iframe HTML
  const iframeHtml = useMemo(() => {
    if (!mainFile) return "";
    return generateIframeHtml(
      componentFiles,
      mainFile.path,
      cssContent,
      resolvedTheme || "light"
    );
  }, [mainFile, componentFiles, cssContent, resolvedTheme]);

  // Debounce the iframe content to avoid too many re-renders while typing
  const debouncedHtml = useDebounce(iframeHtml, 300);

  // Generate a hash of the content to use as iframe key
  const iframeKey = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < debouncedHtml.length; i++) {
      const char = debouncedHtml.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }, [debouncedHtml]);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "preview-error") {
        setPreviewError(event.data.error);
      } else if (event.data?.type === "preview-success") {
        setPreviewError(null);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Sync theme changes to iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "theme-change", theme: resolvedTheme || "light" },
        "*"
      );
    }
  }, [resolvedTheme]);

  const handleRemoveMedia = useCallback(() => {
    // Clear both pending and saved media
    setPendingMedia(null);
    setPreviewMedia(null, null);
  }, [setPendingMedia, setPreviewMedia]);

  if (!mainFile) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No component file to preview
      </div>
    );
  }

  // Animated switch - simple "Live Preview" toggle
  const PreviewSwitch = (
    <motion.div
      layoutId="preview-switch"
      className="flex items-center gap-2"
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <Switch
        checked={previewEnabled}
        onCheckedChange={setPreviewEnabled}
      />
      <span className="text-sm text-muted-foreground">Live Preview</span>
    </motion.div>
  );

  return (
    <LayoutGroup>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Preview</span>
            <Tooltip>
              <TooltipTrigger className="text-muted-foreground/70 hover:text-muted-foreground">
                <IconInfoCircle className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs whitespace-pre-line">
                {PREVIEW_INFO}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground/70">
              {mainFile.path.split("/").pop()}
            </span>
            {/* Switch in header when preview is ON */}
            {previewEnabled && PreviewSwitch}
          </div>
        </div>

      {/* Warning banner for unsupported imports */}
      {importAnalysis.hasUnsupported && previewEnabled && (
        <div className="border-b bg-amber-500/10 px-3 py-2">
          <button
            onClick={() => setShowWarningDetails(!showWarningDetails)}
            className="flex w-full items-center gap-2 text-left text-xs text-amber-600 dark:text-amber-400"
          >
            <IconAlertTriangle className="size-3.5 shrink-0" />
            <span>
              {importAnalysis.unsupported.length} unsupported import
              {importAnalysis.unsupported.length > 1 ? "s" : ""} detected
            </span>
          </button>
          {showWarningDetails && (
            <div className="mt-2 space-y-1 pl-5 text-xs text-muted-foreground">
              {importAnalysis.unsupported.map((imp) => (
                <div key={imp} className="font-mono">
                  {imp}
                </div>
              ))}
              <p className="pt-1 text-amber-600/80 dark:text-amber-400/80">
                These packages won&apos;t render in live preview.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Preview content */}
      <div className="relative flex-1 overflow-hidden">
        {previewEnabled ? (
          // Live preview mode
          <>
            {previewError ? (
              // Error state with switch
              <div className="flex h-full flex-col items-center justify-center gap-6 p-6">
                <div className="w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                  <div className="flex items-start gap-2 text-sm text-destructive">
                    <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">Preview Error</p>
                      <p className="mt-1 wrap-break-word font-mono text-xs opacity-80">
                        {previewError}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Switch to disable - but it's in header when preview is ON */}
              </div>
            ) : (
              // Live iframe
              <iframe
                ref={iframeRef}
                key={iframeKey}
                srcDoc={debouncedHtml}
                className="h-full w-full border-0"
                sandbox="allow-scripts"
                title="Component Preview"
              />
            )}
          </>
        ) : (
          // Disabled mode - show switch + or + upload
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
            {displayMediaUrl ? (
              // Show media with switch above
              <>
                {PreviewSwitch}

                {/* Media */}
                <div className="relative w-full max-w-lg">
                  {previewMediaType === "video" ? (
                    <video
                      src={displayMediaUrl}
                      controls
                      className="w-full rounded-lg border"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayMediaUrl}
                      alt="Component preview"
                      className="w-full rounded-lg border"
                    />
                  )}
                  <button
                    onClick={handleRemoveMedia}
                    className="absolute -right-2 -top-2 rounded-full bg-background p-1 shadow-md hover:bg-muted"
                    title="Remove media"
                  >
                    <IconX className="size-4" />
                  </button>
                </div>
                {/* Show pending indicator */}
                {pendingMediaLocalUrl && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Will upload when you save
                  </p>
                )}
              </>
            ) : (
              // No media - show switch + dropzone
              <div className="flex h-full flex-col items-center justify-center gap-6 p-6">
                {/* Title */}
                <p className="max-w-[280px] text-center text-xs text-muted-foreground">
                  Live preview works with React + Tailwind.
                  External npm packages won&apos;t render.
                </p>

                {/* Switch centered */}
                {PreviewSwitch}

                {/* Separator */}
                <div className="flex w-full max-w-xs items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or upload</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  className={`
                    flex w-full max-w-xs cursor-pointer flex-col items-center justify-center
                    rounded-lg border-2 border-dashed p-5 transition-colors
                    ${isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50"
                    }
                  `}
                >
                  <input {...getInputProps()} />
                  <IconUpload className={`mb-3 size-6 ${isDragActive ? "text-primary" : "text-muted-foreground/50"}`} />
                  <p className="text-sm text-foreground">
                    {isDragActive ? "Drop to upload" : "Drop image or video"}
                  </p>
                  <div className="mt-2 space-y-0.5 text-center text-[11px] text-muted-foreground">
                    <p>Images: JPG, PNG, WebP, AVIF (max 5 MB)</p>
                    <p>Videos: MP4, WebM, MOV (max 20 MB)</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </LayoutGroup>
  );
}
