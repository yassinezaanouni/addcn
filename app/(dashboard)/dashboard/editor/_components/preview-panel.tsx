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
  forwardRef,
  createContext,
  Children,
  cloneElement,
  isValidElement,
  Fragment,
  memo,
  lazy,
  Suspense,
} from "react";
import { LiveProvider, LivePreview, LiveError } from "react-live";
import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
// Base UI (all-in-one package)
import * as BaseUI from "@base-ui/react";
// Radix UI (separate packages per component)
import * as RadixSlot from "@radix-ui/react-slot";
import * as RadixDialog from "@radix-ui/react-dialog";
import * as RadixDropdownMenu from "@radix-ui/react-dropdown-menu";
import * as RadixTabs from "@radix-ui/react-tabs";
import * as RadixPopover from "@radix-ui/react-popover";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import * as RadixSelect from "@radix-ui/react-select";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import * as RadixRadioGroup from "@radix-ui/react-radio-group";
import * as RadixSwitch from "@radix-ui/react-switch";
import * as RadixLabel from "@radix-ui/react-label";
import * as RadixSeparator from "@radix-ui/react-separator";
import * as RadixAvatar from "@radix-ui/react-avatar";
import * as RadixAccordion from "@radix-ui/react-accordion";
import * as RadixAlertDialog from "@radix-ui/react-alert-dialog";
import * as RadixAspectRatio from "@radix-ui/react-aspect-ratio";
import * as RadixCollapsible from "@radix-ui/react-collapsible";
import * as RadixContextMenu from "@radix-ui/react-context-menu";
import * as RadixHoverCard from "@radix-ui/react-hover-card";
import * as RadixMenubar from "@radix-ui/react-menubar";
import * as RadixNavigationMenu from "@radix-ui/react-navigation-menu";
import * as RadixProgress from "@radix-ui/react-progress";
import * as RadixScrollArea from "@radix-ui/react-scroll-area";
import * as RadixSlider from "@radix-ui/react-slider";
import * as RadixToggle from "@radix-ui/react-toggle";
import * as RadixToggleGroup from "@radix-ui/react-toggle-group";
import { useEditorStore } from "@/stores/editor-store";
import type { ComponentFile } from "@/types/component";

// Combine all Radix UI exports into a single object
const RadixUI = {
  // Slot
  Slot: RadixSlot.Slot,
  // Dialog
  Dialog: RadixDialog.Root,
  DialogTrigger: RadixDialog.Trigger,
  DialogPortal: RadixDialog.Portal,
  DialogOverlay: RadixDialog.Overlay,
  DialogContent: RadixDialog.Content,
  DialogTitle: RadixDialog.Title,
  DialogDescription: RadixDialog.Description,
  DialogClose: RadixDialog.Close,
  // DropdownMenu
  DropdownMenu: RadixDropdownMenu.Root,
  DropdownMenuTrigger: RadixDropdownMenu.Trigger,
  DropdownMenuContent: RadixDropdownMenu.Content,
  DropdownMenuItem: RadixDropdownMenu.Item,
  DropdownMenuCheckboxItem: RadixDropdownMenu.CheckboxItem,
  DropdownMenuRadioItem: RadixDropdownMenu.RadioItem,
  DropdownMenuLabel: RadixDropdownMenu.Label,
  DropdownMenuSeparator: RadixDropdownMenu.Separator,
  DropdownMenuGroup: RadixDropdownMenu.Group,
  DropdownMenuPortal: RadixDropdownMenu.Portal,
  DropdownMenuSub: RadixDropdownMenu.Sub,
  DropdownMenuSubContent: RadixDropdownMenu.SubContent,
  DropdownMenuSubTrigger: RadixDropdownMenu.SubTrigger,
  DropdownMenuRadioGroup: RadixDropdownMenu.RadioGroup,
  // Tabs
  Tabs: RadixTabs.Root,
  TabsList: RadixTabs.List,
  TabsTrigger: RadixTabs.Trigger,
  TabsContent: RadixTabs.Content,
  // Popover
  Popover: RadixPopover.Root,
  PopoverTrigger: RadixPopover.Trigger,
  PopoverContent: RadixPopover.Content,
  PopoverAnchor: RadixPopover.Anchor,
  PopoverPortal: RadixPopover.Portal,
  // Tooltip
  Tooltip: RadixTooltip.Root,
  TooltipTrigger: RadixTooltip.Trigger,
  TooltipContent: RadixTooltip.Content,
  TooltipProvider: RadixTooltip.Provider,
  TooltipPortal: RadixTooltip.Portal,
  // Select
  Select: RadixSelect.Root,
  SelectTrigger: RadixSelect.Trigger,
  SelectValue: RadixSelect.Value,
  SelectContent: RadixSelect.Content,
  SelectItem: RadixSelect.Item,
  SelectItemText: RadixSelect.ItemText,
  SelectItemIndicator: RadixSelect.ItemIndicator,
  SelectGroup: RadixSelect.Group,
  SelectLabel: RadixSelect.Label,
  SelectSeparator: RadixSelect.Separator,
  SelectPortal: RadixSelect.Portal,
  SelectViewport: RadixSelect.Viewport,
  // Checkbox
  Checkbox: RadixCheckbox.Root,
  CheckboxIndicator: RadixCheckbox.Indicator,
  // RadioGroup
  RadioGroup: RadixRadioGroup.Root,
  RadioGroupItem: RadixRadioGroup.Item,
  RadioGroupIndicator: RadixRadioGroup.Indicator,
  // Switch
  Switch: RadixSwitch.Root,
  SwitchThumb: RadixSwitch.Thumb,
  // Label
  Label: RadixLabel.Root,
  // Separator
  Separator: RadixSeparator.Root,
  // Avatar
  Avatar: RadixAvatar.Root,
  AvatarImage: RadixAvatar.Image,
  AvatarFallback: RadixAvatar.Fallback,
  // Accordion
  Accordion: RadixAccordion.Root,
  AccordionItem: RadixAccordion.Item,
  AccordionTrigger: RadixAccordion.Trigger,
  AccordionContent: RadixAccordion.Content,
  AccordionHeader: RadixAccordion.Header,
  // AlertDialog
  AlertDialog: RadixAlertDialog.Root,
  AlertDialogTrigger: RadixAlertDialog.Trigger,
  AlertDialogPortal: RadixAlertDialog.Portal,
  AlertDialogOverlay: RadixAlertDialog.Overlay,
  AlertDialogContent: RadixAlertDialog.Content,
  AlertDialogTitle: RadixAlertDialog.Title,
  AlertDialogDescription: RadixAlertDialog.Description,
  AlertDialogAction: RadixAlertDialog.Action,
  AlertDialogCancel: RadixAlertDialog.Cancel,
  // AspectRatio
  AspectRatio: RadixAspectRatio.Root,
  // Collapsible
  Collapsible: RadixCollapsible.Root,
  CollapsibleTrigger: RadixCollapsible.Trigger,
  CollapsibleContent: RadixCollapsible.Content,
  // ContextMenu
  ContextMenu: RadixContextMenu.Root,
  ContextMenuTrigger: RadixContextMenu.Trigger,
  ContextMenuContent: RadixContextMenu.Content,
  ContextMenuItem: RadixContextMenu.Item,
  ContextMenuCheckboxItem: RadixContextMenu.CheckboxItem,
  ContextMenuRadioItem: RadixContextMenu.RadioItem,
  ContextMenuLabel: RadixContextMenu.Label,
  ContextMenuSeparator: RadixContextMenu.Separator,
  ContextMenuGroup: RadixContextMenu.Group,
  ContextMenuPortal: RadixContextMenu.Portal,
  ContextMenuSub: RadixContextMenu.Sub,
  ContextMenuSubContent: RadixContextMenu.SubContent,
  ContextMenuSubTrigger: RadixContextMenu.SubTrigger,
  ContextMenuRadioGroup: RadixContextMenu.RadioGroup,
  // HoverCard
  HoverCard: RadixHoverCard.Root,
  HoverCardTrigger: RadixHoverCard.Trigger,
  HoverCardContent: RadixHoverCard.Content,
  HoverCardPortal: RadixHoverCard.Portal,
  // Menubar
  Menubar: RadixMenubar.Root,
  MenubarMenu: RadixMenubar.Menu,
  MenubarTrigger: RadixMenubar.Trigger,
  MenubarContent: RadixMenubar.Content,
  MenubarItem: RadixMenubar.Item,
  MenubarSeparator: RadixMenubar.Separator,
  MenubarLabel: RadixMenubar.Label,
  MenubarCheckboxItem: RadixMenubar.CheckboxItem,
  MenubarRadioGroup: RadixMenubar.RadioGroup,
  MenubarRadioItem: RadixMenubar.RadioItem,
  MenubarPortal: RadixMenubar.Portal,
  MenubarSub: RadixMenubar.Sub,
  MenubarSubContent: RadixMenubar.SubContent,
  MenubarSubTrigger: RadixMenubar.SubTrigger,
  MenubarGroup: RadixMenubar.Group,
  // NavigationMenu
  NavigationMenu: RadixNavigationMenu.Root,
  NavigationMenuList: RadixNavigationMenu.List,
  NavigationMenuItem: RadixNavigationMenu.Item,
  NavigationMenuTrigger: RadixNavigationMenu.Trigger,
  NavigationMenuContent: RadixNavigationMenu.Content,
  NavigationMenuLink: RadixNavigationMenu.Link,
  NavigationMenuIndicator: RadixNavigationMenu.Indicator,
  NavigationMenuViewport: RadixNavigationMenu.Viewport,
  // Progress
  Progress: RadixProgress.Root,
  ProgressIndicator: RadixProgress.Indicator,
  // ScrollArea
  ScrollArea: RadixScrollArea.Root,
  ScrollAreaViewport: RadixScrollArea.Viewport,
  ScrollAreaScrollbar: RadixScrollArea.Scrollbar,
  ScrollAreaThumb: RadixScrollArea.Thumb,
  ScrollAreaCorner: RadixScrollArea.Corner,
  // Slider
  Slider: RadixSlider.Root,
  SliderTrack: RadixSlider.Track,
  SliderRange: RadixSlider.Range,
  SliderThumb: RadixSlider.Thumb,
  // Toggle
  Toggle: RadixToggle.Root,
  // ToggleGroup
  ToggleGroup: RadixToggleGroup.Root,
  ToggleGroupItem: RadixToggleGroup.Item,
};

// Common utility: cn (clsx + tailwind-merge)
function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

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
  forwardRef,
  createContext,
  Children,
  cloneElement,
  isValidElement,
  Fragment,
  memo,
  lazy,
  Suspense,
  // Common shadcn utilities
  cva,
  cn,
  clsx,
  twMerge,
  // All base-ui primitives (Button, Dialog, Menu, Tabs, etc.)
  ...BaseUI,
  // All radix-ui primitives (Dialog, DropdownMenu, Tabs, Slot, etc.)
  ...RadixUI,
  // Common aliases used in shadcn components (e.g., import { Button as ButtonPrimitive })
  ButtonPrimitive: BaseUI.Button,
  DialogPrimitive: RadixDialog,
  DropdownMenuPrimitive: RadixDropdownMenu,
  TabsPrimitive: RadixTabs,
  PopoverPrimitive: RadixPopover,
  TooltipPrimitive: RadixTooltip,
  SelectPrimitive: RadixSelect,
  CheckboxPrimitive: RadixCheckbox,
  RadioGroupPrimitive: RadixRadioGroup,
  SwitchPrimitive: RadixSwitch,
  LabelPrimitive: RadixLabel,
  SeparatorPrimitive: RadixSeparator,
  AvatarPrimitive: RadixAvatar,
  AccordionPrimitive: RadixAccordion,
  AlertDialogPrimitive: RadixAlertDialog,
  CollapsiblePrimitive: RadixCollapsible,
  ContextMenuPrimitive: RadixContextMenu,
  HoverCardPrimitive: RadixHoverCard,
  MenubarPrimitive: RadixMenubar,
  NavigationMenuPrimitive: RadixNavigationMenu,
  ProgressPrimitive: RadixProgress,
  ScrollAreaPrimitive: RadixScrollArea,
  SliderPrimitive: RadixSlider,
  TogglePrimitive: RadixToggle,
  ToggleGroupPrimitive: RadixToggleGroup,
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
 * Note: This only works for non-JSX files (hooks, utils, etc.)
 * JSX components should be handled by getInlineableImports
 */
function evaluateFile(file: ComponentFile, scope: Record<string, unknown>): Record<string, unknown> {
  const exports: Record<string, unknown> = {};

  // Skip files with JSX - they can't be evaluated with new Function()
  // They need to be transpiled and will be handled by getInlineableImports
  if (containsJsx(file.content)) {
    console.log(`[Preview] Skipping JSX file ${file.path} - will be inlined instead`);
    return exports;
  }

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
 * Check if code contains JSX (not TypeScript generics)
 * JSX: <Component />, <div className="x">, </div>
 * Not JSX: useRef<T>(), Array<string>, Record<K, V>
 */
function containsJsx(code: string): boolean {
  // Self-closing JSX tags: <Component /> or <div />
  if (/<[A-Za-z][A-Za-z0-9]*[^<]*\/>/.test(code)) return true;

  // JSX closing tags: </Component> or </div>
  if (/<\/[A-Za-z][A-Za-z0-9]*\s*>/.test(code)) return true;

  // JSX tags with attributes: <div className= or <Component prop=
  if (/<[A-Za-z][A-Za-z0-9]*\s+[a-zA-Z][\w-]*=/.test(code)) return true;

  // JSX in return statements: return (<div> or return <div>
  if (/return\s*\(?\s*<[A-Za-z]/.test(code)) return true;

  // Opening JSX tag followed by content/whitespace and closing: <div> or <Component>
  // Exclude generics by checking what comes after >
  // Generics: <T>( or <string>, JSX: <div>\n or <div> text
  if (/<[A-Za-z][A-Za-z0-9]*>\s*[^()>,;]/.test(code)) return true;

  return false;
}

/**
 * Get imported component files that need to be inlined (contain JSX)
 * Handles both default and named imports
 */
function getInlineableImports(
  mainCode: string,
  files: ComponentFile[],
  mainFilePath: string
): Array<{ name: string; code: string }> {
  const inlineable: Array<{ name: string; code: string }> = [];
  const processedFiles = new Set<string>(); // Avoid duplicates
  const imports = parseImports(mainCode);

  for (const imp of imports) {
    if (imp.path === "react") continue;
    if (!imp.path.startsWith(".") && !imp.path.startsWith("@/")) continue;

    const file = resolveFile(imp.path, files, mainFilePath);
    if (!file || !containsJsx(file.content)) continue;
    if (processedFiles.has(file.path)) continue;
    processedFiles.add(file.path);

    // This is a component file with JSX - needs to be inlined
    let code = file.content;
    // Remove imports from the file (we'll handle dependencies separately)
    code = code.replace(/^import\s+.*?;?\s*$/gm, "");

    // Handle default imports
    if (imp.defaultName) {
      const defaultFuncMatch = code.match(/export\s+default\s+function\s+(\w+)/);
      const arrowFuncMatch = code.match(/export\s+default\s+(\w+)/);

      if (defaultFuncMatch) {
        const originalName = defaultFuncMatch[1];
        const importedName = imp.defaultName;
        // Replace function name with the imported name
        code = code.replace(
          /export\s+default\s+function\s+\w+/,
          `function ${importedName}`
        );
        // Also replace any self-references inside the component
        if (originalName !== importedName) {
          code = code.replace(new RegExp(`\\b${originalName}\\b`, "g"), importedName);
        }
      } else if (arrowFuncMatch) {
        const originalName = arrowFuncMatch[1];
        const importedName = imp.defaultName;
        // Remove export default
        code = code.replace(/export\s+default\s+\w+;?/, "");
        // Rename the const/function if different
        if (originalName !== importedName) {
          code = code.replace(new RegExp(`\\b${originalName}\\b`, "g"), importedName);
        }
      }
    }

    // Handle named imports - remove export keyword but keep the functions/consts
    // For named exports like "export function Button" or "export const Button"
    code = code.replace(/export\s+default\s+/g, "");
    code = code.replace(/export\s+/g, "");

    // Strip TypeScript types for evaluation
    code = stripTypeScript(code);

    inlineable.push({ name: imp.defaultName || imp.names[0] || "Component", code });
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

// Debounce hook for delaying CSS processing while typing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Global error handler for Tailwind CDN - attach once at module level
if (typeof window !== "undefined") {
  const suppressTailwindError = (event: PromiseRejectionEvent | ErrorEvent) => {
    const message =
      (event as PromiseRejectionEvent).reason?.message ||
      (event as ErrorEvent).error?.message ||
      String((event as PromiseRejectionEvent).reason || (event as ErrorEvent).error);

    if (message?.includes("Cannot apply unknown utility class")) {
      event.preventDefault();
      console.log("[Preview] Suppressed Tailwind error:", message);
      return;
    }
    console.log("[Preview] Other error:", message);
  };

  window.addEventListener("unhandledrejection", suppressTailwindError as EventListener);
  window.addEventListener("error", suppressTailwindError as EventListener);
  console.log("[Preview] Global error handlers attached at module level");
}

export function PreviewPanel() {
  const files = useEditorStore((state) => state.files);
  const previewFileId = useEditorStore((state) => state.previewFileId);
  const styleId = useId();

  // Load Tailwind v4 browser CDN for dynamic class support in preview
  useEffect(() => {
    const TAILWIND_CDN_ID = "tailwind-cdn-preview";
    const TAILWIND_CONFIG_ID = "tailwind-config-preview";

    // Skip if already loaded
    if (document.getElementById(TAILWIND_CDN_ID)) {
      console.log("[Preview] Tailwind CDN already loaded");
      return;
    }

    // Inject Tailwind config to use class-based dark mode and theme variables
    const configStyle = document.createElement("style");
    configStyle.id = TAILWIND_CONFIG_ID;
    configStyle.setAttribute("type", "text/tailwindcss");
    configStyle.textContent = `
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
        --radius-sm: calc(var(--radius) - 4px);
        --radius-md: calc(var(--radius) - 2px);
        --radius-lg: var(--radius);
        --radius-xl: calc(var(--radius) + 4px);
      }
      @layer base {
        *, *::before, *::after {
          border-color: var(--color-border);
        }
      }
    `;
    document.head.appendChild(configStyle);

    const script = document.createElement("script");
    script.id = TAILWIND_CDN_ID;
    script.src = "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4";
    document.head.appendChild(script);

    console.log("[Preview] Tailwind CDN loaded");
  }, []);

  // Get the preview file (selected by user or first .tsx file)
  const mainFile = useMemo(() => {
    if (previewFileId) {
      const file = files.find((f) => f.id === previewFileId);
      if (file?.path.endsWith(".tsx")) return file;
    }
    // Fallback to first tsx file
    return files.find((f) => f.path.endsWith(".tsx"));
  }, [files, previewFileId]);

  // Collect and transform CSS from style files for preview scope
  const combinedCss = useMemo(() => {
    const rawCss = files
      .filter((f) => f.type === "style" || f.path.endsWith(".css"))
      .map((f) => f.content)
      .join("\n\n");

    // Transform CSS to work within preview scope:
    // 1. Remove Tailwind/shadcn imports (handled by CDN)
    // 2. Replace :root with #preview-scope
    // 3. Replace .dark with #preview-scope.dark
    // 4. Sanitize @apply directives to remove invalid class names
    const transformed = rawCss
      // Remove @import statements
      .replace(/@import\s+["'][^"']+["'];?\s*/g, "")
      // Remove @custom-variant (handled by CDN config)
      .replace(/@custom-variant[^;]+;?\s*/g, "")
      // Remove @theme blocks (handled by CDN config)
      .replace(/@theme\s+inline\s*\{[\s\S]*?\n\}/g, "")
      // Replace :root with #preview-scope
      .replace(/:root\s*\{/g, "#preview-scope {")
      // Replace .dark { with #preview-scope.dark {
      .replace(/^\.dark\s*\{/gm, "#preview-scope.dark {")
      // Handle @layer base - extract and transform its contents
      .replace(/@layer\s+base\s*\{([\s\S]*?)\n\}/g, (_, content) => {
        // Transform selectors inside @layer base to be scoped to preview
        return content
          // * selector -> #preview-scope *
          .replace(/^\s*\*\s*\{/gm, "#preview-scope, #preview-scope *, #preview-scope *::before, #preview-scope *::after {")
          // body selector -> #preview-scope
          .replace(/^\s*body\s*\{/gm, "#preview-scope {");
      })
      // Sanitize @apply directives - remove invalid class names that would crash the CDN
      // Valid Tailwind classes: word chars, hyphens, slashes, brackets, colons, dots, percentages
      // Invalid: empty classes (--), incomplete classes (text-), multiple consecutive hyphens
      .replace(/@apply\s+([^;]+);/g, (match, classes) => {
        const validClasses = classes
          .split(/\s+/)
          .filter((cls: string) => {
            // Skip empty strings
            if (!cls.trim()) return false;
            // Skip if it has consecutive hyphens (like text--400)
            if (/--/.test(cls)) return false;
            // Skip if it ends with a hyphen (incomplete like text-)
            if (/-$/.test(cls)) return false;
            // Skip if it's just a hyphen
            if (cls === "-") return false;
            return true;
          })
          .join(" ");

        // If no valid classes remain, remove the entire @apply
        if (!validClasses.trim()) {
          console.log("[Preview] Removed empty @apply directive");
          return "";
        }
        return `@apply ${validClasses};`;
      });

    return transformed;
  }, [files]);

  // Debounce CSS to avoid crashes from incomplete class names while typing
  const debouncedCss = useDebounce(combinedCss, 500);

  // Generate a simple hash of the CSS content to create unique style IDs
  // This forces the CDN to treat each change as a completely new element
  const cssHash = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < debouncedCss.length; i++) {
      const char = debouncedCss.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    console.log("[Preview] CSS changed, new hash:", hash);
    console.log("[Preview] New CSS (first 200 chars):", debouncedCss.slice(0, 200));
    return hash;
  }, [debouncedCss]);

  const dynamicStyleId = `${styleId}-${cssHash}`;

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
      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">Preview</span>
        {mainFile && (
          <span className="text-xs text-muted-foreground/70">{mainFile.path.split("/").pop()}</span>
        )}
      </div>
      <div className="flex-1 overflow-auto bg-background p-4">
        {/* Inject transformed user CSS for preview - use text/tailwindcss so CDN processes @apply */}
        {/* Key + unique ID forces CDN to treat each change as a completely new element */}
        {debouncedCss && (
          <style
            key={dynamicStyleId}
            id={dynamicStyleId}
            type="text/tailwindcss"
            dangerouslySetInnerHTML={{
              __html: debouncedCss,
            }}
          />
        )}
        <LiveProvider code={transformedCode} scope={scope} noInline>
          <LiveError className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive" />
          <div id="preview-scope">
            <LivePreview />
          </div>
        </LiveProvider>
      </div>
    </div>
  );
}
